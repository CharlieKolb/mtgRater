use std::collections::HashSet;

use anyhow::Error;
use serde::{Deserialize, Serialize};
use serde_json; // 0.3.1

use reqwest;
use sqlx::PgPool;

#[derive(Hash, PartialEq, Eq, Default, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct CardDetail {
    pub set: String,
    pub name: String,
    pub collector_number: String,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Cards {
    pub data: Vec<CardDetail>,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub struct SetDetail {
    pub code: String,
    pub name: String,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Sets {
    pub sets: Vec<SetDetail>,
}

pub enum Collection {
    Set(&'static str),
    Draft(&'static str, &'static str),
}

pub async fn get_cards_from_query(scryfall_query: &str) -> Result<Vec<CardDetail>, anyhow::Error> {
    let mut cards: HashSet<_> = HashSet::new();
    let mut i = 1; // pages start at one
    loop {
        let query = format!(
            "https://api.scryfall.com/cards/search?q={}&order=set&unique=cards&page={}",
            scryfall_query, i
        );
        println!("{:#?}", query);
        let card_page =
            serde_json::from_str::<Cards>(reqwest::get(query).await?.text().await?.as_str())?;
        if card_page.data.len() == 0 {
            break;
        }
        cards.extend(card_page.data.into_iter());

        i += 1;
    }

    Ok(cards.into_iter().collect())
}

async fn resolve_collection(draft: &Collection) -> Result<(&'static str, Vec<CardDetail>), Error> {
    Ok(match *draft {
        Collection::Set(set_id) => (
            set_id,
            get_cards_from_query(format!("s:{}", set_id).as_str()).await?,
        ),
        Collection::Draft(name, scryfall_query) => {
            (name, get_cards_from_query(scryfall_query).await?)
        }
    })
}

#[allow(dead_code)]
pub async fn generate_card_queries() -> Result<Vec<String>, anyhow::Error> {
    let sets = [
        Collection::Set("MH2"),
        Collection::Set("MID"),
        Collection::Set("VOW"),
        Collection::Set("NEO"),
        Collection::Set("SNC"),
        Collection::Set("DMU"),
        Collection::Set("BRO"),
        Collection::Draft(
            "draft_otj",
            "set%3Aotp+or+set%3Abig+or+(e%3Aspg+cn≥29+cn≤38)",
        ),
    ];
    let mut card_queries = vec![];
    for collection in sets {
        let (name, cards) = resolve_collection(&collection).await?;

        println!("{:#?}", cards);
        let card_query = cards
            .into_iter()
            .map(|x| {
                format!(
                    "('{}', '{}', '{}')",
                    name.replace("'", "''"),
                    x.set.replace("'", "''"),
                    x.collector_number.replace("'", "''")
                )
            })
            .collect::<Vec<String>>()
            .join(",");

        println!("{:#?}", card_query);
        card_queries.push(card_query);
    }

    Ok(card_queries)
}

#[allow(dead_code)]
pub async fn register_supported_sets(pool: &PgPool) -> Result<(), Error> {
    for query in generate_card_queries().await? {
        sqlx::query(
            format!(
                "INSERT INTO ratings(collection_id, set_id, card_code)
    VALUES {} ON CONFLICT DO NOTHING",
                query
            )
            .as_str(),
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[tokio::test]
    async fn test_generate_card_queries() {
        let _ = generate_card_queries().await;
    }
}
