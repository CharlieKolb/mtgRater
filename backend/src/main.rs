use std::{collections::HashMap, fs};

use server::launch_server;
use sqlx::postgres::PgPoolOptions;

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

    // Create a connection pool
    let _pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(format!("postgres://postgres:{}@{}", database_password, database_url).as_str())
        .await?;

    db::init_db::register_supported_sets(&_pool, &server_data).await?;
    launch_server(_pool, server_data);
    Ok(())
}
