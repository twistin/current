use std::net::SocketAddr;

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

    let migration_pool = pool.clone();
    tokio::spawn(async move {
        let _ = sqlx::query("SELECT pg_advisory_unlock_all()")
            .execute(&migration_pool)
            .await;

        // Diagnóstico de usuario y permisos en PostgreSQL
        if let Ok(row) = sqlx::query_as::<_, (String, String, String)>(
            "SELECT current_user::text, current_database()::text, current_schema()::text"
        )
        .fetch_one(&migration_pool)
        .await {
            tracing::info!("DB Auth Diagnostic: user={}, db={}, schema={}", row.0, row.1, row.2);
        }

        // Intentar otorgar permisos en schema public por si el usuario es el owner de la BD
        let grant_res = sqlx::query("GRANT ALL ON SCHEMA public TO CURRENT_USER").execute(&migration_pool).await;
        tracing::info!("GRANT ALL ON SCHEMA public result: {:?}", grant_res);

        let grant_pub_res = sqlx::query("GRANT CREATE ON SCHEMA public TO PUBLIC").execute(&migration_pool).await;
        tracing::info!("GRANT CREATE ON SCHEMA public TO PUBLIC result: {:?}", grant_pub_res);

        tracing::info!("Ejecutando migraciones SQLx...");
        match sqlx::migrate!("../../migrations").run(&migration_pool).await {
            Ok(_) => tracing::info!("Migraciones SQLx aplicadas exitosamente"),
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
