use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use current_persistence::repos::member_repo::MemberRepo;
use serde_json::json;
use sqlx::PgPool;

/// GET /members/:identifier
/// Devuelve el perfil seudónimo de un miembro (por UUID o por @seudónimo),
/// incluyendo estadísticas agregadas y su historial de afirmaciones y evidencias.
pub async fn get_member_profile(
    State(pool): State<PgPool>,
    Path(identifier): Path<String>,
) -> Response {
    let repo = MemberRepo::new(pool);
    let member = match repo.find_by_identifier(&identifier).await {
        Ok(Some(m)) => m,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": "member_not_found",
                    "details": format!("No se encontró al miembro '{}'", identifier)
                })),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "database_error",
                    "details": e.to_string()
                })),
            )
                .into_response();
        }
    };

    match repo.get_member_profile(member.id).await {
        Ok(Some(profile)) => (StatusCode::OK, Json(profile)).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "member_not_found",
                "details": "No se encontraron datos de perfil para el miembro"
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "database_error",
                "details": e.to_string()
            })),
        )
            .into_response(),
    }
}
