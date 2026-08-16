use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Estado de una afirmación. DERIVADO — no escribir directamente.
///
/// Calculado por `derive_assertion_status()` a partir del conjunto de `Evidence`.
/// Se recalcula cada vez que se añade o modifica evidencia.
/// Ver `doc/current-modelo-de-datos.md §3 y §4`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AssertionStatus {
    /// Sin evidencia aún.
    Unverified,
    /// Evidencia `supports` supera a `refutes` por encima del umbral.
    Supported,
    /// Evidencia `refutes` supera a `supports` por encima del umbral.
    Refuted,
    /// Evidencia sólida en ambos sentidos sin predominio claro.
    Contested,
}

/// Afirmación verificable extraída del bulo.
///
/// Cuelga de `Claim`, NO de `Rebuttal`. La afirmación es la unidad de verificación;
/// el rebuttal se produce después, cuando el bulo ya tiene veredicto.
///
/// Las afirmaciones con `is_load_bearing = true` determinan el veredicto del bulo.
/// Ver `doc/current-modelo-de-datos.md §1 — assertion`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Assertion {
    pub id: Uuid,
    /// FK → claim. La afirmación cuelga del bulo.
    pub claim_id: Uuid,
    pub text: String,
    /// Si es `true`, el veredicto del bulo depende del estado de esta afirmación.
    /// Una sola afirmación clave `Refuted` puede hacer el bulo `False`.
    pub is_load_bearing: bool,
    /// DERIVADO por `derive_assertion_status()`. No escribir directamente.
    pub status: AssertionStatus,
    pub created_by: Uuid,
    /// Retractación con rastro: fecha en la que el autor retiró la afirmación de buena fe
    pub retracted_at: Option<DateTime<Utc>>,
    /// ID del autor que retiró la afirmación
    pub retracted_by: Option<Uuid>,
}

impl Assertion {
    pub fn is_retracted(&self) -> bool {
        self.retracted_at.is_some()
    }
}
