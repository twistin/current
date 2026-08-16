use current_persistence::error::PersistenceError;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Error de persistencia: {0}")]
    Persistence(#[from] PersistenceError),

    #[error("El bulo con ID {0} no fue encontrado")]
    ClaimNotFound(Uuid),

    #[error("La afirmación con ID {0} no fue encontrada")]
    AssertionNotFound(Uuid),

    #[error("La evidencia con ID {0} no fue encontrada")]
    EvidenceNotFound(Uuid),

    #[error("No autorizado: {0}")]
    Unauthorized(String),

    #[error("La aportación ya ha sido retirada previamente")]
    AlreadyRetracted,

    #[error("El desmentido no puede publicarse si el veredicto del bulo es 'unproven' o está incompleto")]
    CannotPublishUnprovenRebuttal,

    #[error("Toda evidencia exige un razonamiento explícito (rationale) no vacío")]
    EmptyRationale,

    #[error("El desmentido exige un texto base no vacío")]
    EmptyBaseText,
}
