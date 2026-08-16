-- Migration 0003: assertion
DO $$ BEGIN CREATE TYPE assertion_status AS ENUM ('unverified', 'supported', 'refuted', 'contested'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS assertion (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        UUID             NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    text            TEXT             NOT NULL,
    is_load_bearing BOOLEAN          NOT NULL DEFAULT false,
    status          assertion_status NOT NULL DEFAULT 'unverified',
    created_by      UUID             NOT NULL REFERENCES member(id),
    retracted_at    TIMESTAMPTZ,
    retracted_by    UUID             REFERENCES member(id)
);

ALTER TABLE assertion ADD COLUMN IF NOT EXISTS retracted_at TIMESTAMPTZ;
ALTER TABLE assertion ADD COLUMN IF NOT EXISTS retracted_by UUID REFERENCES member(id);

CREATE INDEX IF NOT EXISTS idx_assertion_claim_id       ON assertion(claim_id);
CREATE INDEX IF NOT EXISTS idx_assertion_load_bearing   ON assertion(claim_id) WHERE is_load_bearing = true;
