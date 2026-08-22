-- ---------------------------------------------------------------------------
-- 1. Tabla: actors (Entidades y Nodos Auditados)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actors (
    id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255)      NOT NULL UNIQUE,
    actor_type              VARCHAR(50)       NOT NULL CHECK (actor_type IN ('media', 'social_account', 'telegram_channel')),
    reputation_score        DOUBLE PRECISION  NOT NULL DEFAULT 100.0,
    coordinated_campaigns   INT               NOT NULL DEFAULT 0,
    network_reach_estimate  VARCHAR(255),
    first_seen_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    last_updated_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Índices de consulta y radar táctico
CREATE INDEX IF NOT EXISTS idx_actors_reputation ON actors(reputation_score ASC);
CREATE INDEX IF NOT EXISTS idx_actors_actor_type ON actors(actor_type);

-- ---------------------------------------------------------------------------
-- 2. Tabla: forensic_traces (Registro Forense y Trazabilidad de Bulos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forensic_traces (
    id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id                UUID              NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    claim_title             VARCHAR(500)      NOT NULL,
    forensic_summary        TEXT              NOT NULL,
    detected_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    platform                VARCHAR(100)      NOT NULL,
    source_url              TEXT              NOT NULL,
    verdict                 VARCHAR(50)       NOT NULL CHECK (verdict IN ('false', 'misleading', 'unproven')),
    penalty_score           DOUBLE PRECISION  NOT NULL,
    verified_by_nodes       INT               NOT NULL DEFAULT 1
);

-- Índice optimizado para búsquedas de trazas por actor (Foreign Key)
CREATE INDEX IF NOT EXISTS idx_forensic_traces_actor_id ON forensic_traces(actor_id);

-- Índice cronológico para líneas de tiempo de desinformación
CREATE INDEX IF NOT EXISTS idx_forensic_traces_detected_at ON forensic_traces(detected_at DESC);
