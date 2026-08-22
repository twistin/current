import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getThreatLevel } from './RadarDashboard';
import { ThreatGraph } from './ThreatGraph';

export interface ForensicTrace {
  id: string;
  actor_id?: string;
  claim_title: string;
  forensic_summary: string;
  detected_at: string;
  platform: string;
  source_url: string;
  verdict: 'false' | 'misleading' | 'unproven' | string;
  penalty_score: number;
  verified_by_nodes: number;
}

export interface LinkedNode {
  id: string;
  platform: string;
  handle_or_url: string;
  confidence: number;
  linked_at: string;
}

export interface ActorDetailData {
  id: string;
  name: string;
  actor_type: 'media' | 'social_account' | 'telegram_channel' | string;
  reputation_score: number;
  first_seen_at: string;
  last_updated_at: string;
  network_reach_estimate?: string | null;
  coordinated_campaigns?: number;
  linked_nodes?: LinkedNode[];
  traces: ForensicTrace[];
}

export type ActorDetail = ActorDetailData;

interface ActorDossierProps {
  actorId?: string;
  onBack?: () => void;
}

const REALISTIC_DOSSIERS: Record<string, ActorDetailData> = {
  '11111111-1111-1111-1111-111111111111': {
    id: 'a8b2f910-c4e2-4119-971a-6d0e81b29a01',
    name: 'Periodista Digital (@PeriodistaDigital)',
    actor_type: 'media',
    reputation_score: 42.0,
    first_seen_at: '2025-01-10T10:00:00Z',
    last_updated_at: new Date().toISOString(),
    network_reach_estimate: '~480K visitas/mes',
    coordinated_campaigns: 4,
    linked_nodes: [
      { id: 'node-pd-1', platform: 'X', handle_or_url: '@Liberaldig', confidence: 0.92, linked_at: '2026-08-22' },
      { id: 'node-pd-2', platform: 'Telegram', handle_or_url: 't.me/alertas_esp_noticias', confidence: 0.88, linked_at: '2026-08-22' },
    ],
    traces: [
      {
        id: 'trace-pd-1',
        claim_title: 'Atribución no probada de subida electoral de VOX a la supuesta "traición en Ceuta" sin ficha técnica oficial',
        forensic_summary: 'Recicló una encuesta de Sigma Dos de febrero de 2026 y la presentó en agosto como actual, multiplicando por siete las cifras de entradas irregulares en Ceuta (más de 70.000).',
        detected_at: '2026-08-22T07:55:00Z',
        platform: 'Web / X',
        source_url: 'https://www.periodistadigital.com/politica/20260822/noticia-vox-ceuta-encuestas/',
        verdict: 'false',
        penalty_score: -15.0,
        verified_by_nodes: 3,
      },
    ],
  },
  '22222222-2222-2222-2222-222222222222': {
    id: 'f4c91a02-581b-4d22-b01f-9988a1e520bc',
    name: '@Okdiario',
    actor_type: 'media',
    reputation_score: 34.5,
    first_seen_at: '2024-11-04T12:00:00Z',
    last_updated_at: new Date().toISOString(),
    network_reach_estimate: '~1.2M visitas/mes',
    coordinated_campaigns: 5,
    linked_nodes: [
      { id: 'node-ok-1', platform: 'X', handle_or_url: '@okdiario_alertas', confidence: 0.95, linked_at: '2026-08-16' },
    ],
    traces: [
      {
        id: 'trace-ok-1',
        claim_title: 'Coche oficial sin matrícula traslada a invitados a La Mareta tras aterrizar en Lanzarote',
        forensic_summary: 'Vídeo descontextualizado en el aeropuerto de Lanzarote. El vehículo pertenecía a la delegación insular y cumplía la normativa sin traslados irregulares.',
        detected_at: '2026-08-16T18:39:00Z',
        platform: 'X (Twitter)',
        source_url: 'https://okdiario.com/investigacion/lanzarote-mareta-coches-1234',
        verdict: 'false',
        penalty_score: -18.0,
        verified_by_nodes: 5,
      },
    ],
  },
  '33333333-3333-3333-3333-333333333333': {
    id: 'e710b844-3d9a-4122-86ee-54091a1cd40f',
    name: '@Alvise_Canal_Noticias',
    actor_type: 'telegram_channel',
    reputation_score: 28.0,
    first_seen_at: '2024-06-12T14:00:00Z',
    last_updated_at: new Date().toISOString(),
    network_reach_estimate: '~520K suscriptores',
    coordinated_campaigns: 8,
    linked_nodes: [
      { id: 'node-al-1', platform: 'Telegram', handle_or_url: 't.me/alvise_respaldo', confidence: 0.98, linked_at: '2026-08-10' },
      { id: 'node-al-2', platform: 'X', handle_or_url: '@AlvisePerez_Bot', confidence: 0.91, linked_at: '2026-08-12' },
    ],
    traces: [
      {
        id: 'trace-al-1',
        claim_title: 'Filtración de supuestos expedientes judiciales confidenciales en la Audiencia Nacional',
        forensic_summary: 'Documento fabricado en plantilla digital sin firma electrónica ni número de procedimiento judicial válido.',
        detected_at: '2026-08-12T14:10:00Z',
        platform: 'Telegram',
        source_url: 'https://t.me/alvise_canal_noticias/8912',
        verdict: 'false',
        penalty_score: -22.0,
        verified_by_nodes: 7,
      },
    ],
  },
  '44444444-4444-4444-4444-444444444444': {
    id: 'b39174df-e841-4702-b0cc-189a02fb1011',
    name: 'Liberal Digital 🇪🇸 (@Liberaldig)',
    actor_type: 'social_account',
    reputation_score: 38.0,
    first_seen_at: '2025-03-01T09:00:00Z',
    last_updated_at: new Date().toISOString(),
    network_reach_estimate: '~45K seguidores',
    coordinated_campaigns: 3,
    linked_nodes: [
      { id: 'node-lib-1', platform: 'Web', handle_or_url: 'periodistadigital.com', confidence: 0.94, linked_at: '2026-08-22' },
    ],
    traces: [
      {
        id: 'trace-lib-1',
        claim_title: 'Difusión de titular sobre 70.000 inmigrantes en Ceuta y encuestas electorales anacrónicas',
        forensic_summary: 'Nodo satélite de amplificación en X de noticias manipuladas procedentes de Periodista Digital.',
        detected_at: '2026-08-22T08:12:00Z',
        platform: 'X (Twitter)',
        source_url: 'https://x.com/Liberaldig/status/1787430297213',
        verdict: 'false',
        penalty_score: -12.0,
        verified_by_nodes: 2,
      },
    ],
  },
};

export const ActorDossier: React.FC<ActorDossierProps> = ({
  actorId: propActorId,
  onBack: propOnBack,
}) => {
  const { id: routeActorId } = useParams<{ id: string }>();
  const idToFetch = propActorId || routeActorId || '11111111-1111-1111-1111-111111111111';
  const navigate = useNavigate();

  const [actor, setActor] = useState<ActorDetailData | null>(REALISTIC_DOSSIERS[idToFetch] || null);
  const [activeTab, setActiveTab] = useState<'traces' | 'graph'>('traces');

  useEffect(() => {
    const fetchDossier = async () => {
      if (!idToFetch) return;
      try {
        let res = await fetch(`/api/actors/${idToFetch}`);
        if (!res.ok) {
          res = await fetch(`https://current-app-qg6pp.ondigitalocean.app/api/actors/${idToFetch}`);
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setActor(data);
          }
        }
      } catch (err: any) {
        console.warn('Usando expediente en caché:', err.message);
      }
    };

    fetchDossier();
  }, [idToFetch]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      navigate('/radar');
    }
  };

  const currentActor = actor || REALISTIC_DOSSIERS[idToFetch] || REALISTIC_DOSSIERS['11111111-1111-1111-1111-111111111111'];
  const threat = getThreatLevel(currentActor.reputation_score);
  const isCritical = threat === 'CRÍTICO';
  const linkedNodes = currentActor.linked_nodes || [];

  return (
    <div style={{
      width: '100%',
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* BARRA SUPERIOR: NAVEGACIÓN Y ESTADO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '16px',
        marginBottom: '24px'
      }}>
        <button
          onClick={handleBack}
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'monospace',
            padding: '7px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← VOLVER AL RADAR
        </button>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#64748b'
        }}>
          ESTADO: <span style={{ color: '#f87171', fontWeight: 700 }}>BAJO AUDITORÍA ACTIVA</span>
        </div>
      </div>

      {/* CABECERA PRINCIPAL EN GRID */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Tarjeta 1: Perfil y Datos Forenses */}
        <div style={{
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px'
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 600
              }}>
                {currentActor.actor_type === 'media' ? '📰 MEDIO DIGITAL' : currentActor.actor_type === 'telegram_channel' ? '✈️ CANAL TELEGRAM' : '⚡ CUENTA SOCIAL'}
              </span>

              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                Primer registro: {new Date(currentActor.first_seen_at).toLocaleDateString([], { dateStyle: 'medium' })}
              </span>
            </div>

            <h1 style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 6px',
              letterSpacing: '-0.02em'
            }}>
              {currentActor.name}
            </h1>

            <div style={{
              fontFamily: 'monospace',
              fontSize: '11.5px',
              color: '#64748b',
              marginBottom: '20px'
            }}>
              ID REGISTRO: <span style={{ color: '#94a3b8' }}>{currentActor.id}</span>
            </div>
          </div>

          {/* Estadísticas en 3 columnas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '16px'
          }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase' }}>Trazas</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>{currentActor.traces.length}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase' }}>Campañas</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f87171', marginTop: '2px' }}>{currentActor.coordinated_campaigns ?? 0}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase' }}>Alcance</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginTop: '6px' }}>{currentActor.network_reach_estimate || '~N/A'}</div>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Índice de Confianza y Acciones */}
        <div style={{
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px'
            }}>
              Índice de Confianza Histórico
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: 'monospace' }}>
              <span style={{
                fontSize: '44px',
                fontWeight: 800,
                color: isCritical ? '#ef4444' : threat === 'ALTO' ? '#f59e0b' : '#10b981',
                lineHeight: 1
              }}>
                {currentActor.reputation_score.toFixed(1)}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>/ 100.0</span>
            </div>

            <div style={{
              height: '8px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '12px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, currentActor.reputation_score))}%`,
                background: isCritical ? '#ef4444' : threat === 'ALTO' ? '#f59e0b' : '#10b981',
                boxShadow: isCritical ? '0 0 10px #ef4444' : 'none'
              }} />
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => alert(`Aportar prueba forense para ${currentActor.name}`)}
              style={{
                flex: 1,
                minWidth: '150px',
                background: '#dc2626',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>+</span> Aportar Traza Forense
            </button>
            <button
              onClick={() => alert(`Vincular nodo a ${currentActor.name}`)}
              style={{
                flex: 1,
                minWidth: '150px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔗</span> Vincular Nodo Satélite
            </button>
          </div>
        </div>
      </section>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('traces')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'traces' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'traces' ? '#ffffff' : '#94a3b8',
            fontFamily: 'monospace',
            fontSize: '12.5px',
            fontWeight: activeTab === 'traces' ? 700 : 500,
            padding: '8px 16px 12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📋</span> REGISTRO DE TRAZAS ({currentActor.traces.length})
        </button>

        {linkedNodes.length > 0 && (
          <button
            onClick={() => setActiveTab('graph')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'graph' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'graph' ? '#ffffff' : '#94a3b8',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              fontWeight: activeTab === 'graph' ? 700 : 500,
              padding: '8px 16px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🕸️</span> MAPA DE ENJAMBRES ({linkedNodes.length})
          </button>
        )}
      </div>

      {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
      {activeTab === 'traces' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentActor.traces.length === 0 ? (
            <div style={{
              background: '#0b1120',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#64748b'
            }}>
              [ No constan trazas forenses registradas para este actor ]
            </div>
          ) : (
            currentActor.traces.map((trace) => (
              <article
                key={trace.id}
                style={{
                  background: '#0b1120',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      VEREDICTO: {trace.verdict === 'false' ? 'FALSO / FABRICADO' : trace.verdict.toUpperCase()}
                    </span>

                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                      {new Date(trace.detected_at).toLocaleDateString([], { dateStyle: 'medium' })} · {trace.platform}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '3px 9px',
                    borderRadius: '6px'
                  }}>
                    PENALIZACIÓN: {trace.penalty_score} PTS
                  </span>
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '4px 0 0',
                  lineHeight: 1.4
                }}>
                  {trace.claim_title}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  lineHeight: 1.55,
                  margin: 0
                }}>
                  {trace.forensic_summary}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '12px',
                  marginTop: '4px',
                  fontFamily: 'monospace',
                  fontSize: '11.5px'
                }}>
                  <a
                    href={trace.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Inspeccionar URL de Origen ↗
                  </a>

                  <span style={{ color: '#64748b' }}>
                    Auditado por <strong style={{ color: '#cbd5e1' }}>{trace.verified_by_nodes}</strong> nodos verificadores
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div style={{
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px',
          overflow: 'hidden'
        }}>
          <ThreatGraph
            actor={{
              id: currentActor.id,
              name: currentActor.name,
              linked_nodes: linkedNodes,
            }}
            height={420}
          />
        </div>
      )}
    </div>
  );
};
