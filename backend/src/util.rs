use anyhow::Error;
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::{HashMap, HashSet};
use tracing::info;

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Format {
    Set(String),
    Draft(String, String),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
enum FormatJson {
    Set(String),
    Draft((String, String)),
}

pub type FormatItem = (String, Vec<CardDetail>);

#[tracing::instrument]
pub async fn get_cards_from_query(
    scryfall_query: &String,
) -> Result<Vec<CardDetail>, anyhow::Error> {
    let mut cards: HashSet<_> = HashSet::new();
    let mut i = 1; // pages start at one
    loop {
        let query = format!(
            "https://api.scryfall.com/cards/search?q=-is%3Adigital+{}&order=set&unique=cards&page={}",
            scryfall_query, i
        );
        info!(query);
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

pub async fn resolve_format(draft: &Format) -> Result<FormatItem, Error> {
    Ok(match draft {
        Format::Set(set_code) => (
            set_code.clone(),
            get_cards_from_query(&format!("s:{}", set_code)).await?,
        ),
        Format::Draft(name, scryfall_query) => {
            (name.clone(), get_cards_from_query(&scryfall_query).await?)
        }
    })
}

pub fn parse_formats() -> Result<HashMap<String, Format>, anyhow::Error> {
    Ok(
        serde_json::from_str::<Vec<FormatJson>>(include_str!("../resources/formats.json"))?
            .into_iter()
            .map(move |x| match x {
                FormatJson::Set(key) => (key.clone(), Format::Set(key)),
                FormatJson::Draft((key, val)) => (key.clone(), Format::Draft(key, val)),
            })
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[test]
    fn test_parse_collections() {
        let card_list = parse_formats().unwrap();
        assert!(card_list.contains_key("mh2"));
        assert!(card_list.contains_key("draft_otj"));

        if let Format::Draft(_, y) = &card_list["draft_otj"] {
            assert_eq!(y, "set%3Aotp+or+set%3Abig+or+(e%3Aspg+cn≥29+cn≤38)")
        } else {
            panic!("draft_otj was not a Draft")
        }
    }
}
