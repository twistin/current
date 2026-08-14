pub mod assertion;
pub mod claim;
pub mod claim_variant;
pub mod contribution;
pub mod evidence;
pub mod member;
pub mod rebuttal;
pub mod source;

// Re-exportaciones de conveniencia
pub use assertion::{Assertion, AssertionStatus};
pub use claim::{Claim, ClaimKind, ClaimStatus, ClaimVerdict};
pub use claim_variant::ClaimVariant;
pub use contribution::{Contribution, ContributionOutcome, ContributionTargetType};
pub use evidence::{Evidence, EvidenceStance, EvidenceStrength};
pub use member::Member;
pub use rebuttal::{Rebuttal, RebuttalStatus};
pub use source::{Source, SourceKind, SourceReliability};
