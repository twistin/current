use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use crate::repos::member_repo::MemberRepo;
use current_domain::entities::{Contribution, ContributionOutcome, ContributionTargetType};

pub struct ContributionRepo {
    pool: PgPool,
}

fn target_type_to_str(target: ContributionTargetType) -> &'static str {
    match target {
        ContributionTargetType::Assertion => "assertion",
        ContributionTargetType::Source => "source",
        ContributionTargetType::Evidence => "evidence",
    }
}

fn str_to_target_type(s: &str) -> ContributionTargetType {
    match s {
        "assertion" => ContributionTargetType::Assertion,
        "source" => ContributionTargetType::Source,
        _ => ContributionTargetType::Evidence,
    }
}

fn outcome_to_opt_str(outcome: Option<ContributionOutcome>) -> Option<&'static str> {
    outcome.map(|o| match o {
        ContributionOutcome::Held => "held",
        ContributionOutcome::Overturned => "overturned",
    })
}

fn opt_str_to_outcome(s: Option<String>) -> Option<ContributionOutcome> {
    s.and_then(|val| match val.as_str() {
        "held" => Some(ContributionOutcome::Held),
        "overturned" => Some(ContributionOutcome::Overturned),
        _ => None,
    })
}

impl ContributionRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Contribution>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, member_id, target_type::text, target_id, created_at, outcome::text
            FROM contribution
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let target_str: String = r.get("target_type");
            let outcome_str: Option<String> = r.get("outcome");
            Contribution {
                id: r.get("id"),
                member_id: r.get("member_id"),
                target_type: str_to_target_type(&target_str),
                target_id: r.get("target_id"),
                created_at: r.get("created_at"),
                outcome: opt_str_to_outcome(outcome_str),
            }
        }))
    }

    pub async fn create(&self, contribution: &Contribution) -> Result<Contribution, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO contribution (id, member_id, target_type, target_id, created_at, outcome)
            VALUES ($1, $2, $3::contribution_target_type, $4, $5, $6::contribution_outcome)
            RETURNING id, member_id, target_type::text, target_id, created_at, outcome::text
            "#,
        )
        .bind(contribution.id)
        .bind(contribution.member_id)
        .bind(target_type_to_str(contribution.target_type))
        .bind(contribution.target_id)
        .bind(contribution.created_at)
        .bind(outcome_to_opt_str(contribution.outcome))
        .fetch_one(&self.pool)
        .await?;

        let target_str: String = row.get("target_type");
        let outcome_str: Option<String> = row.get("outcome");

        Ok(Contribution {
            id: row.get("id"),
            member_id: row.get("member_id"),
            target_type: str_to_target_type(&target_str),
            target_id: row.get("target_id"),
            created_at: row.get("created_at"),
            outcome: opt_str_to_outcome(outcome_str),
        })
    }

    pub async fn list_by_member(&self, member_id: Uuid) -> Result<Vec<Contribution>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, member_id, target_type::text, target_id, created_at, outcome::text
            FROM contribution
            WHERE member_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(member_id)
        .fetch_all(&self.pool)
        .await?;

        let list = rows
            .into_iter()
            .map(|r| {
                let target_str: String = r.get("target_type");
                let outcome_str: Option<String> = r.get("outcome");
                Contribution {
                    id: r.get("id"),
                    member_id: r.get("member_id"),
                    target_type: str_to_target_type(&target_str),
                    target_id: r.get("target_id"),
                    created_at: r.get("created_at"),
                    outcome: opt_str_to_outcome(outcome_str),
                }
            })
            .collect();

        Ok(list)
    }

    /// Registra el resultado de evaluar una contribución (`held` o `overturned`)
    /// y actualiza el `rigor_score` del miembro (held → +1, overturned → -1).
    pub async fn update_outcome(
        &self,
        id: Uuid,
        outcome: ContributionOutcome,
    ) -> Result<(), PersistenceError> {
        let contribution = self.find_by_id(id).await?.ok_or(PersistenceError::NotFound)?;

        let outcome_str = match outcome {
            ContributionOutcome::Held => "held",
            ContributionOutcome::Overturned => "overturned",
        };

        sqlx::query(
            r#"
            UPDATE contribution
            SET outcome = $2::contribution_outcome
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(outcome_str)
        .execute(&self.pool)
        .await?;

        // Impacto en el rigor_score del miembro: held (+1), overturned (-1)
        let delta = match outcome {
            ContributionOutcome::Held => 1,
            ContributionOutcome::Overturned => -1,
        };

        let member_repo = MemberRepo::new(self.pool.clone());
        member_repo.update_rigor_score(contribution.member_id, delta).await?;

        Ok(())
    }
}
