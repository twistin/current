use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::{Rebuttal, RebuttalStatus};

pub struct RebuttalRepo {
    pool: PgPool,
}

fn rebuttal_status_to_str(status: RebuttalStatus) -> &'static str {
    match status {
        RebuttalStatus::Draft => "draft",
        RebuttalStatus::Published => "published",
    }
}

fn str_to_rebuttal_status(s: &str) -> RebuttalStatus {
    match s {
        "published" => RebuttalStatus::Published,
        _ => RebuttalStatus::Draft,
    }
}

impl RebuttalRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_claim(&self, claim_id: Uuid) -> Result<Option<Rebuttal>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, claim_id, base_text, published_at, status::text
            FROM rebuttal
            WHERE claim_id = $1
            "#,
        )
        .bind(claim_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let status_str: String = r.get("status");
            Rebuttal {
                id: r.get("id"),
                claim_id: r.get("claim_id"),
                base_text: r.get("base_text"),
                published_at: r.get("published_at"),
                status: str_to_rebuttal_status(&status_str),
            }
        }))
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Rebuttal>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, claim_id, base_text, published_at, status::text
            FROM rebuttal
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let status_str: String = r.get("status");
            Rebuttal {
                id: r.get("id"),
                claim_id: r.get("claim_id"),
                base_text: r.get("base_text"),
                published_at: r.get("published_at"),
                status: str_to_rebuttal_status(&status_str),
            }
        }))
    }

    pub async fn create(&self, rebuttal: &Rebuttal) -> Result<Rebuttal, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO rebuttal (id, claim_id, base_text, published_at, status)
            VALUES ($1, $2, $3, $4, $5::rebuttal_status)
            RETURNING id, claim_id, base_text, published_at, status::text
            "#,
        )
        .bind(rebuttal.id)
        .bind(rebuttal.claim_id)
        .bind(&rebuttal.base_text)
        .bind(rebuttal.published_at)
        .bind(rebuttal_status_to_str(rebuttal.status))
        .fetch_one(&self.pool)
        .await?;

        let status_str: String = row.get("status");

        Ok(Rebuttal {
            id: row.get("id"),
            claim_id: row.get("claim_id"),
            base_text: row.get("base_text"),
            published_at: row.get("published_at"),
            status: str_to_rebuttal_status(&status_str),
        })
    }

    /// Publica un borrador de desmentido (draft → published) y asigna la fecha actual.
    ///
    /// ⚠️ INVARIANTE DEL MODELO:
    /// Un desmentido solo DEBE poder pasar a 'published' si su bulo (`claim`) tiene un veredicto
    /// derivado definitivo (False, True o Misleading), NUNCA con Unproven o sin veredicto.
    ///
    /// Este control de invariante se valida a nivel de la capa de servicio/aplicación
    /// comprobando que `claim.verdict != Some(ClaimVerdict::Unproven)` antes de invocar este método.
    ///
    /// Garantía BD: El índice único parcial `idx_rebuttal_one_published_per_claim` de la migración 0005
    /// asegura en PostgreSQL que no puedan coexistir dos desmentidos publicados para un mismo bulo.
    pub async fn publish(&self, id: Uuid) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE rebuttal
            SET status = 'published'::rebuttal_status,
                published_at = now()
            WHERE id = $1
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

    pub async fn unpublish(&self, id: Uuid) -> Result<(), PersistenceError> {
        let result = sqlx::query(
            r#"
            UPDATE rebuttal
            SET status = 'draft'::rebuttal_status,
                published_at = NULL
            WHERE id = $1
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

    pub async fn delete_by_claim(&self, claim_id: Uuid) -> Result<(), PersistenceError> {
        sqlx::query(
            r#"
            DELETE FROM rebuttal
            WHERE claim_id = $1
            "#,
        )
        .bind(claim_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
