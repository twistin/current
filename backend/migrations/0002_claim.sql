-- Migration 0002: claim y claim_variant
CREATE SCHEMA IF NOT EXISTS current;
SET search_path TO current, public;

DO $$ BEGIN CREATE TYPE claim_kind AS ENUM ('text', 'image', 'video', 'mixed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE claim_status AS ENUM ('open', 'in_review', 'resolved'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE claim_verdict AS ENUM ('false', 'true', 'misleading', 'unproven'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS claim (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    summary           TEXT          NOT NULL,
    kind              claim_kind    NOT NULL,
    detected_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    propagation_score INTEGER       NOT NULL DEFAULT 0,
    status            claim_status  NOT NULL DEFAULT 'open',
    verdict           claim_verdict,
    created_by        UUID          NOT NULL REFERENCES member(id)
);

CREATE INDEX IF NOT EXISTS idx_claim_status           ON claim(status);
CREATE INDEX IF NOT EXISTS idx_claim_propagation_desc ON claim(propagation_score DESC);
CREATE INDEX IF NOT EXISTS idx_claim_created_by       ON claim(created_by);

CREATE TABLE IF NOT EXISTS claim_variant (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id    UUID        NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    origin_url  TEXT        NOT NULL,
    platform    TEXT        NOT NULL,
    language    TEXT        NOT NULL,
    snapshot    TEXT,
    seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_variant_claim_id ON claim_variant(claim_id);
