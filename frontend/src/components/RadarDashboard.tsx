import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export type ThreatLevel = 'CRÍTICO' | 'ALTO' | 'CONFIABLE';
export type ActorType = 'media' | 'social_account' | 'telegram_channel';

export interface ActorSummary {
  id: string;
  name: string;
  actor_type: ActorType;
  reputation_score: number;
  total_traces: number;
  last_detected_at: string | null;
}

interface RadarDashboardProps {
  onSelectActor?: (actorId: string) => void;
}

export function getThreatLevel(score: number): ThreatLevel {
  if (score < 50) return 'CRÍTICO';
  if (score < 80) return 'ALTO';
  return 'CONFIABLE';
}

export const FALLBACK_RADAR_ACTORS: ActorSummary[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Periodista Digital (@PeriodistaDigital)',
    actor_type: 'media',
    reputation_score: 42.0,
    total_traces: 4,
    last_detected_at: '2026-08-22T07:55:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: '@Okdiario',
    actor_type: 'media',
    reputation_score: 34.5,
    total_traces: 5,
    last_detected_at: '2026-08-16T18:39:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: '@Alvise_Canal_Noticias',
    actor_type: 'telegram_channel',
    reputation_score: 28.0,
    total_traces: 8,
    last_detected_at: '2026-08-12T14:10:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Liberal Digital 🇪🇸 (@Liberaldig)',
    actor_type: 'social_account',
    reputation_score: 38.0,
    total_traces: 3,
    last_detected_at: '2026-08-22T08:12:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Agencia EFE / RTVE',
    actor_type: 'media',
    reputation_score: 94.0,
    total_traces: 0,
    last_detected_at: null,
  },
];

export const RadarDashboard: React.FC<RadarDashboardProps> = ({ onSelectActor }) => {
  const navigate = useNavigate();
  const [actors, setActors] = useState<ActorSummary[]>(FALLBACK_RADAR_ACTORS);
  const [filterType, setFilterType] = useState<ActorType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchRadar = async () => {
      try {
        let res = await fetch('/api/actors/radar');
        if (!res.ok) {
          res = await fetch('https://current-app-qg6pp.ondigitalocean.app/api/actors/radar');
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setActors(data);
          }
        }
      } catch (err: any) {
        console.warn('Usando datos de radar iniciales:', err.message);
      }
    };
    fetchRadar();
  }, []);

  const handleRowClick = (actorId: string) => {
    if (onSelectActor) {
      onSelectActor(actorId);
    } else {
      navigate(`/actor/${actorId}`);
    }
  };

  const filteredActors = actors.filter((actor) => {
    const matchesType = filterType === 'all' || actor.actor_type === filterType;
    const matchesSearch = actor.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesType && matchesSearch;
  });

  const renderVectorBadge = (type: ActorType) => {
    switch (type) {
      case 'media':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            color: '#60a5fa',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
            MEDIO DIGITAL
          </span>
        );
      case 'telegram_channel':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '6px',
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            color: '#c084fc',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            TELEGRAM
          </span>
        );
      case 'social_account':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            CUENTA SOCIAL
          </span>
        );
    }
  };

  const renderThreatBadge = (threat: ThreatLevel) => {
    if (threat === 'CRÍTICO') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#f87171',
          fontFamily: 'monospace',
          fontSize: '11.5px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          CRÍTICO
        </span>
      );
    }
    if (threat === 'ALTO') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          fontFamily: 'monospace',
          fontSize: '11.5px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          ALTO
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        color: '#34d399',
        fontFamily: 'monospace',
        fontSize: '11.5px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        CONFIABLE
      </span>
    );
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* CABECERA */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '24px',
        marginBottom: '28px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 700,
            color: '#ef4444',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'inline-block',
              boxShadow: '0 0 8px #ef4444'
            }} />
            SISTEMA DE AUDITORÍA EN TIEMPO REAL
          </div>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            margin: '0 0 6px'
          }}>
            Radar de Actores y Vectores
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: '#94a3b8',
            margin: 0,
            maxWidth: '650px',
            lineHeight: 1.5
          }}>
            Monitorización comunitaria de nodos emisores y desinformación recurrente. Los índices de confianza se recalculan con rastro forense.
          </p>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar actor o @handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '9px 14px 9px 34px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
                width: '240px'
              }}
            />
            <svg style={{ position: 'absolute', left: '11px', top: '11px', color: '#64748b' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          <div style={{
            display: 'flex',
            background: '#0b1120',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}>
            {(['all', 'media', 'social_account', 'telegram_channel'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  background: filterType === type ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                  border: filterType === type ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  color: filterType === type ? '#f87171' : '#94a3b8',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {type === 'all' ? 'TODOS' : type === 'media' ? 'MEDIOS' : type === 'social_account' ? 'CUENTAS' : 'TELEGRAM'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* TABLA PRINCIPAL DE ALTA DENSIDAD */}
      <div style={{
        background: '#0b1120',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                background: 'rgba(15, 23, 42, 0.85)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                <th style={{ padding: '16px 20px', width: '38%' }}>Actor / Nodo Emisor</th>
                <th style={{ padding: '16px 18px', width: '16%' }}>Vector</th>
                <th style={{ padding: '16px 18px', width: '20%' }}>Índice de Confianza</th>
                <th style={{ padding: '16px 18px', width: '13%' }}>Nivel de Amenaza</th>
                <th style={{ padding: '16px 18px', width: '13%', textAlign: 'right' }}>Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {filteredActors.map((actor, idx) => {
                const threat = getThreatLevel(actor.reputation_score);
                const isCritical = threat === 'CRÍTICO';

                return (
                  <tr
                    key={actor.id}
                    onClick={() => handleRowClick(actor.id)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Columna 1: Actor */}
                    <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#475569',
                          width: '24px'
                        }}>
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#f8fafc',
                            marginBottom: '3px'
                          }}>
                            {actor.name}
                          </div>
                          <div style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#64748b'
                          }}>
                            ID: {actor.id.slice(0, 18)}... · {actor.total_traces} {actor.total_traces === 1 ? 'traza' : 'trazas'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Columna 2: Vector */}
                    <td style={{ padding: '18px 18px', verticalAlign: 'middle' }}>
                      {renderVectorBadge(actor.actor_type)}
                    </td>

                    {/* Columna 3: Índice de Confianza con Barra */}
                    <td style={{ padding: '18px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '170px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'monospace' }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isCritical ? '#f87171' : threat === 'ALTO' ? '#fbbf24' : '#34d399'
                          }}>
                            {actor.reputation_score.toFixed(1)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>/ 100.0</span>
                        </div>
                        <div style={{
                          height: '6px',
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, actor.reputation_score))}%`,
                            background: isCritical
                              ? '#ef4444'
                              : threat === 'ALTO'
                              ? '#f59e0b'
                              : '#10b981',
                            boxShadow: isCritical ? '0 0 8px #ef4444' : 'none',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </td>

                    {/* Columna 4: Nivel de Amenaza */}
                    <td style={{ padding: '18px 18px', verticalAlign: 'middle' }}>
                      {renderThreatBadge(threat)}
                    </td>

                    {/* Columna 5: Acción */}
                    <td style={{ padding: '18px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#60a5fa',
                        whiteSpace: 'nowrap'
                      }}>
                        Expediente →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
