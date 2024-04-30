#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use anyhow::Error;

use sqlx::{prelude::FromRow, PgPool, Row};
use tracing::info;

use crate::{
    util::{self, Format, FormatItem},
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

async fn generate_ratings_query(collection_item: &FormatItem) -> Result<String, anyhow::Error> {
    let (name, ref cards) = collection_item;

    Ok(cards
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
        .join(","))
}

async fn generate_cards_query(collection_item: &FormatItem) -> Result<String, anyhow::Error> {
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
    formats: &HashMap<String, Format>,
) -> Result<(), Error> {
    for collection in formats.values() {
        let item = util::resolve_format(collection).await?;
        let ratings_query: String = generate_ratings_query(&item).await?;
        sqlx::query(
            format!(
                "INSERT INTO ratings(format_id, set_code, card_code)
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
    format_id: String,
}

pub async fn init_db(pool: &PgPool, server_data: &ServerData) -> Result<(), Error> {
    for migration in MIGRATIONS {
        info!(migration);
        sqlx::query(migration).execute(pool).await?;
    }

    // @TODO(ckolb): This should pull from a dedicated "formats" table once we have one
    let known_sets = sqlx::query_as::<_, SchemaCards>("SELECT DISTINCT format_id FROM ratings")
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|x| x.format_id)
        .collect::<HashSet<_>>();

    info!("{:?}", known_sets);

    // @TODO(ckolb): We should have a parameter to do a non-filtered run e.g. every 24 hours to refresh missing scryfall data and changed formats
    // This is mostly here to not spam scryfall during development, the cost to rerunning the queries on our end is negligible
    let filtered_formats = server_data
        .formats
        .iter()
        .filter(|x| !known_sets.contains(x.0))
        .map(|(a, b)| (a.to_owned(), b.to_owned()))
        .collect::<HashMap<String, Format>>();

    register_supported_sets(pool, &filtered_formats).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_generate_ratings_queries() {
        println!(
            "{} ",
            generate_ratings_query(
                &util::resolve_format(&util::Format::Set(String::from("MH2")))
                    .await
                    .unwrap()
            )
            .await
            .unwrap()
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_generate_cards_queries() {
        println!(
            "{} ",
            generate_cards_query(
                &util::resolve_format(&util::Format::Draft(
                    String::from("draft_otj"),
                    String::from("set%3Aotp+or+set%3Abig+or+(e%3Aspg+cn≥29+cn≤38)")
                ))
                .await
                .unwrap()
            )
            .await
            .unwrap()
        );
    }
}
