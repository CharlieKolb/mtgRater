use sqlx::{Pool, Postgres};

enum RatingsValue {
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

pub fn increment_rating(pool: Pool<Postgres>, rating: RatingsValue) {
    // sqlx::query!(
    //     "UPDATE ratings
    // SET $1 = $1 + 1
    // WHERE collection_id = $2 AND card_id = $3",
    //     rating.to_sql_column(),
    //     collection_id,
    //     card_id,
    // )
}
