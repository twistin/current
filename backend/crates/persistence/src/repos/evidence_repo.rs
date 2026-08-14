use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::{Evidence, EvidenceStance, EvidenceStrength};

pub struct EvidenceRepo {
    pool: PgPool,
}

fn evidence_stance_to_str(stance: EvidenceStance) -> &'static str {
    match stance {
        EvidenceStance::Supports => "supports",
        EvidenceStance::Refutes => "refutes",
        EvidenceStance::Contextualizes => "contextualizes",
    }
}

fn str_to_evidence_stance(s: &str) -> EvidenceStance {
    match s {
        "supports" => EvidenceStance::Supports,
        "refutes" => EvidenceStance::Refutes,
        _ => EvidenceStance::Contextualizes,
    }
}

fn evidence_strength_to_str(strength: EvidenceStrength) -> &'static str {
    match strength {
        EvidenceStrength::Strong => "strong",
        EvidenceStrength::Moderate => "moderate",
        EvidenceStrength::Weak => "weak",
    }
}

fn str_to_evidence_strength(s: &str) -> EvidenceStrength {
    match s {
        "strong" => EvidenceStrength::Strong,
        "moderate" => EvidenceStrength::Moderate,
        _ => EvidenceStrength::Weak,
    }
}

impl EvidenceRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Evidence>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, assertion_id, source_id, stance::text, strength::text, rationale, added_by, added_at
            FROM evidence
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let stance_str: String = r.get("stance");
            let strength_str: String = r.get("strength");
            Evidence {
                id: r.get("id"),
                assertion_id: r.get("assertion_id"),
                source_id: r.get("source_id"),
                stance: str_to_evidence_stance(&stance_str),
                strength: str_to_evidence_strength(&strength_str),
                rationale: r.get("rationale"),
                added_by: r.get("added_by"),
                added_at: r.get("added_at"),
            }
        }))
    }

    /// Carga toda la evidencia vinculada a una afirmación.
    /// Esta lista alimenta directamente la función pura derive_assertion_status().
    pub async fn list_by_assertion(&self, assertion_id: Uuid) -> Result<Vec<Evidence>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, assertion_id, source_id, stance::text, strength::text, rationale, added_by, added_at
            FROM evidence
            WHERE assertion_id = $1
            ORDER BY added_at ASC
            "#,
        )
        .bind(assertion_id)
        .fetch_all(&self.pool)
        .await?;

        let list = rows
            .into_iter()
            .map(|r| {
                let stance_str: String = r.get("stance");
                let strength_str: String = r.get("strength");
                Evidence {
                    id: r.get("id"),
                    assertion_id: r.get("assertion_id"),
                    source_id: r.get("source_id"),
                    stance: str_to_evidence_stance(&stance_str),
                    strength: str_to_evidence_strength(&strength_str),
                    rationale: r.get("rationale"),
                    added_by: r.get("added_by"),
                    added_at: r.get("added_at"),
                }
            })
            .collect();

        Ok(list)
    }

    /// Registra una nueva evidencia vinculando una afirmación con una fuente.
    /// Exige rationale obligatorio (NOT NULL): la evidencia sin explicación no se acepta.
    pub async fn create(&self, evidence: &Evidence) -> Result<Evidence, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO evidence (id, assertion_id, source_id, stance, strength, rationale, added_by, added_at)
            VALUES ($1, $2, $3, $4::evidence_stance, $5::evidence_strength, $6, $7, $8)
            RETURNING id, assertion_id, source_id, stance::text, strength::text, rationale, added_by, added_at
            "#,
        )
        .bind(evidence.id)
        .bind(evidence.assertion_id)
        .bind(evidence.source_id)
        .bind(evidence_stance_to_str(evidence.stance))
        .bind(evidence_strength_to_str(evidence.strength))
        .bind(&evidence.rationale)
        .bind(evidence.added_by)
        .bind(evidence.added_at)
        .fetch_one(&self.pool)
        .await?;

        let stance_str: String = row.get("stance");
        let strength_str: String = row.get("strength");

        Ok(Evidence {
            id: row.get("id"),
            assertion_id: row.get("assertion_id"),
            source_id: row.get("source_id"),
            stance: str_to_evidence_stance(&stance_str),
            strength: str_to_evidence_strength(&strength_str),
            rationale: row.get("rationale"),
            added_by: row.get("added_by"),
            added_at: row.get("added_at"),
        })
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            DELETE FROM evidence WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            Err(PersistenceError::NotFound)
        } else {
            Ok(())
        }
    }
}
