use axum::Json;
use serde_json::{json, Value};

/// Único endpoint completamente funcional en el esqueleto.
/// Confirma que el servidor está vivo.
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "current-api"
    }))
}
