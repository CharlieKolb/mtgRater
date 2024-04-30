use sqlx::{Pool, Postgres};

use crate::util::Format;

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

pub async fn increment_rating(
    pool: &Pool<Postgres>,
    rating: RatingsValue,
    format_id: &String,
    card_id: &String,
    set_id: &String,
) -> Result<(), anyhow::Error> {
    sqlx::query(
        "UPDATE ratings
    SET $1 = $1 + 1
    WHERE format_id = $2 AND card_id = $3 AND set_id = $4",
    )
    .bind(rating.to_sql_column())
    .bind(format_id)
    .bind(card_id)
    .bind(set_id)
    .execute(pool)
    .await?;

    Ok(())
}
