use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::ClaimVariant;

pub struct ClaimVariantRepo {
    pool: PgPool,
}

impl ClaimVariantRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<ClaimVariant>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, claim_id, origin_url, platform, language, snapshot, seen_at
            FROM claim_variant
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| ClaimVariant {
            id: r.get("id"),
            claim_id: r.get("claim_id"),
            origin_url: r.get("origin_url"),
            platform: r.get("platform"),
            language: r.get("language"),
            snapshot: r.get("snapshot"),
            seen_at: r.get("seen_at"),
        }))
    }

    pub async fn create(&self, variant: &ClaimVariant) -> Result<ClaimVariant, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO claim_variant (id, claim_id, origin_url, platform, language, snapshot, seen_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, claim_id, origin_url, platform, language, snapshot, seen_at
            "#,
        )
        .bind(variant.id)
        .bind(variant.claim_id)
        .bind(&variant.origin_url)
        .bind(&variant.platform)
        .bind(&variant.language)
        .bind(&variant.snapshot)
        .bind(variant.seen_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(ClaimVariant {
            id: row.get("id"),
            claim_id: row.get("claim_id"),
            origin_url: row.get("origin_url"),
            platform: row.get("platform"),
            language: row.get("language"),
            snapshot: row.get("snapshot"),
            seen_at: row.get("seen_at"),
        })
    }

    pub async fn list_by_claim(&self, claim_id: Uuid) -> Result<Vec<ClaimVariant>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, claim_id, origin_url, platform, language, snapshot, seen_at
            FROM claim_variant
            WHERE claim_id = $1
            ORDER BY seen_at DESC
            "#,
        )
        .bind(claim_id)
        .fetch_all(&self.pool)
        .await?;

        let variants = rows
            .into_iter()
            .map(|r| ClaimVariant {
                id: r.get("id"),
                claim_id: r.get("claim_id"),
                origin_url: r.get("origin_url"),
                platform: r.get("platform"),
                language: r.get("language"),
                snapshot: r.get("snapshot"),
                seen_at: r.get("seen_at"),
            })
            .collect();

        Ok(variants)
    }
}
