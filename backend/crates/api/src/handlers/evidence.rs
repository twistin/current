use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use current_domain::entities::{EvidenceStance, EvidenceStrength, SourceKind, SourceReliability};
use current_service::{NewSourceInput, VerificationService};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::AuthenticatedMember;
use crate::handlers::claims::map_service_error;

#[derive(Debug, Deserialize)]
pub struct AddEvidencePayload {
    pub source: SourcePayload,
    pub stance: EvidenceStance,
    pub strength: EvidenceStrength,
    pub rationale: String,
}

#[derive(Debug, Deserialize)]
pub struct SourcePayload {
    pub url: String,
    pub title: String,
    pub kind: SourceKind,
    pub reliability: SourceReliability,
    pub excerpt: Option<String>,
}

/// POST /assertions/:id/evidence
/// Añade evidencia y ejecuta la cascada completa (Assertion Status -> Claim Verdict). Requiere autenticación.
pub async fn add_evidence(
    State(pool): State<PgPool>,
    AuthenticatedMember(member): AuthenticatedMember,
    Path(assertion_id): Path<Uuid>,
    Json(payload): Json<AddEvidencePayload>,
) -> Response {
    let rationale = payload.rationale.trim();
    let url = payload.source.url.trim();
    let title = payload.source.title.trim();

    if rationale.is_empty() || url.is_empty() || title.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "Los campos 'rationale', 'source.url' y 'source.title' son obligatorios"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    let service = VerificationService::new(pool);
    let new_source = NewSourceInput {
        url: url.to_string(),
        title: title.to_string(),
        kind: payload.source.kind,
        reliability: payload.source.reliability,
        excerpt: payload.source.excerpt,
    };

    match service
        .add_evidence(
            assertion_id,
            new_source,
            payload.stance,
            payload.strength,
            rationale.to_string(),
            member.id,
        )
        .await
    {
        Ok(result) => (StatusCode::CREATED, Json(result)).into_response(),
        Err(e) => map_service_error(e),
    }
}
