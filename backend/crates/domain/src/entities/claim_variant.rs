use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Variante concreta del bulo en circulación en una plataforma.
/// Un mismo bulo puede tener múltiples variantes (mismo mensaje, distinto texto/imagen/idioma).
/// Ver `doc/current-modelo-de-datos.md §1 — claim_variant`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClaimVariant {
    pub id: Uuid,
    pub claim_id: Uuid,
    pub origin_url: String,
    pub platform: String,
    /// Código ISO 639-1 (ej: "es", "en", "pt").
    pub language: String,
    /// URL a captura/snapshot del post original.
    pub snapshot: Option<String>,
    pub seen_at: DateTime<Utc>,
}
