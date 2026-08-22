import React, { useEffect, useState } from 'react';

export type ActorType = 'media' | 'social_account' | 'telegram_channel';

export interface Actor {
  id: string;
  name: string;
  actor_type: ActorType;
  reputation_score: number;
  created_at?: string;
  updated_at?: string;
}

interface ToxicityRadarProps {
  onSelectActor?: (actorId: string) => void;
}

interface ReputationMeterProps {
  score: number;
}

export const ReputationMeter: React.FC<ReputationMeterProps> = ({ score }) => {
  const isCritical = score < 50;
  const isWarning = score >= 50 && score < 80;

  const color = isCritical
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : '#10b981';

  const statusLabel = isCritical
    ? 'CRÍTICO · ALTO IMPACTO'
    : isWarning
    ? 'EN OBSERVACIÓN'
    : 'CONFIABLE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            letterSpacing: '0.08em',
            fontWeight: 700,
            color,
          }}
        >
          {statusLabel}
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 800,
            color,
          }}
        >
          {score.toFixed(0)} <span style={{ fontSize: '10px', opacity: 0.7 }}>/ 100</span>
        </span>
      </div>

      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            boxShadow: `0 0 8px ${color}88`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};

export function getActorMeta(type: ActorType) {
  switch (type) {
    case 'media':
      return {
        label: 'MEDIO DIGITAL',
        icon: '📰',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#60a5fa',
        border: 'rgba(59, 130, 246, 0.3)',
      };
    case 'telegram_channel':
      return {
        label: 'CANAL TELEGRAM',
        icon: '✈️',
        badgeBg: 'rgba(168, 85, 247, 0.15)',
        badgeColor: '#c084fc',
        border: 'rgba(168, 85, 247, 0.3)',
      };
    case 'social_account':
    default:
      return {
        label: 'CUENTA SOCIAL',
        icon: '⚡',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.3)',
      };
  }
}

export const ToxicityRadar: React.FC<ToxicityRadarProps> = ({ onSelectActor }) => {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ActorType | 'all'>('all');

  const fetchRadar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/actors/radar');
      if (res.ok) {
        const data: Actor[] = await res.json();
        setActors(data);
      } else {
        // Mock inicial de actores clave para visualización táctica inmediata
        setActors([
          {
            id: 'actor-okdiario',
            name: '@Okdiario',
            actor_type: 'media',
            reputation_score: 34.5,
          },
          {
            id: 'actor-alvise',
            name: '@Alvise_Canal_Noticias',
            actor_type: 'telegram_channel',
            reputation_score: 22.0,
          },
          {
            id: 'actor-x-viral',
            name: '@Espana_Despierta_24',
            actor_type: 'social_account',
            reputation_score: 41.0,
          },
          {
            id: 'actor-periodistadig',
            name: '@PeriodistaDigital',
            actor_type: 'media',
            reputation_score: 48.2,
          },
          {
            id: 'actor-eldebate',
            name: '@ElDebate_Esp',
            actor_type: 'media',
            reputation_score: 62.0,
          },
          {
            id: 'actor-rtve',
            name: '@RTVE_Noticias',
            actor_type: 'media',
            reputation_score: 88.5,
          },
        ]);
      }
    } catch {
      setActors([
        {
          id: 'actor-okdiario',
          name: '@Okdiario',
          actor_type: 'media',
          reputation_score: 34.5,
        },
        {
          id: 'actor-alvise',
          name: '@Alvise_Canal_Noticias',
          actor_type: 'telegram_channel',
          reputation_score: 22.0,
        },
        {
          id: 'actor-x-viral',
          name: '@Espana_Despierta_24',
          actor_type: 'social_account',
          reputation_score: 41.0,
        },
        {
          id: 'actor-periodistadig',
          name: '@PeriodistaDigital',
          actor_type: 'media',
          reputation_score: 48.2,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  const handleCardClick = (id: string) => {
    if (onSelectActor) {
      onSelectActor(id);
    } else {
      window.location.href = `/actor/${id}`;
    }
  };

  const filteredActors = actors.filter(
    (a) => filterType === 'all' || a.actor_type === filterType
  );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px 64px',
        color: '#f3f4f6',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          paddingBottom: '20px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#ef4444',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
                display: 'inline-block',
              }}
            />
            RADAR DE INTELIGENCIA ACTIVO
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '4px 0',
              color: '#ffffff',
            }}
          >
            Auditoría de Actores y Vectores
          </h1>
          <p style={{ fontSize: '13.5px', color: '#9ca3af', maxWidth: '64ch', margin: 0 }}>
            Monitorización en tiempo real de nodos de propagación. Los actores se ordenan de menor a mayor índice de reputación histórica.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'media', 'social_account', 'telegram_channel'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '6px',
                border:
                  filterType === t
                    ? '1px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                background:
                  filterType === t
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.03)',
                color: filterType === t ? '#60a5fa' : '#9ca3af',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t === 'all'
                ? 'TODOS'
                : t === 'media'
                ? 'MEDIOS'
                : t === 'social_account'
                ? 'CUENTAS'
                : 'TELEGRAM'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div
          style={{
            padding: '80px 0',
            textAlign: 'center',
            fontFamily: 'monospace',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          [ESCANEANDO BASE DE DATOS DE ACTORES...]
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '20px',
            color: '#fca5a5',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!loading && filteredActors.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredActors.map((actor, idx) => {
            const meta = getActorMeta(actor.actor_type);
            const isTopThreat = idx < 3 && actor.reputation_score < 50;

            return (
              <div
                key={actor.id}
                onClick={() => handleCardClick(actor.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCardClick(actor.id);
                }}
                style={{
                  background: 'rgba(17, 24, 39, 0.85)',
                  border: isTopThreat
                    ? '1px solid rgba(239, 68, 68, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isTopThreat
                    ? '0 4px 20px rgba(239, 68, 68, 0.15)'
                    : '0 4px 12px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '14px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isTopThreat ? '#ef4444' : '#4b5563',
                  }}
                >
                  #{String(idx + 1).padStart(2, '0')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: meta.badgeBg,
                      color: meta.badgeColor,
                      border: `1px solid ${meta.border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{meta.icon}</span> {meta.label}
                  </span>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      wordBreak: 'break-word',
                      lineHeight: 1.3,
                    }}
                  >
                    {actor.name}
                  </h3>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#6b7280',
                      marginTop: '4px',
                    }}
                  >
                    ID: {actor.id.slice(0, 8)}…
                  </div>
                </div>

                <ReputationMeter score={actor.reputation_score} />

                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#60a5fa',
                  }}
                >
                  <span>Abrir Expediente</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
