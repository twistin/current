-- Migration 0003: assertion
-- La afirmación cuelga de CLAIM (no de rebuttal).
-- Es la descomposición verificable del bulo.
-- assertion.status es DERIVADO: lo recalcula derive_assertion_status().

CREATE TYPE assertion_status AS ENUM ('unverified', 'supported', 'refuted', 'contested');

CREATE TABLE assertion (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cuelga de claim, NO de rebuttal. El rebuttal llega después, cuando hay veredicto.
    claim_id        UUID             NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
    text            TEXT             NOT NULL,
    -- Afirmación clave: el veredicto del claim depende de estas.
    -- Una sola is_load_bearing=true refuted puede hacer el bulo 'false'.
    is_load_bearing BOOLEAN          NOT NULL DEFAULT false,
    -- DERIVADO por derive_assertion_status(). No escribir directamente.
    status          assertion_status NOT NULL DEFAULT 'unverified',
    created_by      UUID             NOT NULL REFERENCES member(id)
);

CREATE INDEX idx_assertion_claim_id       ON assertion(claim_id);
-- Índice parcial para cargar rápido solo las afirmaciones clave al derivar el veredicto
CREATE INDEX idx_assertion_load_bearing   ON assertion(claim_id) WHERE is_load_bearing = true;
