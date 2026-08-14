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

    // Asegurar permisos sobre el esquema public (PostgreSQL 15+ en nubes gestionadas)
    tracing::info!("Asegurando permisos en esquema public de PostgreSQL...");
    let _ = sqlx::query("ALTER SCHEMA public OWNER TO CURRENT_USER")
        .execute(&pool)
        .await;
    let _ = sqlx::query("GRANT ALL ON SCHEMA public TO CURRENT_USER")
        .execute(&pool)
        .await;
    let _ = sqlx::query("GRANT ALL ON SCHEMA public TO PUBLIC")
        .execute(&pool)
        .await;

    // Ejecutar migraciones de la base de datos automáticamente en startup (idempotente).
    tracing::info!("Ejecutando migraciones SQLx...");
    match sqlx::migrate!("../../migrations").run(&pool).await {
        Ok(_) => tracing::info!("Migraciones SQLx aplicadas correctamente"),
        Err(err) => tracing::warn!("Aviso durante la ejecución de migraciones SQLx: {}", err),
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
