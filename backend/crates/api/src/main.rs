use sqlx::PgPool;
use std::net::SocketAddr;

async fn init_database(pool: &PgPool) {
    tracing::info!("Inicializando base de datos...");

    let ddl_scripts = [
        ("0001_member", include_str!("../../../migrations/0001_member.sql")),
        ("0002_claim", include_str!("../../../migrations/0002_claim.sql")),
        ("0003_assertion", include_str!("../../../migrations/0003_assertion.sql")),
        ("0004_source_evidence", include_str!("../../../migrations/0004_source_evidence.sql")),
        ("0005_rebuttal_contribution", include_str!("../../../migrations/0005_rebuttal_contribution.sql")),
    ];

    for (name, sql) in ddl_scripts {
        match sqlx::raw_sql(sql).execute(pool).await {
            Ok(_) => tracing::info!("Migración {} lista", name),
            Err(e) => tracing::warn!("Aviso en migración {}: {}", name, e),
        }
    }

    tracing::info!("Base de datos lista");
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
