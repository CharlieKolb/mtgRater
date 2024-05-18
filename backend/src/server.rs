use std::{
    collections::HashMap,
    future::Future,
    net::SocketAddr,
    sync::{Arc, Mutex, RwLock},
};

use anyhow::anyhow;
use axum::{
    extract::{ConnectInfo, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use axum_client_ip::{
    Forwarded, LeftmostForwarded, LeftmostXForwardedFor, RightmostForwarded,
    RightmostXForwardedFor, SecureClientIp, SecureClientIpSource, XForwardedFor, XRealIp,
};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use tracing::{info, warn};

use crate::{
    db::lib::{self, RatingsValue, SchemaRatings},
    util::Collection,
    ServerData,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
    pub server_data: ServerData,
    pub post_rating_request_cache: Arc<Mutex<lru::LruCache<String, usize>>>,
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
    ip: SecureClientIp,
    State(state): State<AppState>,
    Query(RatingsCollectionExtractor { collection_id }): Query<RatingsCollectionExtractor>,
    Query(RatingsPostExtractor {
        rating: rating_raw,
        card_code,
        set_code,
        format_id,
    }): Query<RatingsPostExtractor>,
) -> impl IntoResponse {
    // Cache combination of all inputs besides the actual rating to prevent ruining our data from repeated malicious POST requests
    // Note that the current implementation does not block to acquire a lock and prefers to handle the request. This is an intended tradeoff to avoid slowing the server during high organic traffic.
    {
        let cache_key = format!(
            "{}{}{}{}{}",
            ip.0, collection_id, set_code, card_code, format_id
        );
        let arc = state.post_rating_request_cache.clone();
        let mutex = arc.try_lock();
        if let Ok(mut cache) = mutex {
            let elem = cache.get(&cache_key);
            let res = match elem {
                None => Some(1),
                Some(x) if *x < state.server_data.collections.formats.len() => Some(*x + 1),
                _ => None,
            };
            if let Some(x) = res {
                cache.push(cache_key, x);
            } else {
                return Err((
                    StatusCode::TOO_MANY_REQUESTS,
                    "Please report if you saw this error during intended usage of the website."
                        .into(),
                ));
            }
        }
    }

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
