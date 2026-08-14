-- Migration 0004: source y evidence
-- evidence es el corazón del modelo: vincula assertion ↔ source CON POSTURA.
-- Sin stance, es imposible derivar el estado de una afirmación.
-- rationale es obligatorio: toda evidencia necesita explicación humana.

CREATE TYPE source_kind AS ENUM ('primary', 'secondary', 'official', 'press', 'academic', 'other');
CREATE TYPE source_reliability AS ENUM ('high', 'medium', 'low', 'disputed');

CREATE TABLE source (
    id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    url         TEXT               NOT NULL,
    title       TEXT               NOT NULL,
    kind        source_kind        NOT NULL,
    reliability source_reliability NOT NULL,
    -- Cita breve. Respetar copyright: solo extracto, no reproducción completa.
    excerpt     TEXT,
    added_by    UUID               NOT NULL REFERENCES member(id),
    added_at    TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_added_by ON source(added_by);

-- Posturas posibles de una fuente frente a una afirmación.
-- 'contextualizes' no mueve el balance supports/refutes pero enriquece la cadena.
CREATE TYPE evidence_stance  AS ENUM ('supports', 'refutes', 'contextualizes');
CREATE TYPE evidence_strength AS ENUM ('strong', 'moderate', 'weak');

CREATE TABLE evidence (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    assertion_id UUID              NOT NULL REFERENCES assertion(id) ON DELETE CASCADE,
    source_id    UUID              NOT NULL REFERENCES source(id),
    -- IMPRESCINDIBLE para derive_assertion_status().
    -- Sin stance, es imposible calcular el estado de la afirmación.
    stance       evidence_stance   NOT NULL,
    strength     evidence_strength NOT NULL,
    -- Por qué esta fuente apoya/refuta esta afirmación concreta.
    -- Obligatorio: el instrumento da el método, no el dictamen. (Principio 1)
    rationale    TEXT              NOT NULL,
    added_by     UUID              NOT NULL REFERENCES member(id),
    added_at     TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_assertion_id ON evidence(assertion_id);
CREATE INDEX idx_evidence_source_id    ON evidence(source_id);
CREATE INDEX idx_evidence_added_by     ON evidence(added_by);
