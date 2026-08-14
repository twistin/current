use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;

/// Crea el pool de conexiones a PostgreSQL fijando exclusivamente search_path="current".
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    // 1. Crear el esquema 'current' usando el pool inicial si aún no existe
    let raw_options = PgConnectOptions::from_str(database_url)?;
    if let Ok(raw_pool) = PgPoolOptions::new().connect_with(raw_options).await {
        let _ = sqlx::query("CREATE SCHEMA IF NOT EXISTS current")
            .execute(&raw_pool)
            .await;
    }

    // 2. Fajar search_path a "current" en todas las conexiones del pool
    let options = PgConnectOptions::from_str(database_url)?
        .options([("search_path", "current")]);

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect_with(options)
        .await?;

    Ok(pool)
}
