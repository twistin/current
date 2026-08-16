-- Migration 0004: source y evidence
-- evidence es el corazón del modelo: vincula assertion ↔ source CON POSTURA.
-- Sin stance, es imposible derivar el estado de una afirmación.
-- rationale es obligatorio: toda evidencia necesita explicación humana.

DO $$ BEGIN CREATE TYPE source_kind AS ENUM ('primary', 'secondary', 'official', 'press', 'academic', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE source_reliability AS ENUM ('high', 'medium', 'low', 'disputed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS source (
    id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    url         TEXT               NOT NULL,
    title       TEXT               NOT NULL,
    kind        source_kind        NOT NULL,
    reliability source_reliability NOT NULL,
    excerpt     TEXT,
    added_by    UUID               NOT NULL REFERENCES member(id),
    added_at    TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_added_by ON source(added_by);

DO $$ BEGIN CREATE TYPE evidence_stance  AS ENUM ('supports', 'refutes', 'contextualizes'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE evidence_strength AS ENUM ('strong', 'moderate', 'weak'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS evidence (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    assertion_id UUID              NOT NULL REFERENCES assertion(id) ON DELETE CASCADE,
    source_id    UUID              NOT NULL REFERENCES source(id),
    stance       evidence_stance   NOT NULL,
    strength     evidence_strength NOT NULL,
    rationale    TEXT              NOT NULL,
    added_by     UUID              NOT NULL REFERENCES member(id),
    added_at     TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_assertion_id ON evidence(assertion_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source_id    ON evidence(source_id);
CREATE INDEX IF NOT EXISTS idx_evidence_added_by     ON evidence(added_by);
