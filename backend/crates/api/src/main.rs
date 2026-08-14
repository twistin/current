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

    // En PostgreSQL 15+ de nubes gestionadas, los usuarios no-superuser no pueden crear tablas en 'public'.
    // Creamos el esquema propio 'current', ajustamos search_path en la sesión y en la rol del usuario.
    tracing::info!("Configurando esquema de base de datos 'current'...");
    let _ = sqlx::query("CREATE SCHEMA IF NOT EXISTS current")
        .execute(&pool)
        .await;
    let _ = sqlx::query("SET search_path TO current")
        .execute(&pool)
        .await;
    let _ = sqlx::query("ALTER ROLE CURRENT_USER SET search_path TO current")
        .execute(&pool)
        .await;

    // Ejecutar migraciones SQLx sobre la base de datos (idempotente)
    tracing::info!("Ejecutando migraciones SQLx...");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("Error al ejecutar migraciones SQLx en la base de datos");

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
