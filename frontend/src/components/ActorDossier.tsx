import React, { useEffect, useState } from 'react';
import { Actor, ReputationMeter, getActorMeta } from './ToxicityRadar';
import { ThreatGraph } from './ThreatGraph';

export interface DisinformationTrace {
  id: string;
  claim_id: string;
  title: string;
  detected_at: string;
  platform: string;
  origin_url: string;
  impact_level: 'critical' | 'high' | 'medium';
  verdict: 'false' | 'misleading' | 'unproven';
  penalty_applied: number;
  evidence_count: number;
  summary: string;
}

export interface LinkedNode {
  id: string;
  platform: string;
  handle_or_url: string;
  confidence: number;
  linked_at: string;
}

export interface ActorDetail extends Actor {
  first_seen_at: string;
  total_traces: number;
  coordinated_campaigns: number;
  network_reach_estimate: string;
  linked_nodes: LinkedNode[];
  traces: DisinformationTrace[];
}

interface ActorDossierProps {
  actorId: string;
  onBack?: () => void;
  onSelectClaim?: (claimId: string) => void;
}

export const ActorDossier: React.FC<ActorDossierProps> = ({ actorId, onBack, onSelectClaim }) => {
  const [dossier, setDossier] = useState<ActorDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'traces' | 'nodes'>('traces');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (!isMounted) return;

      const mockDossier: ActorDetail = {
        id: actorId,
        name: actorId.includes('alvise') ? '@Alvise_Canal_Noticias' : '@Okdiario',
        actor_type: actorId.includes('alvise') ? 'telegram_channel' : 'media',
        reputation_score: actorId.includes('alvise') ? 22.0 : 34.5,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: new Date().toISOString(),
        first_seen_at: '2025-11-03T08:22:14Z',
        total_traces: 14,
        coordinated_campaigns: 5,
        network_reach_estimate: '~480K impresiones/bulo',
        linked_nodes: [
          {
            id: 'node-1',
            platform: 'Telegram',
            handle_or_url: 't.me/okdiario_alertas',
            confidence: 96,
            linked_at: '2026-02-10T14:12:00Z',
          },
          {
            id: 'node-2',
            platform: 'X (Twitter)',
            handle_or_url: 'x.com/okdiario',
            confidence: 100,
            linked_at: '2026-01-15T10:00:00Z',
          },
          {
            id: 'node-3',
            platform: 'Enjambre Bot',
            handle_or_url: 'Red de amplificación #401 (Lanzarote/Mareta)',
            confidence: 84,
            linked_at: '2026-08-16T18:40:00Z',
          },
        ],
        traces: [
          {
            id: 'trace-1',
            claim_id: '77639856-7615-4c5b-b138-dd03a700fe48',
            title: 'Vídeo descontextualizado en aeropuerto de Lanzarote (Caso Jesús Calleja)',
            summary:
              'Difusión de imágenes en zona de vehículos autorizados afirmando falsamente que se trataba de un coche oficial de Presidencia con chófer rumbo a La Mareta sin matrícula oficial ni documentación.',
            detected_at: '2026-08-16T18:39:17Z',
            platform: 'X & Web Digital',
            origin_url: 'https://okdiario.com/espana/video-calleja-lanzarote',
            impact_level: 'critical',
            verdict: 'false',
            penalty_applied: -15.0,
            evidence_count: 3,
          },
          {
            id: 'trace-2',
            claim_id: 'claim-sample-2',
            title: 'Atribución falsa de prohibición de dinero en efectivo en comercios',
            summary:
              'Titular sensacionalista que aseguraba la ilegalización total del dinero físico en septiembre mediante un supuesto decreto inexistente.',
            detected_at: '2026-08-10T12:00:00Z',
            platform: 'X (Twitter)',
            origin_url: 'https://x.com/post/viral-cash-prohibition',
            impact_level: 'high',
            verdict: 'false',
            penalty_applied: -10.0,
            evidence_count: 2,
          },
        ],
      };

      setDossier(mockDossier);
      setLoading(false);
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [actorId]);

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280' }}>
        [DESENCRIPTANDO EXPEDIENTE DE INTELIGENCIA: {actorId}...]
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div style={{ padding: '40px 16px', maxWidth: '1280px', margin: '0 auto', color: '#f3f4f6' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              fontFamily: 'monospace',
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            ← Volver al Radar
          </button>
        )}
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '24px', borderRadius: '12px' }}>
          ⚠️ {error || 'No se encontró el expediente solicitado.'}
        </div>
      </div>
    );
  }

  const meta = getActorMeta(dossier.actor_type);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '24px 16px 80px',
        color: '#f3f4f6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={onBack || (() => window.history.back())}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#9ca3af',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← RADAR DE TOXICIDAD
        </button>

        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
          EXPEDIENTE: <span style={{ color: '#ef4444', fontWeight: 700 }}>AUDITADO</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 360px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: meta.badgeBg,
                  color: meta.badgeColor,
                  border: `1px solid ${meta.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{meta.icon}</span> {meta.label}
              </span>
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
                wordBreak: 'break-word',
              }}
            >
              {dossier.name}
            </h1>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', marginBottom: '24px' }}>
              ID: {dossier.id}
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginBottom: '8px' }}>
                ÍNDICE DE CONFIANZA HISTÓRICO
              </div>
              <ReputationMeter score={dossier.reputation_score} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
              }}
            >
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>TRAZAS TOTALES</div>
                <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>
                  {dossier.total_traces}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>CAMPAÑAS COORD.</div>
                <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>
                  {dossier.coordinated_campaigns}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>ALCANCE ESTIMADO</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#9ca3af', marginTop: '2px' }}>
                  {dossier.network_reach_estimate}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#60a5fa',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              [ ACCIONES DE CIBERDEFENSA ]
            </div>

            <button
              onClick={() => alert(`Aportar traza contra ${dossier.name}`)}
              style={{
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 700,
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>+</span> Aportar Traza de Desinformación
            </button>

            <button
              onClick={() => alert(`Vincular nuevo nodo a ${dossier.name}`)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e5e7eb',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 600,
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🔗</span> Vincular Nodo (Ej. Telegram)
            </button>

            <button
              onClick={() => alert(`Reportar patrón coordinado para ${dossier.name}`)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 600,
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span> Reportar Patrón Coordinado
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '12px',
            }}
          >
            <button
              onClick={() => setActiveTab('traces')}
              style={{
                background: activeTab === 'traces' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: activeTab === 'traces' ? '1px solid #3b82f6' : '1px solid transparent',
                color: activeTab === 'traces' ? '#60a5fa' : '#9ca3af',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              LÍNEA DE TIEMPO / TRAZAS ({dossier.traces.length})
            </button>

            <button
              onClick={() => setActiveTab('nodes')}
              style={{
                background: activeTab === 'nodes' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                border: activeTab === 'nodes' ? '1px solid #c084fc' : '1px solid transparent',
                color: activeTab === 'nodes' ? '#c084fc' : '#9ca3af',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              MAPA DE ENJAMBRES ({dossier.linked_nodes.length})
            </button>
          </div>

          {activeTab === 'traces' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dossier.traces.map((trace) => (
                <div
                  key={trace.id}
                  style={{
                    background: 'rgba(17, 24, 39, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        VEREDICTO: {trace.verdict.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
                        {new Date(trace.detected_at).toLocaleDateString()} · {trace.platform}
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {trace.penalty_applied} PTS
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.4 }}>
                    {trace.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: 1.55 }}>
                    {trace.summary}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '12px',
                      marginTop: '4px',
                    }}
                  >
                    <a
                      href={trace.origin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#60a5fa',
                        textDecoration: 'underline',
                      }}
                    >
                      Fuente origen registrada ↗
                    </a>

                    {onSelectClaim && (
                      <button
                        onClick={() => onSelectClaim(trace.claim_id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#10b981',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Ver Sala de Verificación →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ThreatGraph actor={dossier} height={400} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dossier.linked_nodes.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      background: 'rgba(17, 24, 39, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#c084fc', fontWeight: 700 }}>
                        {node.platform}
                      </div>
                      <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>
                        {node.handle_or_url}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>CONFIANZA VÍNCULO</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                        {node.confidence}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
