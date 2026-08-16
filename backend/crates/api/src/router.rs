use axum::{
    extract::Request,
    http::{header, HeaderValue, Method},
    middleware::{from_fn, Next},
    response::Response,
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::handlers::{auth, claims, evidence, health, members, rebuttals};
use crate::ratelimit::{self, RateLimiter};

/// Middleware para inyectar cabeceras defensivas de seguridad HTTP (CSP, nosniff, DENY, etc.)
async fn security_headers_middleware(req: Request, next: Next) -> Response {
    let mut res = next.run(req).await;
    let headers = res.headers_mut();

    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';",
        ),
    );
    headers.insert(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );

    res
}

/// Construye el router de la aplicación HTTP de Axum con soporte CORS estricto,
/// cabeceras de seguridad HTTP, rate limiting y trazado.
pub fn build_router(pool: PgPool) -> Router {
    // Configuración estricta de CORS sin fallback permisivo
    let cors = if let Ok(origin) = std::env::var("CORS_ALLOWED_ORIGIN") {
        let trimmed = origin.trim();
        if trimmed == "*" {
            CorsLayer::permissive()
        } else if !trimmed.is_empty() {
            let parsed = trimmed
                .parse::<HeaderValue>()
                .expect("CORS_ALLOWED_ORIGIN debe ser una URL válida");
            CorsLayer::new()
                .allow_origin(parsed)
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS, Method::PUT, Method::DELETE])
                .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT])
        } else {
            // Vacío -> Restrictivo (rechaza orígenes cruzados desconocidos)
            CorsLayer::new()
        }
    } else {
        // No configurado -> Restrictivo por defecto
        CorsLayer::new()
    };

    let limiter = RateLimiter::new();

    Router::new()
        // Health
        .route("/health", get(health::health_check))
        // Auth seudónima
        .route("/auth/register", post(auth::register_member))
        // Miembros y Perfil de Comunidad
        .route("/members/:identifier", get(members::get_member_profile))
        // Claims
        .route("/claims", get(claims::list_claims).post(claims::create_claim))
        .route("/claims/:id", get(claims::get_claim))
        .route("/claims/:id/assertions", post(claims::decompose_claim))
        // Evidence & Cascada
        .route("/assertions/:id/evidence", post(evidence::add_evidence))
        // Retractación con rastro (solo autor)
        .route("/evidence/:id/retract", post(evidence::retract_evidence).delete(evidence::retract_evidence))
        .route("/evidence/:id", axum::routing::delete(evidence::retract_evidence))
        .route("/assertions/:id/retract", post(claims::retract_assertion).delete(claims::retract_assertion))
        .route("/assertions/:id", axum::routing::delete(claims::retract_assertion))
        // Rebuttals
        .route("/rebuttals", get(rebuttals::list_rebuttals))
        .route(
            "/claims/:id/rebuttal",
            post(rebuttals::publish_rebuttal).delete(rebuttals::retract_rebuttal),
        )
        .route(
            "/claims/:id/rebuttal/retract",
            post(rebuttals::retract_rebuttal).delete(rebuttals::retract_rebuttal),
        )
        // Middlewares defensivos
        .layer(from_fn(move |req, next| {
            let lim = limiter.clone();
            ratelimit::rate_limit_middleware(lim, req, next)
        }))
        .layer(from_fn(security_headers_middleware))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool)
}
