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
use crate::validation::{validate_evidence_rationale, validate_url};

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

    if title.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "El título de la fuente no puede estar vacío"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    if let Err(err_msg) = validate_evidence_rationale(rationale) {
        let body = Json(json!({
            "error": "validation_error",
            "details": err_msg
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    if let Err(err_msg) = validate_url(url) {
        let body = Json(json!({
            "error": "validation_error",
            "details": format!("URL de la fuente inválida: {}", err_msg)
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

/// POST /evidence/:id/retract o DELETE /evidence/:id
/// Retracta una evidencia preservando el rastro y recalculando la cascada. Requiere ser el autor.
pub async fn retract_evidence(
    State(pool): State<PgPool>,
    AuthenticatedMember(member): AuthenticatedMember,
    Path(evidence_id): Path<Uuid>,
) -> Response {
    let service = VerificationService::new(pool);
    match service.retract_evidence(evidence_id, member.id).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => map_service_error(e),
    }
}
