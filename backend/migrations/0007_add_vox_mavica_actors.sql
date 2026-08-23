-- ---------------------------------------------------------------------------
-- 0007: Añadir @vox_es y @mavica81 al Radar de Actores y Trazas Forenses
-- ---------------------------------------------------------------------------

INSERT INTO actors (id, name, actor_type, reputation_score, coordinated_campaigns, network_reach_estimate)
VALUES 
    ('66666666-6666-6666-6666-666666666666', '@vox_es', 'social_account', 32.0, 6, '~850K seguidores en X'),
    ('77777777-7777-7777-7777-777777777777', '@mavica81', 'social_account', 29.0, 4, '~67.5K seguidores en X')
ON CONFLICT (name) DO UPDATE 
SET reputation_score = EXCLUDED.reputation_score,
    network_reach_estimate = EXCLUDED.network_reach_estimate,
    last_updated_at = NOW();

INSERT INTO forensic_traces (id, actor_id, claim_title, forensic_summary, detected_at, platform, source_url, verdict, penalty_score, verified_by_nodes)
VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'Difusión en X y Telegram de vídeo de hemeroteca de febrero afirmando que ocurrió "esta mañana" en Ceuta', 'Publicación en agosto de 2026 de declaraciones con rótulo de 05/02/2026 bajo el encabezado fraudulento "Esta mañana..." para simular actualidad y generar alarma.', NOW() - INTERVAL '10 hours', 'X / Telegram', 'https://x.com/vox_es/status/2087986277329047974', 'false', -20.0, 4),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '77777777-7777-7777-7777-777777777777', 'Amplificación coordinada de vídeo anacrónico de Ceuta', 'Nodo satélite de 67.5K seguidores que reinyectó el vídeo de febrero con el titular literal "Esta mañana...", multiplicando la difusión.', NOW() - INTERVAL '8 hours', 'X (Twitter)', 'https://x.com/mavica81', 'false', -18.0, 3)
ON CONFLICT (id) DO NOTHING;
