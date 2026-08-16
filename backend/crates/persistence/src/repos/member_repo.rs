use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashSet;
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::Member;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberAssertionActivity {
    pub id: Uuid,
    pub claim_id: Uuid,
    pub text: String,
    pub is_load_bearing: bool,
    pub status: String,
    pub claim_summary: String,
    pub claim_verdict: Option<String>,
    pub outcome: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberEvidenceActivity {
    pub id: Uuid,
    pub assertion_id: Uuid,
    pub stance: String,
    pub strength: String,
    pub rationale: String,
    pub added_at: DateTime<Utc>,
    pub source_title: String,
    pub source_url: String,
    pub source_reliability: String,
    pub assertion_text: String,
    pub claim_id: Uuid,
    pub claim_summary: String,
    pub claim_verdict: Option<String>,
    pub outcome: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberStats {
    pub total_contributions: usize,
    pub claims_participated: usize,
    pub assertions_count: usize,
    pub evidence_count: usize,
    pub held_count: usize,
    pub overturned_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberProfileData {
    pub member: Member,
    pub stats: MemberStats,
    pub assertions: Vec<MemberAssertionActivity>,
    pub evidence: Vec<MemberEvidenceActivity>,
}

pub struct MemberRepo {
    pool: PgPool,
}

impl MemberRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Member>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, pseudonym, created_at, rigor_score, auth_ref
            FROM member
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Member {
            id: r.get("id"),
            pseudonym: r.get("pseudonym"),
            created_at: r.get("created_at"),
            rigor_score: r.get("rigor_score"),
            auth_ref: r.get("auth_ref"),
        }))
    }

    pub async fn find_by_pseudonym(&self, pseudonym: &str) -> Result<Option<Member>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, pseudonym, created_at, rigor_score, auth_ref
            FROM member
            WHERE LOWER(pseudonym) = LOWER($1)
            "#,
        )
        .bind(pseudonym)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Member {
            id: r.get("id"),
            pseudonym: r.get("pseudonym"),
            created_at: r.get("created_at"),
            rigor_score: r.get("rigor_score"),
            auth_ref: r.get("auth_ref"),
        }))
    }

    pub async fn find_by_identifier(&self, identifier: &str) -> Result<Option<Member>, PersistenceError> {
        let trimmed = identifier.trim().trim_start_matches('@');
        if let Ok(id) = Uuid::parse_str(trimmed) {
            if let Some(m) = self.find_by_id(id).await? {
                return Ok(Some(m));
            }
        }
        self.find_by_pseudonym(trimmed).await
    }

    pub async fn find_by_auth_ref(&self, auth_ref: &str) -> Result<Option<Member>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, pseudonym, created_at, rigor_score, auth_ref
            FROM member
            WHERE auth_ref = $1
            "#,
        )
        .bind(auth_ref)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Member {
            id: r.get("id"),
            pseudonym: r.get("pseudonym"),
            created_at: r.get("created_at"),
            rigor_score: r.get("rigor_score"),
            auth_ref: r.get("auth_ref"),
        }))
    }

    pub async fn create(&self, member: &Member) -> Result<Member, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO member (id, pseudonym, created_at, rigor_score, auth_ref)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, pseudonym, created_at, rigor_score, auth_ref
            "#,
        )
        .bind(member.id)
        .bind(&member.pseudonym)
        .bind(member.created_at)
        .bind(member.rigor_score)
        .bind(&member.auth_ref)
        .fetch_one(&self.pool)
        .await?;

        Ok(Member {
            id: row.get("id"),
            pseudonym: row.get("pseudonym"),
            created_at: row.get("created_at"),
            rigor_score: row.get("rigor_score"),
            auth_ref: row.get("auth_ref"),
        })
    }

    /// Actualiza rigor_score. Se llama al evaluar una Contribution (held/overturned).
    /// La reputación pondera pero NUNCA sustituye a la cadena de evidencia (§5 del modelo).
    pub async fn update_rigor_score(&self, id: Uuid, delta: i32) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE member
            SET rigor_score = rigor_score + $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(delta)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            Err(PersistenceError::NotFound)
        } else {
            Ok(())
        }
    }

    /// Obtiene el perfil completo y el historial de actividad de un miembro.
    pub async fn get_member_profile(&self, member_id: Uuid) -> Result<Option<MemberProfileData>, PersistenceError> {
        let member = match self.find_by_id(member_id).await? {
            Some(m) => m,
            None => return Ok(None),
        };

        // 1. Cargar afirmaciones planteadas por el miembro
        let assertion_rows = sqlx::query(
            r#"
            SELECT a.id, a.claim_id, a.text, a.is_load_bearing, a.status::text AS status,
                   c.summary AS claim_summary, c.verdict::text AS claim_verdict,
                   con.outcome::text AS outcome
            FROM assertion a
            JOIN claim c ON a.claim_id = c.id
            LEFT JOIN contribution con ON con.target_type = 'assertion' AND con.target_id = a.id
            WHERE a.created_by = $1
            ORDER BY a.id DESC
            "#,
        )
        .bind(member_id)
        .fetch_all(&self.pool)
        .await?;

        let assertions: Vec<MemberAssertionActivity> = assertion_rows
            .into_iter()
            .map(|r| MemberAssertionActivity {
                id: r.get("id"),
                claim_id: r.get("claim_id"),
                text: r.get("text"),
                is_load_bearing: r.get("is_load_bearing"),
                status: r.get("status"),
                claim_summary: r.get("claim_summary"),
                claim_verdict: r.get("claim_verdict"),
                outcome: r.get("outcome"),
            })
            .collect();

        // 2. Cargar evidencias aportadas por el miembro
        let evidence_rows = sqlx::query(
            r#"
            SELECT e.id, e.assertion_id, e.stance::text AS stance, e.strength::text AS strength,
                   e.rationale, e.added_at,
                   s.title AS source_title, s.url AS source_url, s.reliability::text AS source_reliability,
                   a.text AS assertion_text, a.claim_id,
                   c.summary AS claim_summary, c.verdict::text AS claim_verdict,
                   con.outcome::text AS outcome
            FROM evidence e
            JOIN source s ON e.source_id = s.id
            JOIN assertion a ON e.assertion_id = a.id
            JOIN claim c ON a.claim_id = c.id
            LEFT JOIN contribution con ON con.target_type = 'evidence' AND con.target_id = e.id
            WHERE e.added_by = $1
            ORDER BY e.added_at DESC
            "#,
        )
        .bind(member_id)
        .fetch_all(&self.pool)
        .await?;

        let evidence: Vec<MemberEvidenceActivity> = evidence_rows
            .into_iter()
            .map(|r| MemberEvidenceActivity {
                id: r.get("id"),
                assertion_id: r.get("assertion_id"),
                stance: r.get("stance"),
                strength: r.get("strength"),
                rationale: r.get("rationale"),
                added_at: r.get("added_at"),
                source_title: r.get("source_title"),
                source_url: r.get("source_url"),
                source_reliability: r.get("source_reliability"),
                assertion_text: r.get("assertion_text"),
                claim_id: r.get("claim_id"),
                claim_summary: r.get("claim_summary"),
                claim_verdict: r.get("claim_verdict"),
                outcome: r.get("outcome"),
            })
            .collect();

        // 3. Calcular estadísticas agregadas
        let mut distinct_claims = HashSet::new();
        let mut held_count = 0;
        let mut overturned_count = 0;

        for a in &assertions {
            distinct_claims.insert(a.claim_id);
            if let Some(ref o) = a.outcome {
                if o == "held" {
                    held_count += 1;
                } else if o == "overturned" {
                    overturned_count += 1;
                }
            }
        }

        for e in &evidence {
            distinct_claims.insert(e.claim_id);
            if let Some(ref o) = e.outcome {
                if o == "held" {
                    held_count += 1;
                } else if o == "overturned" {
                    overturned_count += 1;
                }
            }
        }

        let stats = MemberStats {
            total_contributions: assertions.len() + evidence.len(),
            claims_participated: distinct_claims.len(),
            assertions_count: assertions.len(),
            evidence_count: evidence.len(),
            held_count,
            overturned_count,
        };

        Ok(Some(MemberProfileData {
            member,
            stats,
            assertions,
            evidence,
        }))
    }
}
