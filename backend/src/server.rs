use std::{collections::HashMap, future::Future};

use axum::{
    extract::{Query, State},
    routing::get,
    Router,
};
use sqlx::{Pool, Postgres};

#[derive(Clone)]
struct AppState {
    pool: Pool<Postgres>,
}

pub async fn launch_server(pool: Pool<Postgres>) {
    let app_state = AppState { pool };
    // build our application with a single route
    let app = Router::new()
        .route("/ratings", get(get_ratings).post(post_ratings))
        .with_state(app_state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// which calls one of these handlers
async fn get_ratings(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) {
}

async fn post_ratings(State(state): State<AppState>) {}
