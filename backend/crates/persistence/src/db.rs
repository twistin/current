use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{Executor, PgPool};
use std::str::FromStr;

/// Crea el pool de conexiones a PostgreSQL asegurando search_path en cada conexión.
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::from_str(database_url)?;

    PgPoolOptions::new()
        .max_connections(10)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                conn.execute("CREATE SCHEMA IF NOT EXISTS current; SET search_path TO current, public;")
                    .await?;
                Ok(())
            })
        })
        .connect_with(options)
        .await
}
