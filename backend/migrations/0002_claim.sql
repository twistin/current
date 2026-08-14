-- Migration 0002: claim y claim_variant
-- claim.verdict es DERIVADO: el sistema lo recalcula; no se escribe a mano.
-- Priorización por propagation_score, no por indignación (principio 5 del maestro).

CREATE TYPE claim_kind AS ENUM ('text', 'image', 'video', 'mixed');
CREATE TYPE claim_status AS ENUM ('open', 'in_review', 'resolved');

-- Valores del documento maestro: false/true/misleading/unproven
-- 'true' admite que el bulo resultó cierto — hay que poder decirlo (rigor ante todo).
CREATE TYPE claim_verdict AS ENUM ('false', 'true', 'misleading', 'unproven');

CREATE TABLE claim (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    summary           TEXT          NOT NULL,
    kind              claim_kind    NOT NULL,
    detected_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Velocidad de propagación estimada. Prioriza la cola de verificación.
    -- Principio 5: se prioriza por velocidad, no por rabia generada.
    propagation_score INTEGER       NOT NULL DEFAULT 0,
    status            claim_status  NOT NULL DEFAULT 'open',
    -- DERIVADO. No insertar ni actualizar este campo directamente desde la API.
    -- El sistema lo recalcula cuando cambia el estado de las assertions clave.
    verdict           claim_verdict,
    created_by        UUID          NOT NULL REFERENCES member(id)
);

CREATE INDEX idx_claim_status           ON claim(status);
CREATE INDEX idx_claim_propagation_desc ON claim(propagation_score DESC);
CREATE INDEX idx_claim_created_by       ON claim(created_by);

CREATE TABLE claim_variant (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id    UUID        NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    origin_url  TEXT        NOT NULL,
    platform    TEXT        NOT NULL,
    language    TEXT        NOT NULL,  -- ISO 639-1 (ej: 'es', 'en', 'pt')
    snapshot    TEXT,                  -- URL a captura/archivo
    seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_variant_claim_id ON claim_variant(claim_id);
