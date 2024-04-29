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
    db::lib::{self, RatingsValue},
    ServerData,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
    pub server_data: ServerData,
}

#[tokio::main]
pub async fn launch_server(pool: Pool<Postgres>, server_data: ServerData) {
    let app_state = AppState { pool, server_data };
    // build our application with a single route
    let app = Router::new()
        .route("/ratings", get(get_ratings).post(post_ratings))
        .with_state(app_state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// which calls one of these handlers
pub async fn get_ratings(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) {
}

#[derive(Deserialize)]
pub struct RatingsPostExractor {
    format: String,
    card_id: String,
    set_id: String,
    rating: String,
}

#[derive(Serialize)]
pub struct RatingsPostResponse {
    format: String,
    card_id: String,
    set_id: String,
    rated_1: u64,
    rated_2: u64,
    rated_3: u64,
    rated_4: u64,
    rated_5: u64,
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
    Query(RatingsPostExractor {
        format,
        card_id,
        set_id,
        rating: rating_raw,
    }): Query<RatingsPostExractor>,
) -> impl IntoResponse {
    let rating = match parse_rating(&rating_raw) {
        Ok(x) => x,
        Err(e) => return Err((StatusCode::BAD_REQUEST, e.to_string())),
    };

    // @TODO(ckolb): verify card_id and set_id are in existing format

    if let Err(e) = lib::increment_rating(&state.pool, rating, &format, &card_id, &set_id).await {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
    }

    Ok(Json(RatingsPostResponse {
        format,
        card_id,
        set_id,
        rated_1: 1,
        rated_2: 2,
        rated_3: 3,
        rated_4: 4,
        rated_5: 5,
    }))
}
