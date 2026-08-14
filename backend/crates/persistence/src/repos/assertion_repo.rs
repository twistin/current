use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::{Assertion, AssertionStatus, EvidenceStance, EvidenceStrength, SourceReliability};
use current_domain::logic::EvidenceInput;

pub struct AssertionRepo {
    pool: PgPool,
}

fn assertion_status_to_str(status: AssertionStatus) -> &'static str {
    match status {
        AssertionStatus::Unverified => "unverified",
        AssertionStatus::Supported => "supported",
        AssertionStatus::Refuted => "refuted",
        AssertionStatus::Contested => "contested",
    }
}

fn str_to_assertion_status(s: &str) -> AssertionStatus {
    match s {
        "supported" => AssertionStatus::Supported,
        "refuted" => AssertionStatus::Refuted,
        "contested" => AssertionStatus::Contested,
        _ => AssertionStatus::Unverified,
    }
}

fn str_to_evidence_stance(s: &str) -> EvidenceStance {
    match s {
        "supports" => EvidenceStance::Supports,
        "refutes" => EvidenceStance::Refutes,
        _ => EvidenceStance::Contextualizes,
    }
}

fn str_to_evidence_strength(s: &str) -> EvidenceStrength {
    match s {
        "strong" => EvidenceStrength::Strong,
        "moderate" => EvidenceStrength::Moderate,
        _ => EvidenceStrength::Weak,
    }
}

fn str_to_source_reliability(s: &str) -> SourceReliability {
    match s {
        "high" => SourceReliability::High,
        "medium" => SourceReliability::Medium,
        "low" => SourceReliability::Low,
        _ => SourceReliability::Disputed,
    }
}

impl AssertionRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Assertion>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, claim_id, text, is_load_bearing, status::text, created_by
            FROM assertion
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let status_str: String = r.get("status");
            Assertion {
                id: r.get("id"),
                claim_id: r.get("claim_id"),
                text: r.get("text"),
                is_load_bearing: r.get("is_load_bearing"),
                status: str_to_assertion_status(&status_str),
                created_by: r.get("created_by"),
            }
        }))
    }

    pub async fn list_by_claim(&self, claim_id: Uuid) -> Result<Vec<Assertion>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, claim_id, text, is_load_bearing, status::text, created_by
            FROM assertion
            WHERE claim_id = $1
            ORDER BY id ASC
            "#,
        )
        .bind(claim_id)
        .fetch_all(&self.pool)
        .await?;

        let assertions = rows
            .into_iter()
            .map(|r| {
                let status_str: String = r.get("status");
                Assertion {
                    id: r.get("id"),
                    claim_id: r.get("claim_id"),
                    text: r.get("text"),
                    is_load_bearing: r.get("is_load_bearing"),
                    status: str_to_assertion_status(&status_str),
                    created_by: r.get("created_by"),
                }
            })
            .collect();

        Ok(assertions)
    }

    /// Lista solo las afirmaciones CLAVE (is_load_bearing = true) de un bulo.
    /// Necesario para alimentar derive_claim_verdict().
    pub async fn list_load_bearing_by_claim(
        &self,
        claim_id: Uuid,
    ) -> Result<Vec<Assertion>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, claim_id, text, is_load_bearing, status::text, created_by
            FROM assertion
            WHERE claim_id = $1 AND is_load_bearing = true
            ORDER BY id ASC
            "#,
        )
        .bind(claim_id)
        .fetch_all(&self.pool)
        .await?;

        let assertions = rows
            .into_iter()
            .map(|r| {
                let status_str: String = r.get("status");
                Assertion {
                    id: r.get("id"),
                    claim_id: r.get("claim_id"),
                    text: r.get("text"),
                    is_load_bearing: r.get("is_load_bearing"),
                    status: str_to_assertion_status(&status_str),
                    created_by: r.get("created_by"),
                }
            })
            .collect();

        Ok(assertions)
    }

    pub async fn create(&self, assertion: &Assertion) -> Result<Assertion, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO assertion (id, claim_id, text, is_load_bearing, status, created_by)
            VALUES ($1, $2, $3, $4, $5::assertion_status, $6)
            RETURNING id, claim_id, text, is_load_bearing, status::text, created_by
            "#,
        )
        .bind(assertion.id)
        .bind(assertion.claim_id)
        .bind(&assertion.text)
        .bind(assertion.is_load_bearing)
        .bind(assertion_status_to_str(assertion.status))
        .bind(assertion.created_by)
        .fetch_one(&self.pool)
        .await?;

        let status_str: String = row.get("status");

        Ok(Assertion {
            id: row.get("id"),
            claim_id: row.get("claim_id"),
            text: row.get("text"),
            is_load_bearing: row.get("is_load_bearing"),
            status: str_to_assertion_status(&status_str),
            created_by: row.get("created_by"),
        })
    }

    pub async fn update_status(
        &self,
        id: Uuid,
        status: AssertionStatus,
    ) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE assertion
            SET status = $2::assertion_status
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(assertion_status_to_str(status))
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            Err(PersistenceError::NotFound)
        } else {
            Ok(())
        }
    }

    pub async fn load_evidence_inputs(
        &self,
        assertion_id: Uuid,
    ) -> Result<Vec<EvidenceInput>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT e.stance::text, e.strength::text, s.reliability::text
            FROM evidence e
            JOIN source s ON e.source_id = s.id
            WHERE e.assertion_id = $1
            "#,
        )
        .bind(assertion_id)
        .fetch_all(&self.pool)
        .await?;

        let inputs = rows
            .into_iter()
            .map(|r| {
                let stance_str: String = r.get("stance");
                let strength_str: String = r.get("strength");
                let rel_str: String = r.get("reliability");
                EvidenceInput {
                    stance: str_to_evidence_stance(&stance_str),
                    strength: str_to_evidence_strength(&strength_str),
                    source_reliability: str_to_source_reliability(&rel_str),
                }
            })
            .collect();

        Ok(inputs)
    }
}
