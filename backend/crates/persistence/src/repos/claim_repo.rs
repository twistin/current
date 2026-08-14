use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::{AssertionStatus, Claim, ClaimKind, ClaimStatus, ClaimVerdict};

pub struct ClaimRepo {
    pool: PgPool,
}

fn claim_kind_to_str(kind: ClaimKind) -> &'static str {
    match kind {
        ClaimKind::Text => "text",
        ClaimKind::Image => "image",
        ClaimKind::Video => "video",
        ClaimKind::Mixed => "mixed",
    }
}

fn str_to_claim_kind(s: &str) -> ClaimKind {
    match s {
        "text" => ClaimKind::Text,
        "image" => ClaimKind::Image,
        "video" => ClaimKind::Video,
        _ => ClaimKind::Mixed,
    }
}

fn claim_status_to_str(status: ClaimStatus) -> &'static str {
    match status {
        ClaimStatus::Open => "open",
        ClaimStatus::InReview => "in_review",
        ClaimStatus::Resolved => "resolved",
    }
}

fn str_to_claim_status(s: &str) -> ClaimStatus {
    match s {
        "open" => ClaimStatus::Open,
        "in_review" => ClaimStatus::InReview,
        "resolved" => ClaimStatus::Resolved,
        _ => ClaimStatus::Open,
    }
}

fn claim_verdict_to_opt_str(verdict: Option<ClaimVerdict>) -> Option<&'static str> {
    verdict.map(|v| match v {
        ClaimVerdict::False => "false",
        ClaimVerdict::True => "true",
        ClaimVerdict::Misleading => "misleading",
        ClaimVerdict::Unproven => "unproven",
    })
}

fn opt_str_to_claim_verdict(s: Option<String>) -> Option<ClaimVerdict> {
    s.and_then(|val| match val.as_str() {
        "false" => Some(ClaimVerdict::False),
        "true" => Some(ClaimVerdict::True),
        "misleading" => Some(ClaimVerdict::Misleading),
        "unproven" => Some(ClaimVerdict::Unproven),
        _ => None,
    })
}

fn str_to_assertion_status(s: &str) -> AssertionStatus {
    match s {
        "supported" => AssertionStatus::Supported,
        "refuted" => AssertionStatus::Refuted,
        "contested" => AssertionStatus::Contested,
        _ => AssertionStatus::Unverified,
    }
}

impl ClaimRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Claim>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, summary, kind::text, detected_at, propagation_score, status::text, verdict::text, created_by
            FROM claim
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let kind_str: String = r.get("kind");
            let status_str: String = r.get("status");
            let verdict_str: Option<String> = r.get("verdict");
            Claim {
                id: r.get("id"),
                summary: r.get("summary"),
                kind: str_to_claim_kind(&kind_str),
                detected_at: r.get("detected_at"),
                propagation_score: r.get("propagation_score"),
                status: str_to_claim_status(&status_str),
                verdict: opt_str_to_claim_verdict(verdict_str),
                created_by: r.get("created_by"),
            }
        }))
    }

    pub async fn create(&self, claim: &Claim) -> Result<Claim, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO claim (id, summary, kind, detected_at, propagation_score, status, verdict, created_by)
            VALUES ($1, $2, $3::claim_kind, $4, $5, $6::claim_status, $7::claim_verdict, $8)
            RETURNING id, summary, kind::text, detected_at, propagation_score, status::text, verdict::text, created_by
            "#,
        )
        .bind(claim.id)
        .bind(&claim.summary)
        .bind(claim_kind_to_str(claim.kind))
        .bind(claim.detected_at)
        .bind(claim.propagation_score)
        .bind(claim_status_to_str(claim.status))
        .bind(claim_verdict_to_opt_str(claim.verdict))
        .bind(claim.created_by)
        .fetch_one(&self.pool)
        .await?;

        let kind_str: String = row.get("kind");
        let status_str: String = row.get("status");
        let verdict_str: Option<String> = row.get("verdict");

        Ok(Claim {
            id: row.get("id"),
            summary: row.get("summary"),
            kind: str_to_claim_kind(&kind_str),
            detected_at: row.get("detected_at"),
            propagation_score: row.get("propagation_score"),
            status: str_to_claim_status(&status_str),
            verdict: opt_str_to_claim_verdict(verdict_str),
            created_by: row.get("created_by"),
        })
    }

    pub async fn list_prioritized(&self) -> Result<Vec<Claim>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, summary, kind::text, detected_at, propagation_score, status::text, verdict::text, created_by
            FROM claim
            ORDER BY propagation_score DESC, detected_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let claims = rows
            .into_iter()
            .map(|r| {
                let kind_str: String = r.get("kind");
                let status_str: String = r.get("status");
                let verdict_str: Option<String> = r.get("verdict");
                Claim {
                    id: r.get("id"),
                    summary: r.get("summary"),
                    kind: str_to_claim_kind(&kind_str),
                    detected_at: r.get("detected_at"),
                    propagation_score: r.get("propagation_score"),
                    status: str_to_claim_status(&status_str),
                    verdict: opt_str_to_claim_verdict(verdict_str),
                    created_by: r.get("created_by"),
                }
            })
            .collect();

        Ok(claims)
    }

    pub async fn list_by_status(&self, status: ClaimStatus) -> Result<Vec<Claim>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, summary, kind::text, detected_at, propagation_score, status::text, verdict::text, created_by
            FROM claim
            WHERE status = $1::claim_status
            ORDER BY propagation_score DESC, detected_at DESC
            "#,
        )
        .bind(claim_status_to_str(status))
        .fetch_all(&self.pool)
        .await?;

        let claims = rows
            .into_iter()
            .map(|r| {
                let kind_str: String = r.get("kind");
                let status_str: String = r.get("status");
                let verdict_str: Option<String> = r.get("verdict");
                Claim {
                    id: r.get("id"),
                    summary: r.get("summary"),
                    kind: str_to_claim_kind(&kind_str),
                    detected_at: r.get("detected_at"),
                    propagation_score: r.get("propagation_score"),
                    status: str_to_claim_status(&status_str),
                    verdict: opt_str_to_claim_verdict(verdict_str),
                    created_by: r.get("created_by"),
                }
            })
            .collect();

        Ok(claims)
    }

    pub async fn update_status(&self, id: Uuid, status: ClaimStatus) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE claim
            SET status = $2::claim_status
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(claim_status_to_str(status))
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            Err(PersistenceError::NotFound)
        } else {
            Ok(())
        }
    }

    pub async fn update_verdict(&self, id: Uuid, verdict: Option<ClaimVerdict>) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE claim
            SET verdict = $2::claim_verdict
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(claim_verdict_to_opt_str(verdict))
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            Err(PersistenceError::NotFound)
        } else {
            Ok(())
        }
    }

    pub async fn load_bearing_assertion_statuses(
        &self,
        claim_id: Uuid,
    ) -> Result<Vec<AssertionStatus>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT status::text
            FROM assertion
            WHERE claim_id = $1 AND is_load_bearing = true
            "#,
        )
        .bind(claim_id)
        .fetch_all(&self.pool)
        .await?;

        let statuses = rows
            .into_iter()
            .map(|r| {
                let status_str: String = r.get("status");
                str_to_assertion_status(&status_str)
            })
            .collect();

        Ok(statuses)
    }
}
