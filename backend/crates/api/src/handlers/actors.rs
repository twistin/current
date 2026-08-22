use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// 1. Modelos de Datos (Serde + SQLx)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ActorSummary {
    pub id: Uuid,
    pub name: String,
    pub actor_type: String,
    pub reputation_score: f64,
    pub total_traces: i64,
    pub last_detected_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ForensicTrace {
    pub id: Uuid,
    pub actor_id: Uuid,
    pub claim_title: String,
    pub forensic_summary: String,
    pub detected_at: DateTime<Utc>,
    pub platform: String,
    pub source_url: String,
    pub verdict: String,
    pub penalty_score: f64,
    pub verified_by_nodes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActorDetailData {
    pub id: Uuid,
    pub name: String,
    pub actor_type: String,
    pub reputation_score: f64,
    pub first_seen_at: DateTime<Utc>,
    pub last_updated_at: DateTime<Utc>,
    pub network_reach_estimate: Option<String>,
    pub coordinated_campaigns: i32,
    pub traces: Vec<ForensicTrace>,
}

#[derive(Debug, FromRow)]
struct RawActorRow {
    pub id: Uuid,
    pub name: String,
    pub actor_type: String,
    pub reputation_score: f64,
    pub coordinated_campaigns: i32,
    pub network_reach_estimate: Option<String>,
    pub first_seen_at: DateTime<Utc>,
    pub last_updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// 2. Handlers de Axum
// ---------------------------------------------------------------------------

/// GET /api/actors/radar
/// Devuelve la lista priorizada de actores por criticidad de amenaza con total de trazas.
pub async fn get_radar_actors(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<ActorSummary>>, (StatusCode, Json<serde_json::Value>)> {
    let query = r#"
        SELECT 
            a.id,
            a.name,
            a.actor_type,
            a.reputation_score,
            COALESCE(COUNT(f.id), 0)::BIGINT AS total_traces,
            MAX(f.detected_at) AS last_detected_at
        FROM actors a
        LEFT JOIN forensic_traces f ON a.id = f.actor_id
        GROUP BY a.id, a.name, a.actor_type, a.reputation_score
        ORDER BY a.reputation_score ASC, a.name ASC
    "#;

    let actors = sqlx::query_as::<_, ActorSummary>(query)
        .fetch_all(&pool)
        .await
        .map_err(|err| {
            tracing::error!("Error al consultar radar de actores: {:?}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Error interno al consultar el radar de actores" })),
            )
        })?;

    Ok(Json(actors))
}

/// GET /api/actors/:id
/// Devuelve el expediente detallado del actor con todas sus trazas forenses auditadas.
pub async fn get_actor_dossier(
    State(pool): State<PgPool>,
    Path(actor_id): Path<Uuid>,
) -> Result<Json<ActorDetailData>, (StatusCode, Json<serde_json::Value>)> {
    // 1. Consultar el actor principal
    let actor_query = r#"
        SELECT 
            id,
            name,
            actor_type,
            reputation_score,
            coordinated_campaigns,
            network_reach_estimate,
            first_seen_at,
            last_updated_at
        FROM actors
        WHERE id = $1
    "#;

    let actor = sqlx::query_as::<_, RawActorRow>(actor_query)
        .bind(actor_id)
        .fetch_optional(&pool)
        .await
        .map_err(|err| {
            tracing::error!("Error al consultar actor {}: {:?}", actor_id, err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Error de base de datos al consultar el expediente" })),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": format!("Actor con ID {} no encontrado en el sistema", actor_id) })),
            )
        })?;

    // 2. Consultar las trazas forenses asociadas ordenadas cronológicamente
    let traces_query = r#"
        SELECT 
            id,
            actor_id,
            claim_title,
            forensic_summary,
            detected_at,
            platform,
            source_url,
            verdict,
            penalty_score,
            verified_by_nodes
        FROM forensic_traces
        WHERE actor_id = $1
        ORDER BY detected_at DESC
    "#;

    let traces = sqlx::query_as::<_, ForensicTrace>(traces_query)
        .bind(actor_id)
        .fetch_all(&pool)
        .await
        .map_err(|err| {
            tracing::error!("Error al consultar trazas del actor {}: {:?}", actor_id, err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Error interno al consultar las trazas forenses" })),
            )
        })?;

    let dossier = ActorDetailData {
        id: actor.id,
        name: actor.name,
        actor_type: actor.actor_type,
        reputation_score: actor.reputation_score,
        first_seen_at: actor.first_seen_at,
        last_updated_at: actor.last_updated_at,
        network_reach_estimate: actor.network_reach_estimate,
        coordinated_campaigns: actor.coordinated_campaigns,
        traces,
    };

    Ok(Json(dossier))
}
