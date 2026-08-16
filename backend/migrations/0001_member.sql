-- Migration 0001: member
CREATE SCHEMA IF NOT EXISTS current;
SET search_path TO current, public;

CREATE TABLE IF NOT EXISTS member (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonym    TEXT        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    rigor_score  INTEGER     NOT NULL DEFAULT 0,
    auth_ref     TEXT
);

CREATE INDEX IF NOT EXISTS idx_member_pseudonym ON member(pseudonym);
