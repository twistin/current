-- Migration 0005: rebuttal y contribution
DO $$ BEGIN CREATE TYPE rebuttal_status AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS rebuttal (
    id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id     UUID            NOT NULL UNIQUE REFERENCES claim(id) ON DELETE CASCADE,
    base_text    TEXT            NOT NULL,
    published_at TIMESTAMPTZ,
    status       rebuttal_status NOT NULL DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_rebuttal_claim_id ON rebuttal(claim_id);

DO $$ BEGIN CREATE TYPE contribution_target AS ENUM ('assertion', 'source', 'evidence', 'rebuttal'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE contribution_target_type AS ENUM ('assertion', 'source', 'evidence', 'rebuttal'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE contribution_outcome AS ENUM ('held', 'overturned'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS contribution (
    id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   UUID                 NOT NULL REFERENCES member(id),
    target_type contribution_target  NOT NULL,
    target_id   UUID                 NOT NULL,
    created_at  TIMESTAMPTZ          NOT NULL DEFAULT now(),
    outcome     contribution_outcome
);

CREATE INDEX IF NOT EXISTS idx_contribution_member_id ON contribution(member_id);
CREATE INDEX IF NOT EXISTS idx_contribution_target    ON contribution(target_type, target_id);
