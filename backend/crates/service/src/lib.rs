pub mod error;
pub mod verification_service;

pub use error::ServiceError;
pub use verification_service::{
    AddEvidenceResult, NewAssertionInput, NewSourceInput, VerificationService,
};
