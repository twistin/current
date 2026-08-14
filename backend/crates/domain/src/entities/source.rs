use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Tipo de fuente según su naturaleza.
/// Ver `doc/current-modelo-de-datos.md §1 — source`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Primary,
    Secondary,
    Official,
    Press,
    Academic,
    Other,
}

/// Fiabilidad de la fuente. Entra en el cálculo del peso de la evidencia.
///
/// `Disputed` produce peso cero: una fuente en disputa no mueve el estado
/// de una afirmación, aunque su postura sea fuerte.
/// Ver `doc/current-modelo-de-datos.md §4 — algoritmo de peso`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SourceReliability {
    High,
    Medium,
    Low,
    Disputed,
}

/// Fuente de evidencia referenciada en la cadena de verificación.
/// Ver `doc/current-modelo-de-datos.md §1 — source`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Source {
    pub id: Uuid,
    pub url: String,
    pub title: String,
    pub kind: SourceKind,
    pub reliability: SourceReliability,
    /// Extracto breve de la fuente. Respetar copyright.
    pub excerpt: Option<String>,
    pub added_by: Uuid,
    pub added_at: DateTime<Utc>,
}
