-- Migration 0001: member
-- Persona seudónima. SIN PII en el núcleo (principio innegociable del documento maestro).
-- Sin real_name, sin phone, sin email obligatorio.

CREATE TABLE member (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonym    TEXT        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    rigor_score  INTEGER     NOT NULL DEFAULT 0,
    -- Referencia opaca a credencial externa (OAuth token ref, hash, etc.)
    -- NUNCA se guarda email ni teléfono en claro aquí.
    auth_ref     TEXT
);

CREATE INDEX idx_member_pseudonym ON member(pseudonym);
