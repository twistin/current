use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Estado del desmentido.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RebuttalStatus {
    Draft,
    Published,
}

/// Desmentido publicable. Solo puede existir si el bulo tiene veredicto
/// y cadena de evidencia completa.
///
/// Referencia directamente a `claim`, no a `assertion`.
/// El desmentido es el producto final: cada persona lo adapta con su voz
/// (principio 3 del maestro — gotas distintas, misma corriente).
/// Ver `doc/current-modelo-de-datos.md §1 — rebuttal`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rebuttal {
    pub id: Uuid,
    /// FK → claim. El desmentido va contra el bulo, no contra una afirmación concreta.
    pub claim_id: Uuid,
    /// Texto base con enlaces a la cadena de fuentes.
    /// Cada persona adapta este texto con su voz al difundirlo.
    pub base_text: String,
    pub published_at: Option<DateTime<Utc>>,
    pub status: RebuttalStatus,
}
