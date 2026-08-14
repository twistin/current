use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Persona seudónima. Sin PII en el núcleo.
/// Ver `doc/current-modelo-de-datos.md §1 — member`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Member {
    pub id: Uuid,
    pub pseudonym: String,
    pub created_at: DateTime<Utc>,
    /// Reputación por rigor. Sube con `held`, baja con `overturned`.
    /// No mide bando ni actividad: mide si acierta y si se corrige.
    pub rigor_score: i32,
    /// Referencia opaca a credencial (hash de token OAuth, etc.).
    /// NUNCA contiene email, teléfono ni nombre real.
    pub auth_ref: Option<String>,
}
