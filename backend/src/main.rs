use std::{collections::HashMap, fs};

use sqlx::postgres::PgPoolOptions;

mod db;
mod server;
mod util;

struct ServerData {
    formats: HashMap<String, util::Format>,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let server_data = ServerData {
        formats: util::parse_formats()?,
    };

    // Create a connection pool
    let _pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:postgres@localhost:5433/mtgRater-dev")
        .await?;

    db::init_db::register_supported_sets(&_pool, &server_data).await?;
    Ok(())
}
