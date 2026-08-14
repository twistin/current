use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use current_service::VerificationService;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::AuthenticatedMember;
use crate::handlers::claims::map_service_error;

#[derive(Debug, Deserialize)]
pub struct PublishRebuttalPayload {
    pub base_text: String,
}

/// GET /rebuttals
/// Lista desmentidos publicados.
pub async fn list_rebuttals(State(_pool): State<PgPool>) -> Response {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({ "error": "not_implemented", "details": "Usar GET /claims/:id para ver el desmentido" })),
    )
        .into_response()
}

/// POST /claims/:id/rebuttal
/// Publica el desmentido verificando el invariante (devuelve 409 Conflict si el veredicto es 'unproven'). Requiere autenticación.
pub async fn publish_rebuttal(
    State(pool): State<PgPool>,
    AuthenticatedMember(member): AuthenticatedMember,
    Path(claim_id): Path<Uuid>,
    Json(payload): Json<PublishRebuttalPayload>,
) -> Response {
    let base_text = payload.base_text.trim();
    if base_text.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "El texto del desmentido ('base_text') no puede estar vacío"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    let service = VerificationService::new(pool);

    match service
        .publish_rebuttal(claim_id, base_text.to_string(), member.id)
        .await
    {
        Ok(rebuttal) => (StatusCode::OK, Json(rebuttal)).into_response(),
        Err(e) => map_service_error(e),
    }
}
