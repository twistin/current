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

    // Lanza las migraciones en segundo plano para abrir el socket HTTP de inmediato
    // y superar el Readiness Probe de DigitalOcean en el puerto 8080.
    let migration_pool = pool.clone();
    tokio::spawn(async move {
        let _ = sqlx::query("SELECT pg_advisory_unlock_all()")
            .execute(&migration_pool)
            .await;

        tracing::info!("Ejecutando migraciones SQLx en segundo plano...");
        match sqlx::migrate!("../../migrations").run(&migration_pool).await {
            Ok(_) => tracing::info!("Migraciones SQLx aplicadas exitosamente en 'current'"),
            Err(err) => tracing::error!("Error al aplicar migraciones SQLx: {}", err),
        }
    });

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
