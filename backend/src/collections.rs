use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs};

pub enum Collection {
    Set(String),
    Draft(String, String),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
enum CollectionJson {
    Set(String),
    Draft((String, String)),
}

pub fn parse_collections() -> Result<HashMap<String, Collection>, anyhow::Error> {
    Ok(serde_json::from_str::<Vec<CollectionJson>>(
        fs::read_to_string("resources/collections.json")?.as_str(),
    )?
    .into_iter()
    .map(move |x| match x {
        CollectionJson::Set(key) => (key.clone(), Collection::Set(key)),
        CollectionJson::Draft((key, val)) => (key.clone(), Collection::Draft(key, val)),
    })
    .collect())
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[test]
    fn test_parse_collections() {
        let cols = parse_collections().unwrap();
        assert!(cols.contains_key("MH2"));
        assert!(cols.contains_key("draft_otj"));

        if let Collection::Draft(_, y) = &cols["draft_otj"] {
            assert_eq!(y, "set%3Aotp+or+set%3Abig+or+(e%3Aspg+cn≥29+cn≤38)")
        } else {
            panic!("draft_otj was not a Draft")
        }
    }
}
