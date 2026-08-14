use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

/// Crea el pool de conexiones a PostgreSQL.
///
/// `max_connections` = 10 es conservador para el MVP (~10 usuarios simultáneos).
/// Aumentar en fases posteriores según carga real.
pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}
