use std::collections::HashSet;

use sqlx::postgres::PgPoolOptions;

mod init_db;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Create a connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:postgres@localhost:5433/mtgrater")
        .await?;

    // init_db::register_supported_sets(&pool).await?;
    Ok(())
}
