use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use tower_http::trace::TraceLayer;

use crate::handlers::{auth, claims, evidence, health, rebuttals};

/// Construye el router de la aplicación HTTP de Axum.
///
/// Rutas del MVP:
/// - `GET  /health`                — estado del servidor
/// - `POST /auth/register`         — registro seudónimo (devuelve token opaco)
/// - `GET  /claims`                — cola de trabajo priorizada por propagation_score
/// - `POST /claims`                — reportar nuevo bulo emergente [Autenticado]
/// - `GET  /claims/:id`            — detalle de la sala de verificación (bulo + afirmaciones + veredicto)
/// - `POST /claims/:id/assertions` — descomponer bulo en afirmaciones [Autenticado]
/// - `POST /assertions/:id/evidence` — añadir evidencia con cascada automática [Autenticado]
/// - `POST /claims/:id/rebuttal`   — publicar desmentido (409 Conflict si veredicto es 'unproven') [Autenticado]
pub fn build_router(pool: PgPool) -> Router {
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
        // Middleware de trazado HTTP
        .layer(TraceLayer::new_for_http())
        .with_state(pool)
}
