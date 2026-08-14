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

    // Prevenir bloqueos de advisory locks y preparar esquema
    tracing::info!("Configurando base de datos...");
    let _ = sqlx::query("SELECT pg_advisory_unlock_all()")
        .execute(&pool)
        .await;
    let _ = sqlx::query("CREATE SCHEMA IF NOT EXISTS current")
        .execute(&pool)
        .await;
    let _ = sqlx::query("SET search_path TO current, public")
        .execute(&pool)
        .await;

    // Ejecutar migraciones SQLx con un timeout de 15s para garantizar el arranque rápido del servidor HTTP
    tracing::info!("Ejecutando migraciones SQLx...");
    match tokio::time::timeout(
        std::time::Duration::from_secs(15),
        sqlx::migrate!("../../migrations").run(&pool),
    )
    .await
    {
        Ok(Ok(_)) => tracing::info!("Migraciones SQLx completadas exitosamente"),
        Ok(Err(err)) => tracing::warn!("Aviso durante las migraciones: {}", err),
        Err(_) => tracing::warn!("Timeout al ejecutar migraciones SQLx, continuando con el arranque"),
    }

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
