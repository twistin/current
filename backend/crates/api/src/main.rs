use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Inicializar el sistema de logs (respetando RUST_LOG si existe).
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

    // Asegurar la existencia del esquema 'current' perteneciente al usuario
    tracing::info!("Asegurando esquema de la base de datos...");
    let _ = sqlx::query("CREATE SCHEMA IF NOT EXISTS current")
        .execute(&pool)
        .await;

    // Liberar advisory locks obsoletos si los hubiere de builds previos
    let _ = sqlx::query("SELECT pg_advisory_unlock_all()")
        .execute(&pool)
        .await;

    // Ejecutar migraciones SQLx sobre la base de datos
    tracing::info!("Ejecutando migraciones SQLx...");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("Error crítico al ejecutar migraciones SQLx");

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
