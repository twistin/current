use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Postura de la evidencia frente a la afirmación.
///
/// `Contextualizes` añade contexto pero no entra en el balance
/// supports/refutes al calcular el estado de la afirmación.
/// Ver `doc/current-modelo-de-datos.md §4`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceStance {
    Supports,
    Refutes,
    Contextualizes,
}

/// Fuerza de la evidencia. Se combina con `SourceReliability` para calcular el peso.
///
/// Tabla de pesos (§4 del modelo de datos):
/// - High × Strong = 3.0
/// - Medium × Moderate = 1.5
/// - Low × Weak = 0.3
/// - Disputed (cualquier strength) = 0.0
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceStrength {
    Strong,
    Moderate,
    Weak,
}

/// Vínculo entre una afirmación y una fuente, con postura y fuerza.
///
/// Es el corazón del modelo: sin `stance` y `strength` es imposible
/// derivar el estado de una afirmación.
/// Ver `doc/current-modelo-de-datos.md §1 — evidence`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Evidence {
    pub id: Uuid,
    pub assertion_id: Uuid,
    pub source_id: Uuid,
    /// IMPRESCINDIBLE. Sin stance no se puede calcular el estado de la afirmación.
    pub stance: EvidenceStance,
    pub strength: EvidenceStrength,
    /// Por qué esta fuente apoya/refuta esta afirmación concreta.
    /// Obligatorio: el instrumento da el método, no el dictamen (principio 1).
    pub rationale: String,
    pub added_by: Uuid,
    pub added_at: DateTime<Utc>,
}
