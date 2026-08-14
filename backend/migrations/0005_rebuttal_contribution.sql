-- Migration 0005: rebuttal y contribution
-- rebuttal: solo existe cuando el claim tiene veredicto y cadena de evidencia.
-- El índice parcial UNIQUE garantiza que no se publiquen dos rebuttals del mismo bulo.
-- contribution: log de aportaciones para reputación y trazabilidad anti-captura.

CREATE TYPE rebuttal_status AS ENUM ('draft', 'published');

CREATE TABLE rebuttal (
    id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Referencia directa al bulo. El rebuttal no cuelga de assertion.
    claim_id     UUID            NOT NULL REFERENCES claim(id),
    base_text    TEXT            NOT NULL,
    published_at TIMESTAMPTZ,
    status       rebuttal_status NOT NULL DEFAULT 'draft'
);

-- Solo puede haber un rebuttal publicado por claim.
-- Garantiza "el instrumento, no el veredicto": un solo desmentido canónico
-- que cada persona adapta con su voz (principio 3 del maestro).
CREATE UNIQUE INDEX idx_rebuttal_one_published_per_claim
    ON rebuttal(claim_id)
    WHERE status = 'published';

CREATE INDEX idx_rebuttal_claim_id ON rebuttal(claim_id);

-- Tipos de objetivos de una contribución.
-- Cubre todas las entidades que un miembro puede aportar.
CREATE TYPE contribution_target_type AS ENUM ('assertion', 'source', 'evidence');
-- outcome nullable: se rellena cuando la contribución se evalúa.
-- held = la aportación se mantuvo válida → sube rigor_score.
-- overturned = se revocó → baja rigor_score.
CREATE TYPE contribution_outcome AS ENUM ('held', 'overturned');

CREATE TABLE contribution (
    id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   UUID                     NOT NULL REFERENCES member(id),
    target_type contribution_target_type NOT NULL,
    -- UUID del assertion, source o evidence aportado.
    -- Sin FK polimórfica para no complicar el esquema en el MVP.
    target_id   UUID                     NOT NULL,
    created_at  TIMESTAMPTZ              NOT NULL DEFAULT now(),
    -- NULL hasta que la contribución se evalúa (el proceso pide al equipo revisar).
    outcome     contribution_outcome
);

CREATE INDEX idx_contribution_member_id ON contribution(member_id);
CREATE INDEX idx_contribution_target    ON contribution(target_type, target_id);
-- Índice para calcular rigor_score: todas las contribuciones evaluadas de un miembro
CREATE INDEX idx_contribution_outcome   ON contribution(member_id, outcome)
    WHERE outcome IS NOT NULL;
