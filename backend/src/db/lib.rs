use serde::Serialize;
use sqlx::{prelude::FromRow, Pool, Postgres};
use tracing::{debug, instrument};

use crate::util::Collection;

static GET_RATINGS_QUERY: &str = &include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/db/queries/get_ratings.sql"
));

#[derive(Debug)]
pub enum RatingsValue {
    Rated1,
    Rated2,
    Rated3,
    Rated4,
    Rated5,
}

impl RatingsValue {
    pub fn to_sql_column(&self) -> &'static str {
        match self {
            RatingsValue::Rated1 => "rated_1",
            RatingsValue::Rated2 => "rated_2",
            RatingsValue::Rated3 => "rated_3",
            RatingsValue::Rated4 => "rated_4",
            RatingsValue::Rated5 => "rated_5",
        }
    }
}

enum RatingsColumn {
    CollectionId(String),
    SetId(String),
    CardCode(i32),
    Rating(RatingsValue),
}

#[tracing::instrument]
pub async fn increment_rating(
    pool: &Pool<Postgres>,
    rating: RatingsValue,
    collection_id: &String,
    card_code: &String,
    set_code: &String,
) -> Result<(), anyhow::Error> {
    sqlx::query(
        format!(
            "UPDATE ratings
    SET {0} = {0} + 1
    WHERE collection_id = $2 AND card_code = $3 AND set_code = $4",
            rating.to_sql_column()
        )
        .as_str(),
    )
    .bind(rating.to_sql_column())
    .bind(collection_id)
    .bind(card_code)
    .bind(set_code)
    .execute(pool)
    .await?;

    Ok(())
}

#[derive(Debug, FromRow, Serialize)]
pub struct SchemaRatings {
    set_code: String,
    card_code: String,
    rated_1: i32,
    rated_2: i32,
    rated_3: i32,
    rated_4: i32,
    rated_5: i32,
}

pub async fn get_ratings(
    pool: &Pool<Postgres>,
    collection_id: &String,
) -> Result<Vec<SchemaRatings>, anyhow::Error> {
    let results = sqlx::query_as::<_, SchemaRatings>(GET_RATINGS_QUERY)
        .bind(collection_id)
        .fetch_all(pool)
        .await?;

    debug!("{:?}", results);
    Ok(results)
}
