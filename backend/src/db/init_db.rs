#![allow(dead_code)]

use anyhow::Error;

use sqlx::PgPool;

use crate::{
    util::{self, FormatItem},
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

async fn register_supported_sets(pool: &PgPool, server_data: &ServerData) -> Result<(), Error> {
    for collection in server_data.formats.values() {
        let item = util::resolve_format(collection).await?;
        let ratings_query: String = generate_ratings_query(&item).await?;
        sqlx::query(
            format!(
                "INSERT INTO ratings(collection_id, set_id, card_code)
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
                "INSERT INTO cards(card_code, set_id, card_name)
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

pub async fn init_db(pool: &PgPool, server_data: &ServerData) -> Result<(), Error> {
    for migration in MIGRATIONS {
        sqlx::query(migration).execute(pool).await?;
    }

    register_supported_sets(pool, server_data).await?;

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
