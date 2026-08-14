use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Tipo de objeto al que apunta una contribución.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContributionTargetType {
    Assertion,
    Source,
    Evidence,
}

/// Resultado de la evaluación de la contribución.
///
/// - `Held`: la aportación se mantuvo válida → sube `rigor_score`.
/// - `Overturned`: se revocó → baja `rigor_score`.
///
/// `None` mientras la contribución no ha sido evaluada.
/// La reputación pondera pero NUNCA sustituye a la evidencia (§5 del modelo).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContributionOutcome {
    Held,
    Overturned,
}

/// Traza de aportaciones de un miembro.
///
/// Sirve para dos cosas:
/// 1. Calcular `member.rigor_score` (reputación por rigor).
/// 2. Trazabilidad anti-captura: toda contribución queda registrada
///    con su resultado, evitando que nadie cierre veredictos que la cadena no sostiene.
/// Ver `doc/current-modelo-de-datos.md §1 — contribution` y `§5`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Contribution {
    pub id: Uuid,
    pub member_id: Uuid,
    pub target_type: ContributionTargetType,
    /// UUID del assertion, source o evidence aportado.
    pub target_id: Uuid,
    pub created_at: DateTime<Utc>,
    /// `None` hasta que la contribución se evalúa.
    pub outcome: Option<ContributionOutcome>,
}
