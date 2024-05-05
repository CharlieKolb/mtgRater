#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use anyhow::Error;

use sqlx::{prelude::FromRow, PgPool, Row};
use tracing::info;

use crate::{
    util::{self, Collection, CollectionItem, CollectionsJson},
    ServerData,
};

static MIGRATIONS: &[&str] = &[
    include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/db/queries/migrations/0001_ratings_up.sql"
    )),
    include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/db/queries/migrations/0002_cards_up.sql"
    )),
];

async fn generate_ratings_query(
    formats: &Vec<String>,
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
                        format,
                    )
                })
                .collect::<Vec<String>>()
                .join(",")
        })
        .collect::<Vec<String>>()
        .join(","))
}

async fn generate_cards_query(collection_item: &CollectionItem) -> Result<String, anyhow::Error> {
    let (_, ref cards) = collection_item;

    Ok(cards
        .into_iter()
        .map(|x| {
            format!(
                "('{}', '{}', '{}')",
                x.collector_number.replace("'", "''"),
                x.set.replace("'", "''"),
                x.name.replace("'", "''")
            )
        })
        .collect::<Vec<String>>()
        .join(","))
}

async fn register_supported_sets(
    pool: &PgPool,
    collections: &CollectionsJson,
) -> Result<(), Error> {
    for (key, collection) in collections.entries.iter() {
        let item = util::resolve_collection(key, collection).await?;
        let ratings_query: String = generate_ratings_query(&collections.formats, &item).await?;
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

        let cards_query: String = generate_cards_query(&item).await?;
        sqlx::query(
            format!(
                "INSERT INTO cards(card_code, set_code, card_name)
    VALUES {} ON CONFLICT DO NOTHING",
                cards_query
            )
            .as_str(),
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

#[derive(Debug, FromRow)]
pub struct SchemaCards {
    collection_id: String,
}

pub async fn init_db(pool: &PgPool, server_data: &ServerData) -> Result<(), Error> {
    for migration in MIGRATIONS {
        info!(migration);
        sqlx::query(migration).execute(pool).await?;
    }

    // @TODO(ckolb): This should pull from a dedicated "collections" table once we have one
    let known_sets = sqlx::query_as::<_, SchemaCards>("SELECT DISTINCT collection_id FROM ratings")
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|x| x.collection_id)
        .collect::<HashSet<_>>();

    info!("{:?}", known_sets);

    // @TODO(ckolb): We should have a parameter to do a non-filtered run e.g. every 24 hours to refresh missing scryfall data and changed collections
    // This is mostly here to not spam scryfall during development, the cost to rerunning the queries on our end is negligible
    let filtered_collections = server_data
        .collections
        .entries
        .iter()
        .filter(|x| !known_sets.contains(x.0))
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
