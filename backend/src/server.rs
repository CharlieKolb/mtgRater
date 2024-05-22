use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use anyhow::anyhow;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use axum_client_ip::SecureClientIp;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use tracing::{info, instrument};

use crate::{
    db::{
        init_db,
        lib::{self, RatingsValue, SchemaRatings},
    },
    util::{CardDetail, Collection},
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

fn card_code_under_1000ish(card_code: &str) -> bool {
    if let Ok(x) = card_code.parse::<usize>() {
        return x < 1000;
    } else {
        // Some card_codes (scryfall term `collector_number` are non-numerical due to formats like A-<num> or <num>* (star emoji))
        let filtered = card_code
            .split("")
            .into_iter()
            .filter(|x| "0123456789".contains(x))
            .collect::<String>();
        if let Ok(x) = filtered.parse::<usize>() {
            return x < 1000;
        }
    }

    false
}

#[instrument(err(Debug, level = "warn"))]
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

    match lib::increment_rating(
        &state.pool,
        &rating,
        &collection_id,
        &card_code,
        &set_code,
        &format_id,
    )
    .await
    {
        Ok(n) if n == 0 => {
            // This entire block aims to add a missing set/card combo due to a currently releasing set
            if state
                .server_data
                .collections
                .formats
                .iter()
                .all(|x| x.title != format_id)
            {
                return Err((StatusCode::BAD_REQUEST, "Unknown Format".into()));
            }

            let collection = match state.server_data.collections.entries.get(&collection_id) {
                None => return Err((StatusCode::BAD_REQUEST, "Unknown collection".into())),
                Some(c) => c,
            };

            if !collection.set_order.contains(&set_code) {
                return Err((StatusCode::BAD_REQUEST, "Set not in collection".into()));
            }

            if collection.releasing && card_code_under_1000ish(&card_code) {
                info!(
                    "Adding missing entry {} {} to collection {}",
                    set_code, card_code, collection_id
                );
                if let Err(e) = init_db::run_ratings_query(
                    &state.pool,
                    &state.server_data.collections.formats,
                    &(
                        collection_id.clone(),
                        vec![CardDetail {
                            set: set_code.clone(),
                            collector_number: card_code.clone(),
                        }],
                    ),
                )
                .await
                {
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
                } else {
                    if let Err(e) = lib::increment_rating(
                        &state.pool,
                        &rating,
                        &collection_id,
                        &card_code,
                        &set_code,
                        &format_id,
                    )
                    .await
                    {
                        tracing::error!(
                            "Attempt to add unkown card failed due to {}",
                            e.to_string()
                        );
                    }
                }
            }
        }
        Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        _ => (),
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

#[instrument(err(Debug, level = "warn"))]
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

#[instrument(err(Debug))]
pub async fn get_collections(
    State(state): State<AppState>,
) -> Result<Json<crate::util::CollectionsJson>, axum::response::ErrorResponse> {
    return Ok(Json(state.server_data.collections));
}
