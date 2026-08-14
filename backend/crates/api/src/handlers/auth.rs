use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::Utc;
use current_domain::entities::Member;
use current_persistence::repos::member_repo::MemberRepo;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::hash_token;

#[derive(Debug, Deserialize)]
pub struct RegisterMemberPayload {
    pub pseudonym: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterMemberResponse {
    pub member_id: Uuid,
    pub pseudonym: String,
    pub token: String,
}

/// POST /auth/register
/// Registra una persona seudónima y genera un token opaco transparente una sola vez.
/// En la base de datos se almacena únicamente el hash SHA-256 (sin PII).
pub async fn register_member(
    State(pool): State<PgPool>,
    Json(payload): Json<RegisterMemberPayload>,
) -> impl IntoResponse {
    let pseudonym = payload.pseudonym.trim();
    if pseudonym.is_empty() {
        let body = Json(json!({
            "error": "validation_error",
            "details": "El seudónimo no puede estar vacío"
        }));
        return (StatusCode::BAD_REQUEST, body).into_response();
    }

    let member_repo = MemberRepo::new(pool);

    // Verificar si el seudónimo ya existe
    match member_repo.find_by_pseudonym(pseudonym).await {
        Ok(Some(_)) => {
            let body = Json(json!({
                "error": "conflict",
                "details": "El seudónimo ya está registrado"
            }));
            return (StatusCode::CONFLICT, body).into_response();
        }
        Err(e) => {
            let body = Json(json!({
                "error": "internal_error",
                "details": e.to_string()
            }));
            return (StatusCode::INTERNAL_SERVER_ERROR, body).into_response();
        }
        _ => {}
    }

    let member_id = Uuid::new_v4();
    let raw_token = format!("current_tok_{}", Uuid::new_v4());
    let token_hash = hash_token(&raw_token);

    let member = Member {
        id: member_id,
        pseudonym: pseudonym.to_string(),
        created_at: Utc::now(),
        rigor_score: 0,
        auth_ref: Some(token_hash),
    };

    match member_repo.create(&member).await {
        Ok(created) => {
            let res = RegisterMemberResponse {
                member_id: created.id,
                pseudonym: created.pseudonym,
                token: raw_token,
            };
            (StatusCode::CREATED, Json(res)).into_response()
        }
        Err(e) => {
            let body = Json(json!({
                "error": "internal_error",
                "details": e.to_string()
            }));
            (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
        }
    }
}
