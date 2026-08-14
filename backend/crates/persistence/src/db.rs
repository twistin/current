use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;

/// Crea el pool de conexiones a PostgreSQL con search_path="current,public".
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::from_str(database_url)?
        .options([("search_path", "current,public")]);

    PgPoolOptions::new()
        .max_connections(10)
        .connect_with(options)
        .await
}
