use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;

/// Crea el pool de conexiones a PostgreSQL asegurando la creación del esquema 'current'
/// y fijando search_path TO current, public en cada conexión nueva vía after_connect.
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::from_str(database_url)?;

    PgPoolOptions::new()
        .max_connections(10)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("CREATE SCHEMA IF NOT EXISTS current")
                    .execute(&mut *conn)
                    .await?;
                sqlx::query("SET search_path TO current, public")
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect_with(options)
        .await
}
