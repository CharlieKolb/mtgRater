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
    util::Collection,
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
    format_id: String,
}

#[derive(Serialize)]
struct CardGetResponse {
    set_code: String,
    card_code: String,
    rating_by_format: HashMap<String, SchemaRatings>,
}

#[derive(Serialize)]
pub struct RatingsGetResponse {
    collection_id: String,
    collection_info: Collection,
    ratings: Vec<CardGetResponse>,
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
        format_id,
    }): Query<RatingsPostExtractor>,
) -> impl IntoResponse {
    let rating = match parse_rating(&rating_raw) {
        Ok(x) => x,
        Err(e) => return Err((StatusCode::BAD_REQUEST, e.to_string())),
    };

    // @TODO(ckolb): verify card_code and set_code are in existing collections

    if let Err(e) = lib::increment_rating(
        &state.pool,
        rating,
        &collection_id,
        &card_code,
        &set_code,
        &format_id,
    )
    .await
    {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
    }

    // We intentionally do not return an updated result
    Ok(())
}

fn parse_schemas(v: Vec<SchemaRatings>) -> Vec<CardGetResponse> {
    fn is_same_card(sr: &SchemaRatings, c: &CardGetResponse) -> bool {
        sr.set_code == c.set_code && sr.card_code == c.card_code
    }

    v.into_iter()
        .fold(Vec::<CardGetResponse>::new(), |mut x, y| {
            if let Some(e) = x.last_mut() {
                if is_same_card(&y, e) {
                    e.rating_by_format.insert(y.format_id.clone(), y);
                    return x;
                }
            }
            x.push(CardGetResponse {
                card_code: y.card_code.clone(),
                set_code: y.set_code.clone(),
                rating_by_format: HashMap::from([(y.format_id.clone(), y)]),
            });
            x
        })
}

pub async fn get_ratings(
    State(state): State<AppState>,
    Query(RatingsCollectionExtractor { collection_id }): Query<RatingsCollectionExtractor>,
) -> impl IntoResponse {
    // @TODO(ckolb): verify collection_id is in existing collections
    let collection = match state.server_data.collections.entries.get(&collection_id) {
        Some(x) => x,
        None => return Err((StatusCode::BAD_REQUEST, collection_id)),
    };

    match lib::get_ratings(&state.pool, &collection_id, &collection.set_order).await {
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        Ok(x) => Ok(Json(RatingsGetResponse {
            collection_id,
            collection_info: collection.clone(),
            ratings: parse_schemas(x),
        })),
    }
}

pub async fn get_collections(
    State(state): State<AppState>,
) -> Result<Json<crate::util::CollectionsJson>, axum::response::ErrorResponse> {
    return Ok(Json(state.server_data.collections));
}
