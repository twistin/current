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

-- ---------------------------------------------------------------------------
-- 3. Datos Semilla Iniciales para Radar de Inteligencia
-- ---------------------------------------------------------------------------
INSERT INTO actors (id, name, actor_type, reputation_score, coordinated_campaigns, network_reach_estimate)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '@PeriodistaDigital', 'media', 42.0, 4, '~480K visitas/mes'),
    ('22222222-2222-2222-2222-222222222222', '@Okdiario', 'media', 34.5, 5, '~1.2M visitas/mes'),
    ('33333333-3333-3333-3333-333333333333', '@Alvise_Canal_Noticias', 'telegram_channel', 28.0, 8, '~520K suscriptores'),
    ('44444444-4444-4444-4444-444444444444', '@Liberaldig', 'social_account', 38.0, 3, '~45K seguidores'),
    ('55555555-5555-5555-5555-555555555555', '@EFEnoticias', 'media', 94.0, 0, 'Agencia Oficial')
ON CONFLICT (name) DO NOTHING;

INSERT INTO forensic_traces (id, actor_id, claim_title, forensic_summary, detected_at, platform, source_url, verdict, penalty_score, verified_by_nodes)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Atribución no probada de subida electoral de VOX a la supuesta "traición en Ceuta" sin ficha técnica oficial', 'Periodista Digital recicló una encuesta de Sigma Dos de febrero de 2026 y la presentó en agosto como actual, multiplicando por siete las cifras de entradas irregulares en Ceuta (más de 70.000).', NOW() - INTERVAL '2 hours', 'Web / X', 'https://www.periodistadigital.com/politica/20260822/noticia-vox-ceuta-encuestas/', 'false', -15.0, 3),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Coche oficial sin matrícula traslada a invitados a La Mareta tras aterrizar en Lanzarote', 'Vídeo descontextualizado del aeropuerto de Lanzarote; el vehículo pertenecía a la delegación insular y cumplía la normativa de seguridad sin traslados no autorizados.', NOW() - INTERVAL '5 days', 'X (Twitter)', 'https://okdiario.com/investigacion/lanzarote-mareta-coches-1234', 'false', -18.0, 5),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Filtración masiva de expedientes judiciales confidenciales en la Audiencia Nacional', 'Documento fabricado en plantilla digital sin firma electrónica ni número de procedimiento válido.', NOW() - INTERVAL '10 days', 'Telegram', 'https://t.me/alvise_canal_noticias/8912', 'false', -22.0, 7),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Difusión coordinada de titular sobre 70.000 inmigrantes en Ceuta y encuestas falsas', 'Cuenta satélite en X de amplificación sistemática de contenidos no verificados de Periodista Digital.', NOW() - INTERVAL '1 hour', 'X (Twitter)', 'https://x.com/Liberaldig/status/1787430297213', 'false', -12.0, 2)
ON CONFLICT (id) DO NOTHING;
