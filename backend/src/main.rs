use std::{collections::HashMap, fs};

use sqlx::postgres::PgPoolOptions;

mod collections;
mod db;
mod server;

struct ServerData {
    sets: HashMap<String, collections::Collection>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Create a connection pool
    let _pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:postgres@localhost:5433/mtgRater-dev")
        .await?;

    // init_db::register_supported_sets(&_pool).await?;
    Ok(())
}
