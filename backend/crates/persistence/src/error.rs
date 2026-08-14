/// Errores de la capa de persistencia.
#[derive(Debug, thiserror::Error)]
pub enum PersistenceError {
    #[error("Error de base de datos: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Registro no encontrado")]
    NotFound,
}
