use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::error::PersistenceError;
use current_domain::entities::{Source, SourceKind, SourceReliability};

pub struct SourceRepo {
    pool: PgPool,
}

fn source_kind_to_str(kind: SourceKind) -> &'static str {
    match kind {
        SourceKind::Primary => "primary",
        SourceKind::Secondary => "secondary",
        SourceKind::Official => "official",
        SourceKind::Press => "press",
        SourceKind::Academic => "academic",
        SourceKind::Other => "other",
    }
}

fn str_to_source_kind(s: &str) -> SourceKind {
    match s {
        "primary" => SourceKind::Primary,
        "secondary" => SourceKind::Secondary,
        "official" => SourceKind::Official,
        "press" => SourceKind::Press,
        "academic" => SourceKind::Academic,
        _ => SourceKind::Other,
    }
}

fn source_reliability_to_str(reliability: SourceReliability) -> &'static str {
    match reliability {
        SourceReliability::High => "high",
        SourceReliability::Medium => "medium",
        SourceReliability::Low => "low",
        SourceReliability::Disputed => "disputed",
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

impl SourceRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Source>, PersistenceError> {
        let row = sqlx::query(
            r#"
            SELECT id, url, title, kind::text, reliability::text, excerpt, added_by, added_at
            FROM source
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let kind_str: String = r.get("kind");
            let rel_str: String = r.get("reliability");
            Source {
                id: r.get("id"),
                url: r.get("url"),
                title: r.get("title"),
                kind: str_to_source_kind(&kind_str),
                reliability: str_to_source_reliability(&rel_str),
                excerpt: r.get("excerpt"),
                added_by: r.get("added_by"),
                added_at: r.get("added_at"),
            }
        }))
    }

    pub async fn create(&self, source: &Source) -> Result<Source, PersistenceError> {
        let row = sqlx::query(
            r#"
            INSERT INTO source (id, url, title, kind, reliability, excerpt, added_by, added_at)
            VALUES ($1, $2, $3, $4::source_kind, $5::source_reliability, $6, $7, $8)
            RETURNING id, url, title, kind::text, reliability::text, excerpt, added_by, added_at
            "#,
        )
        .bind(source.id)
        .bind(&source.url)
        .bind(&source.title)
        .bind(source_kind_to_str(source.kind))
        .bind(source_reliability_to_str(source.reliability))
        .bind(&source.excerpt)
        .bind(source.added_by)
        .bind(source.added_at)
        .fetch_one(&self.pool)
        .await?;

        let kind_str: String = row.get("kind");
        let rel_str: String = row.get("reliability");

        Ok(Source {
            id: row.get("id"),
            url: row.get("url"),
            title: row.get("title"),
            kind: str_to_source_kind(&kind_str),
            reliability: str_to_source_reliability(&rel_str),
            excerpt: row.get("excerpt"),
            added_by: row.get("added_by"),
            added_at: row.get("added_at"),
        })
    }

    pub async fn list_by_assertion(&self, assertion_id: Uuid) -> Result<Vec<Source>, PersistenceError> {
        let rows = sqlx::query(
            r#"
            SELECT s.id, s.url, s.title, s.kind::text, s.reliability::text, s.excerpt, s.added_by, s.added_at
            FROM source s
            JOIN evidence e ON e.source_id = s.id
            WHERE e.assertion_id = $1
            "#,
        )
        .bind(assertion_id)
        .fetch_all(&self.pool)
        .await?;

        let sources = rows
            .into_iter()
            .map(|r| {
                let kind_str: String = r.get("kind");
                let rel_str: String = r.get("reliability");
                Source {
                    id: r.get("id"),
                    url: r.get("url"),
                    title: r.get("title"),
                    kind: str_to_source_kind(&kind_str),
                    reliability: str_to_source_reliability(&rel_str),
                    excerpt: r.get("excerpt"),
                    added_by: r.get("added_by"),
                    added_at: r.get("added_at"),
                }
            })
            .collect();

        Ok(sources)
    }
}
