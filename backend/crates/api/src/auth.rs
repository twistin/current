use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use current_domain::entities::Member;
use current_persistence::repos::member_repo::MemberRepo;
use hex::encode;
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::PgPool;

pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    encode(hasher.finalize())
}

pub struct AuthenticatedMember(pub Member);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedMember
where
    PgPool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let pool = PgPool::from_ref(state);

        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|val| val.to_str().ok());

        let raw_token = match auth_header {
            Some(header_val) if header_val.starts_with("Bearer ") => {
                header_val.trim_start_matches("Bearer ").trim()
            }
            _ => {
                let body = Json(json!({
                    "error": "unauthorized",
                    "details": "Se requiere el header 'Authorization: Bearer <token>'"
                }));
                return Err((StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        if raw_token.is_empty() {
            let body = Json(json!({
                "error": "unauthorized",
                "details": "El token de autorización está vacío"
            }));
            return Err((StatusCode::UNAUTHORIZED, body).into_response());
        }

        let token_hash = hash_token(raw_token);
        let member_repo = MemberRepo::new(pool);

        match member_repo.find_by_auth_ref(&token_hash).await {
            Ok(Some(member)) => Ok(AuthenticatedMember(member)),
            Ok(None) => {
                let body = Json(json!({
                    "error": "unauthorized",
                    "details": "Token inválido o no registrado"
                }));
                Err((StatusCode::UNAUTHORIZED, body).into_response())
            }
            Err(e) => {
                let body = Json(json!({
                    "error": "internal_error",
                    "details": format!("Error de base de datos en autenticación: {}", e)
                }));
                Err((StatusCode::INTERNAL_SERVER_ERROR, body).into_response())
            }
        }
    }
}
