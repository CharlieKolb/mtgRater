use std::{collections::HashMap, future::Future};

use anyhow::anyhow;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};

use crate::{
    db::lib::{self, RatingsValue, SchemaRatings},
    ServerData,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
    pub server_data: ServerData,
}

#[derive(Deserialize)]
pub struct RatingsCollectionExtractor {
    collection_id: String,
}

#[derive(Deserialize)]
pub struct RatingsPostExtractor {
    rating: String,
    card_code: String,
    set_code: String,
}

#[derive(Serialize)]
pub struct RatingsGetResponse {
    collection_id: String,
    ratings: Vec<SchemaRatings>,
}

fn parse_rating(rating_raw: &String) -> Result<RatingsValue, anyhow::Error> {
    match rating_raw.as_str() {
        "1" => Ok(RatingsValue::Rated1),
        "2" => Ok(RatingsValue::Rated2),
        "3" => Ok(RatingsValue::Rated3),
        "4" => Ok(RatingsValue::Rated4),
        "5" => Ok(RatingsValue::Rated5),
        _ => Err(anyhow!("bad post rating")),
    }
}

pub async fn post_ratings(
    State(state): State<AppState>,
    Query(RatingsCollectionExtractor { collection_id }): Query<RatingsCollectionExtractor>,
    Query(RatingsPostExtractor {
        rating: rating_raw,
        card_code,
        set_code,
    }): Query<RatingsPostExtractor>,
) -> impl IntoResponse {
    let rating = match parse_rating(&rating_raw) {
        Ok(x) => x,
        Err(e) => return Err((StatusCode::BAD_REQUEST, e.to_string())),
    };

    // @TODO(ckolb): verify card_code and set_code are in existing collections

    if let Err(e) =
        lib::increment_rating(&state.pool, rating, &collection_id, &card_code, &set_code).await
    {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
    }

    // We intentionally do not return an updated result
    Ok(())
}

pub async fn get_ratings(
    State(state): State<AppState>,
    Query(RatingsCollectionExtractor { collection_id }): Query<RatingsCollectionExtractor>,
) -> impl IntoResponse {
    // @TODO(ckolb): verify card_code and set_code are in existing collections
    match lib::get_ratings(&state.pool, &collection_id).await {
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        Ok(x) => Ok(Json(RatingsGetResponse {
            collection_id,
            ratings: x,
        })),
    }
}

pub async fn get_collections(
    State(state): State<AppState>,
) -> Result<Json<crate::util::CollectionsJson>, axum::response::ErrorResponse> {
    return Ok(Json(state.server_data.collections));
}
