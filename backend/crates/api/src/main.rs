use sqlx::PgPool;
use std::net::SocketAddr;

async fn init_database(pool: &PgPool) {
    let _ = sqlx::query("SELECT pg_advisory_unlock_all()").execute(pool).await;

    // Crear esquema 'current' dedicado para evitar conflictos de permisos con 'public' en PostgreSQL gestionado
    let _ = sqlx::query("CREATE SCHEMA IF NOT EXISTS current").execute(pool).await;
    let _ = sqlx::query("SET search_path TO current, public").execute(pool).await;
    let _ = sqlx::query("GRANT ALL ON SCHEMA public TO CURRENT_USER").execute(pool).await;

    tracing::info!("Ejecutando migraciones SQLx...");
    match sqlx::migrate!("../../migrations").run(pool).await {
        Ok(_) => tracing::info!("Migraciones SQLx aplicadas exitosamente"),
        Err(err) => {
            tracing::warn!("Aviso en sqlx::migrate: {}. Aplicando scripts DDL directamente...", err);
            let migrations = [
                include_str!("../../../migrations/0001_member.sql"),
                include_str!("../../../migrations/0002_claim.sql"),
                include_str!("../../../migrations/0003_assertion.sql"),
                include_str!("../../../migrations/0004_source_evidence.sql"),
                include_str!("../../../migrations/0005_rebuttal_contribution.sql"),
            ];
            for (idx, sql) in migrations.iter().enumerate() {
                if let Err(e) = sqlx::raw_sql(sql).execute(pool).await {
                    tracing::info!("Script DDL migración 000{}: {}", idx + 1, e);
                }
            }
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://current:current_secret@localhost:5432/current_dev".to_string()
    });

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .expect("PORT debe ser un número válido");

    let pool = current_persistence::db::create_pool(&database_url)
        .await
        .expect("No se pudo conectar a PostgreSQL");

    // Inicializar y migrar la base de datos sincrónicamente antes de abrir el puerto HTTP
    init_database(&pool).await;

    let app = current_api::router::build_router(pool);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Servidor escuchando en http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("No se pudo abrir el socket HTTP");

    axum::serve(listener, app)
        .await
        .expect("Error al ejecutar el servidor HTTP");
}
