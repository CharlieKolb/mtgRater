#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use anyhow::Error;

use sqlx::{prelude::FromRow, PgPool};
use tracing::info;

use crate::{
    util::{self, Collection, CollectionItem, CollectionsJson, Format},
    ServerData,
};

static MIGRATIONS: &[&str] = &[include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/db/queries/migrations/0001_ratings_up.sql"
))];

async fn generate_ratings_query(
    formats: &Vec<Format>,
    collection_item: &CollectionItem,
) -> Result<String, anyhow::Error> {
    let (name, ref cards) = collection_item;

    Ok(formats
        .iter()
        .map(|format| {
            cards
                .iter()
                .map(|x| {
                    format!(
                        "('{}', '{}', '{}', '{}')",
                        name.replace("'", "''"),
                        x.set.replace("'", "''"),
                        x.collector_number.replace("'", "''"),
                        format.title,
                    )
                })
                .collect::<Vec<String>>()
                .join(",")
        })
        .collect::<Vec<String>>()
        .join(","))
}

pub async fn run_ratings_query(
    pool: &PgPool,
    formats: &Vec<Format>,
    collection_item: &CollectionItem,
) -> Result<(), anyhow::Error> {
    let ratings_query: String = generate_ratings_query(&formats, &collection_item).await?;
    sqlx::query(
        format!(
            "INSERT INTO ratings(collection_id, set_code, card_code, format_id)
VALUES {} ON CONFLICT DO NOTHING",
            ratings_query
        )
        .as_str(),
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn register_supported_sets(
    pool: &PgPool,
    collections: &CollectionsJson,
) -> Result<(), Error> {
    for (key, collection) in collections.entries.iter() {
        let item = util::resolve_collection(key, collection).await?;
        run_ratings_query(
            pool,
            &collections
                .formats
                .clone()
                .into_iter()
                .filter(|x| !collection.excluded_formats.contains(&x.title))
                .collect::<Vec<Format>>(),
            &item,
        )
        .await?;
    }

    Ok(())
}

#[derive(Debug, FromRow, PartialEq, PartialOrd, Eq, Ord, Hash)]
pub struct SchemaCards {
    collection_id: String,
    format_id: String,
}

fn misses_format(
    collection_id: &String,
    formats: &Vec<Format>,
    known_pairs: &HashSet<SchemaCards>,
) -> bool {
    for format in formats {
        if !known_pairs.contains(&SchemaCards {
            collection_id: collection_id.clone(),
            format_id: format.title.clone(),
        }) {
            return true;
        }
    }

    false
}

pub async fn init_db(pool: &PgPool, server_data: &ServerData) -> Result<(), Error> {
    for migration in MIGRATIONS {
        info!(migration);
        sqlx::query(migration).execute(pool).await?;
    }

    // @TODO(ckolb): This should pull from a dedicated "collections" table once we have one
    let known_sets =
        sqlx::query_as::<_, SchemaCards>("SELECT DISTINCT collection_id, format_id FROM ratings")
            .fetch_all(pool)
            .await?
            .into_iter()
            .collect::<HashSet<_>>();

    info!("{:?}", known_sets);

    // @TODO(ckolb): We should have a parameter to do a non-filtered run e.g. every 24 hours to refresh missing scryfall data and changed collections
    // This is mostly here to not spam scryfall during development, the cost to rerunning the queries on our end is negligible
    let filtered_collections = server_data
        .collections
        .entries
        .iter()
        .filter(|x| {
            x.1.releasing
                || misses_format(
                    x.0,
                    &server_data
                        .collections
                        .formats
                        .clone()
                        .into_iter()
                        .filter(|y| !x.1.excluded_formats.contains(&y.title))
                        .collect(),
                    &known_sets,
                )
        })
        .map(|(a, b)| (a.to_owned(), b.to_owned()))
        .collect::<HashMap<String, Collection>>();

    register_supported_sets(
        pool,
        &CollectionsJson {
            entries: filtered_collections,
            ..server_data.collections.clone()
        },
    )
    .await?;

    Ok(())
}
