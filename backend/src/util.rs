use anyhow::Error;
use core::time;
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json;
use std::{
    collections::{HashMap, HashSet},
    thread,
};
use tracing::info;

#[derive(Hash, PartialEq, Eq, Default, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct CardDetail {
    pub set: String,
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

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
#[serde(default)]
pub struct Collection {
    pub title: String,
    pub scryfall_query: String,
    pub set_order: Vec<String>,
    pub releasing: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CollectionsJson {
    pub latest: String,
    pub formats: Vec<String>,
    pub entries: HashMap<String, Collection>,
}

pub type CollectionItem = (String, Vec<CardDetail>);

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

        thread::sleep(time::Duration::from_millis(100));

        i += 1;
    }

    Ok(cards.into_iter().collect())
}

pub async fn resolve_collection(name: &String, c: &Collection) -> Result<CollectionItem, Error> {
    Ok((name.clone(), get_cards_from_query(&c.scryfall_query).await?))
}

pub fn parse_collections() -> Result<CollectionsJson, anyhow::Error> {
    Ok(serde_json::from_str::<CollectionsJson>(include_str!(
        "../resources/collections.json"
    ))?)
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[test]
    fn test_parse_collections() {
        let card_list = parse_collections().unwrap();
        assert!(card_list.entries.contains_key("mh2"));
        assert!(card_list.entries.contains_key("draft_otj"));

        assert_eq!(
            card_list.entries["draft_otj"].scryfall_query,
            "set%3Aotp+or+set%3Abig+or+(e%3Aspg+cn≥29+cn≤38)"
        );
    }
}
