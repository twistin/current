use axum::{
    http::{header, HeaderValue, Method},
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::handlers::{auth, claims, evidence, health, rebuttals};

/// Construye el router de la aplicación HTTP de Axum con soporte CORS y trazado.
pub fn build_router(pool: PgPool) -> Router {
    // Configuración dinámica de CORS
    let cors = if let Ok(origin) = std::env::var("CORS_ALLOWED_ORIGIN") {
        if origin == "*" {
            CorsLayer::permissive()
        } else {
            let parsed = origin
                .parse::<HeaderValue>()
                .expect("CORS_ALLOWED_ORIGIN debe ser una URL válida");
            CorsLayer::new()
                .allow_origin(parsed)
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS, Method::PUT, Method::DELETE])
                .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT])
        }
    } else {
        CorsLayer::permissive()
    };

    Router::new()
        // Health
        .route("/health", get(health::health_check))
        // Auth seudónima
        .route("/auth/register", post(auth::register_member))
        // Claims
        .route("/claims", get(claims::list_claims).post(claims::create_claim))
        .route("/claims/:id", get(claims::get_claim))
        .route("/claims/:id/assertions", post(claims::decompose_claim))
        // Evidence & Cascada
        .route("/assertions/:id/evidence", post(evidence::add_evidence))
        // Rebuttals
        .route("/rebuttals", get(rebuttals::list_rebuttals))
        .route("/claims/:id/rebuttal", post(rebuttals::publish_rebuttal))
        // Middlewares
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool)
}
