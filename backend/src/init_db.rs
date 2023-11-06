use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use serde_json;

use reqwest;
use sqlx::{pool, PgPool};

#[derive(Hash, PartialEq, Eq, Default, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CardDetail {
    pub set: String,
    pub name: String,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Cards {
    pub data: Vec<CardDetail>,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SetDetail {
    pub code: String,
    pub name: String,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Sets {
    pub sets: Vec<SetDetail>,
}

pub async fn get_set_cards(set_id: &str) -> Result<Vec<CardDetail>, anyhow::Error> {
    let mut cards: HashSet<_> = HashSet::new();
    let mut i = 1; // pages start at one
    loop {
        let query = format!(
            "https://api.scryfall.com/cards/search?q=s:{}&page={}",
            set_id, i
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

#[allow(dead_code)]
pub async fn register_supported_sets(pool: &PgPool) -> Result<(), anyhow::Error> {
    let sets = vec![
        "MH2",
        /// Standard
        "MID",
        "VOW",
        "NEO",
        "SNC",
        "DMU",
        "BRO",
    ];

    for s in sets {
        let set_cards = get_set_cards(s).await?;

        println!("{:#?}", set_cards);
        let value_list = set_cards
            .into_iter()
            .map(|x| format!("('{}', '{}')", x.set, x.name.replace("'", "''")))
            .collect::<Vec<String>>()
            .join(",");

        println!("{:#?}", value_list);

        sqlx::query(
            format!(
                "INSERT INTO ratings(set_code, card_name) 
        VALUES {} ON CONFLICT DO NOTHING",
                value_list
            )
            .as_str(),
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}