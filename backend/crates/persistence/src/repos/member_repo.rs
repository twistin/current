use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::Member;

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
            WHERE pseudonym = $1
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
}
