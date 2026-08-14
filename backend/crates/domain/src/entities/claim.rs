use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Tipo de contenido del bulo.
/// Ver `doc/current-modelo-de-datos.md §1 — claim`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClaimKind {
    Text,
    Image,
    Video,
    Mixed,
}

/// Estado del proceso de verificación del bulo.
/// Máquina de estados: open → in_review → resolved.
/// Ver `doc/current-modelo-de-datos.md §3`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClaimStatus {
    Open,
    InReview,
    Resolved,
}

/// Veredicto del bulo. DERIVADO — no escribir directamente.
///
/// Valores exactos del modelo de datos:
/// - `False`: el bulo es falso (afirmaciones clave refutadas).
/// - `True`: el bulo resultó cierto — hay que poder admitirlo (rigor ante todo).
/// - `Misleading`: mezcla — algunas clave ciertas pero el conjunto engaña.
/// - `Unproven`: afirmaciones clave unverified o contested → NO se publica desmentido.
///
/// Nota: `False` y `True` son identificadores válidos en Rust (capitalizados).
/// Se mapean a los valores de PostgreSQL `'false'` y `'true'` respectivamente.
/// Ver `doc/current-modelo-de-datos.md §3`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ClaimVerdict {
    False,
    True,
    Misleading,
    Unproven,
}

/// Bulo reportado. El campo `verdict` es derivado y puede ser `None`
/// si el proceso de verificación no ha concluido.
/// Ver `doc/current-modelo-de-datos.md §1 — claim`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Claim {
    pub id: Uuid,
    pub summary: String,
    pub kind: ClaimKind,
    pub detected_at: DateTime<Utc>,
    /// Velocidad de propagación estimada. Prioriza la cola (principio 5 del maestro).
    pub propagation_score: i32,
    pub status: ClaimStatus,
    /// DERIVADO por `derive_claim_verdict()`. `None` hasta que se resuelve.
    pub verdict: Option<ClaimVerdict>,
    pub created_by: Uuid,
}
