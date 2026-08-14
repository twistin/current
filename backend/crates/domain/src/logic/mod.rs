//! Lógica de derivación de estados y veredictos.
//!
//! ⚠️  ZONA CRÍTICA
//! Un bug aquí produce desinformación desde la herramienta que la combate.
//! Ver `doc/current-logica-derivacion.md`.
//!
//! # Dos funciones:
//!
//! 1. `assertion_status::derive_assertion_status` — estado de una afirmación a partir de sus evidencias.
//! 2. `claim_verdict::derive_claim_verdict` — veredicto del bulo a partir de sus afirmaciones clave.
//!
//! Ambas son deterministas, reversibles y trazables.

pub mod assertion_status;
pub mod claim_verdict;

pub use assertion_status::{derive_assertion_status, DerivationConfig, EvidenceInput};
pub use claim_verdict::{
    derive_claim_verdict, derive_claim_verdict_from_statuses, KeyAssertionInput,
};
