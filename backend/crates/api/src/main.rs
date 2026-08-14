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

        // Intentar conectar con usuario doadmin en el mismo cluster de App Platform
        let doadmin_url = database_url.replace("postgres://db:", "postgres://doadmin:");
        if doadmin_url != database_url {
            tracing::info!("Intentando conexión con doadmin para habilitar permisos en schema public...");
            if let Ok(admin_pool) = current_persistence::db::create_pool(&doadmin_url).await {
                let res1 = sqlx::query("GRANT ALL ON SCHEMA public TO PUBLIC").execute(&admin_pool).await;
                tracing::info!("doadmin GRANT ALL ON SCHEMA public result: {:?}", res1);
                let res2 = sqlx::query("GRANT ALL ON SCHEMA public TO db").execute(&admin_pool).await;
                tracing::info!("doadmin GRANT ALL ON SCHEMA public TO db result: {:?}", res2);
            } else {
                tracing::info!("Conexión con doadmin no disponible con ese password.");
            }
        }

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
