use serde::Serialize;
use sqlx::{prelude::FromRow, Pool, Postgres};

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

#[tracing::instrument]
pub async fn increment_rating(
    pool: &Pool<Postgres>,
    rating: &RatingsValue,
    collection_id: &String,
    card_code: &String,
    set_code: &String,
    format_id: &String,
) -> Result<u64, sqlx::Error> {
    let res = sqlx::query(
        format!(
            "UPDATE ratings
    SET {0} = {0} + 1
    WHERE collection_id = $2 AND card_code = $3 AND set_code = $4 AND format_id = $5",
            rating.to_sql_column()
        )
        .as_str(),
    )
    .bind(rating.to_sql_column())
    .bind(collection_id)
    .bind(card_code)
    .bind(set_code)
    .bind(format_id)
    .execute(pool)
    .await?;

    Ok(res.rows_affected())
}

#[derive(Debug, FromRow, Serialize)]
pub struct SchemaRatings {
    pub format_id: String,
    pub set_code: String,
    pub card_code: String,
    rated_1: i32,
    rated_2: i32,
    rated_3: i32,
    rated_4: i32,
    rated_5: i32,
}

/* This function builds a sql statement like

(
    case set_code
    when 'a' then 0
    when 'b' then 1
    end
),

dynamically for a list e.g. ["a", "b"]

note the trailing comma is imporant as other statements will follow, hence the empty return for the empty list
*/
fn make_set_order_by_expr(set_order: &Vec<String>) -> String {
    if set_order.len() == 0 {
        return String::new();
    }

    let wheres = set_order
        .iter()
        .enumerate()
        .map(|(i, x)| format!(" when '{}' then {} ", x, i))
        .collect::<String>();
    return format!("( case set_code {} end),", wheres);
}

pub async fn get_ratings(
    pool: &Pool<Postgres>,
    collection_id: &String,
    set_order: &Vec<String>,
) -> Result<Vec<SchemaRatings>, anyhow::Error> {
    let results = sqlx::query_as::<_, SchemaRatings>(
        GET_RATINGS_QUERY
            .replace(
                "{set_order_stmt}",
                make_set_order_by_expr(set_order).as_str(),
            )
            .as_str(),
    )
    .bind(collection_id)
    .fetch_all(pool)
    .await?;

    Ok(results)
}
