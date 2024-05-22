use std::{
    env,
    net::SocketAddr,
    sync::{Arc, Mutex},
};

use axum::{routing::get, Router};
use axum_client_ip::SecureClientIpSource;
use lru::LruCache;
use server::AppState;
use sqlx::postgres::PgPoolOptions;
use tracing::info;
use util::CollectionsJson;

mod db;
mod server;
mod util;

#[derive(serde::Deserialize)]
struct Config {
    ip_source: SecureClientIpSource,
}

#[derive(Clone, Debug)]
struct ServerData {
    collections: CollectionsJson,
}

impl std::fmt::Debug for AppState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.server_data.fmt(f)
    }
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let subscriber = tracing_subscriber::fmt()
        .with_file(true)
        .with_line_number(true)
        .with_thread_ids(true)
        .with_target(false)
        .with_max_level(tracing::Level::DEBUG)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let config: Config = envy::from_env().unwrap();

    let server_data = ServerData {
        collections: util::parse_collections()?,
    };

    let database_url = include_str!("../db/url.txt");
    let database_password = include_str!("../db/password.txt");
    let postgres_str = format!(
        "postgresql://postgres:{}@{}",
        database_password, database_url
    );

    info!("Connecting to DB at '{}'", &postgres_str);
    // Create a connection pool
    let _pool = PgPoolOptions::new()
        .min_connections(1)
        .max_connections(5)
        .after_connect(|_, _| {
            Box::pin(async move {
                info!("Connected db");
                Ok(())
            })
        })
        .connect(&postgres_str)
        .await?;

    db::init_db::init_db(&_pool, &server_data).await?;

    let app_state = AppState {
        pool: _pool,
        server_data,
        post_rating_request_cache: Arc::new(Mutex::new(LruCache::new(
            std::num::NonZeroUsize::new(20000).unwrap(),
        ))),
    };
    // build our application with a single route
    let app = Router::new()
        .route(
            "/ratings",
            get(server::get_ratings).post(server::post_ratings),
        )
        .route("/collections", get(server::get_collections))
        .layer(config.ip_source.into_extension())
        .with_state(app_state);

    let address = env::var("ADDRESS").unwrap_or("127.0.0.1:8000".into());
    info!("Setup finished, starting listener on {}", address);
    let listener = tokio::net::TcpListener::bind(&address).await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();

    Ok(())
}
