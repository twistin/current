use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use current_domain::entities::{ClaimKind, Evidence, Source};
use current_persistence::repos::assertion_repo::AssertionRepo;
use current_persistence::repos::claim_repo::ClaimRepo;
use current_persistence::repos::evidence_repo::EvidenceRepo;
use current_persistence::repos::member_repo::MemberRepo;
use current_persistence::repos::source_repo::SourceRepo;
use current_service::{NewAssertionInput, ServiceError, VerificationService};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::AuthenticatedMember;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CreateClaimPayload {
    pub summary: String,
    pub kind: ClaimKind,
    pub propagation_score: Option<i32>,
    pub origin_url: String,
    pub platform: String,
    pub language: String,
    pub snapshot: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DecomposeClaimPayload {
    pub assertions: Vec<NewAssertionPayload>,
}

#[derive(Debug, Deserialize)]
pub struct NewAssertionPayload {
    pub text: String,
    pub is_load_bearing: bool,
}

#[derive(Debug, Serialize)]
pub struct AssertionWithEvidence {
    pub id: Uuid,
    pub claim_id: Uuid,
    pub text: String,
    pub is_load_bearing: bool,
    pub status: String,
    pub created_by: Uuid,
    pub created_by_pseudonym: String,
    pub evidence: Vec<EvidenceWithSource>,
}

#[derive(Debug, Serialize)]
pub struct EvidenceWithSource {
    pub evidence: Evidence,
    pub source: Option<Source>,
    pub added_by_pseudonym: String,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /claims
/// Reporta un nuevo bulo emergente con su primera variante. Requiere autenticación.
pub async fn create_claim(
    State(pool): State<PgPool>,
    AuthenticatedMember(member): AuthenticatedMember,
    Json(payload): Json<CreateClaimPayload>,
) -> Response {
    let summary = payload.summary.trim();
    let origin_url = payload.origin_url.trim();
    let platform = payload.platform.trim();

    if summary.is_empty() || origin_url.is_empty() || platform.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "Los campos 'summary', 'origin_url' y 'platform' son obligatorios"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    let service = VerificationService::new(pool);
    let propagation_score = payload.propagation_score.unwrap_or(50);

    match service
        .report_claim(
            summary.to_string(),
            payload.kind,
            propagation_score,
            origin_url.to_string(),
            platform.to_string(),
            payload.language,
            payload.snapshot,
            member.id,
        )
        .await
    {
        Ok((claim, variant)) => {
            let body = Json(json!({
                "claim": claim,
                "variant": variant
            }));
            (StatusCode::CREATED, body).into_response()
        }
        Err(e) => map_service_error(e),
    }
}

/// GET /claims
/// Lista los bulos priorizados por propagation_score desc (la cola de trabajo).
pub async fn list_claims(State(pool): State<PgPool>) -> Response {
    let claim_repo = ClaimRepo::new(pool);
    match claim_repo.list_prioritized().await {
        Ok(claims) => (StatusCode::OK, Json(claims)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "internal_error", "details": e.to_string() })),
        )
            .into_response(),
    }
}

/// GET /claims/:id
/// Detalle del bulo con sus afirmaciones, evidencias y veredicto derivado (vista de la sala de verificación).
pub async fn get_claim(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Response {
    let claim_repo = ClaimRepo::new(pool.clone());
    let assertion_repo = AssertionRepo::new(pool.clone());
    let evidence_repo = EvidenceRepo::new(pool.clone());
    let source_repo = SourceRepo::new(pool.clone());
    let member_repo = MemberRepo::new(pool);

    let claim = match claim_repo.find_by_id(id).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            let body = Json(json!({
                "error": "not_found",
                "details": format!("El bulo con ID {} no existe", id)
            }));
            return (StatusCode::NOT_FOUND, body).into_response();
        }
        Err(e) => {
            let body = Json(json!({ "error": "internal_error", "details": e.to_string() }));
            return (StatusCode::INTERNAL_SERVER_ERROR, body).into_response();
        }
    };

    let assertions = match assertion_repo.list_by_claim(id).await {
        Ok(list) => list,
        Err(e) => {
            let body = Json(json!({ "error": "internal_error", "details": e.to_string() }));
            return (StatusCode::INTERNAL_SERVER_ERROR, body).into_response();
        }
    };

    let mut detailed_assertions = Vec::new();
    for a in assertions {
        let assertion_author = member_repo
            .find_by_id(a.created_by)
            .await
            .ok()
            .flatten()
            .map(|m| m.pseudonym)
            .unwrap_or_else(|| "anon".to_string());

        let evidence_list = evidence_repo.list_by_assertion(a.id).await.unwrap_or_default();
        let mut evidence_with_sources = Vec::new();

        for ev in evidence_list {
            let source = source_repo.find_by_id(ev.source_id).await.ok().flatten();
            let added_by_pseudo = member_repo
                .find_by_id(ev.added_by)
                .await
                .ok()
                .flatten()
                .map(|m| m.pseudonym)
                .unwrap_or_else(|| "anon".to_string());

            evidence_with_sources.push(EvidenceWithSource {
                evidence: ev,
                source,
                added_by_pseudonym: added_by_pseudo,
            });
        }

        detailed_assertions.push(AssertionWithEvidence {
            id: a.id,
            claim_id: a.claim_id,
            text: a.text,
            is_load_bearing: a.is_load_bearing,
            status: format!("{:?}", a.status).to_lowercase(),
            created_by: a.created_by,
            created_by_pseudonym: assertion_author,
            evidence: evidence_with_sources,
        });
    }

    let body = Json(json!({
        "claim": claim,
        "assertions": detailed_assertions
    }));

    (StatusCode::OK, body).into_response()
}

/// POST /claims/:id/assertions
/// Descompone un bulo en afirmaciones verificables. Requiere autenticación.
pub async fn decompose_claim(
    State(pool): State<PgPool>,
    AuthenticatedMember(member): AuthenticatedMember,
    Path(id): Path<Uuid>,
    Json(payload): Json<DecomposeClaimPayload>,
) -> Response {
    if payload.assertions.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "La lista de afirmaciones no puede estar vacía"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    for a in &payload.assertions {
        if a.text.trim().is_empty() {
            let body = Json(json!({
                "error": "validation_error",
                "details": "El texto de cada afirmación no puede estar vacío"
            }));
            return (StatusCode::BAD_REQUEST, body).into_response();
        }
    }

    let service = VerificationService::new(pool);
    let inputs: Vec<NewAssertionInput> = payload
        .assertions
        .into_iter()
        .map(|a| NewAssertionInput {
            text: a.text.trim().to_string(),
            is_load_bearing: a.is_load_bearing,
        })
        .collect();

    match service.decompose_claim(id, inputs, member.id).await {
        Ok(assertions) => (StatusCode::CREATED, Json(assertions)).into_response(),
        Err(e) => map_service_error(e),
    }
}

pub fn map_service_error(err: ServiceError) -> Response {
    match err {
        ServiceError::ClaimNotFound(id) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "not_found", "details": format!("Bulo {} no encontrado", id) })),
        )
            .into_response(),
        ServiceError::AssertionNotFound(id) => (
            StatusCode::NOT_FOUND,
            Json(
                json!({ "error": "not_found", "details": format!("Afirmación {} no encontrada", id) }),
            ),
        )
            .into_response(),
        ServiceError::CannotPublishUnprovenRebuttal => (
            StatusCode::CONFLICT,
            Json(json!({
                "error": "conflict",
                "details": "El desmentido no puede publicarse si el veredicto del bulo es 'unproven' o está incompleto"
            })),
        )
            .into_response(),
        ServiceError::EmptyRationale => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "validation_error",
                "details": "Toda evidencia exige una justificación explicativa (rationale) no vacía"
            })),
        )
            .into_response(),
        ServiceError::EmptyBaseText => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "validation_error",
                "details": "El desmentido exige un texto base no vacío"
            })),
        )
            .into_response(),
        ServiceError::Persistence(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "internal_error", "details": e.to_string() })),
        )
            .into_response(),
    }
}
