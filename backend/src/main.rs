use std::{collections::HashMap, fs};

use axum::{routing::get, Router};
use server::{launch_server, AppState};
use sqlx::postgres::{PgListener, PgPoolOptions};
use tracing::Instrument;

mod db;
mod server;
mod util;

#[derive(Clone)]
struct ServerData {
    formats: HashMap<String, util::Format>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let server_data = ServerData {
        formats: util::parse_formats()?,
    };

    let database_url = include_str!("../db/url.txt");
    let database_password = include_str!("../db/password.txt");
    let postgres_str = format!(
        "postgresql://postgres:{}@{}",
        database_password, database_url
    );

    println!("Connecting to DB at '{}'", &postgres_str);
    // Create a connection pool
    let _pool = PgPoolOptions::new()
        .min_connections(1)
        .max_connections(5)
        .after_connect(|x, y| {
            Box::pin(async move {
                println!("Connected db");
                Ok(())
            })
        })
        .connect(&postgres_str)
        .await?;

    db::init_db::init_db(&_pool, &server_data).await?;

    let app_state = AppState {
        pool: _pool,
        server_data,
    };
    // build our application with a single route
    let app = Router::new()
        .route(
            "/ratings",
            get(server::get_ratings).post(server::post_ratings),
        )
        .with_state(app_state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
