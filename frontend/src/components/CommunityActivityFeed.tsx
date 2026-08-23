import React, { useState, useEffect } from 'react';

export interface CommunityEvent {
  id: string;
  type: 'evidence_added' | 'claim_reported' | 'verdict_reached' | 'node_linked' | 'shield_intercept';
  pseudonym: string;
  action_text: string;
  target_title: string;
  target_url?: string;
  timestamp: string;
  points_impact?: number;
}

export const SEED_COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: 'evt-1',
    type: 'evidence_added',
    pseudonym: '@twistin',
    action_text: 'aportó fuente jurídica oficial de la Legislatura de NJ en',
    target_title: 'Ley sobre instalaciones sanitarias y libertad de culto',
    target_url: '/claims/805d3976-6db6-4a51-995a-4a0dd978503f',
    timestamp: 'Hace 4 min',
    points_impact: 15,
  },
  {
    id: 'evt-2',
    type: 'verdict_reached',
    pseudonym: 'Red Comunitaria',
    action_text: 'resolvió con veredicto FALSO el bulo de',
    target_title: 'Periodista Digital / 70.000 entradas en Ceuta',
    target_url: '/claims/77639856-7615-4c5b-b138-dd03a700fe48',
    timestamp: 'Hace 12 min',
    points_impact: 25,
  },
  {
    id: 'evt-3',
    type: 'node_linked',
    pseudonym: '@sol_osint',
    action_text: 'vinculó el nodo satélite @Liberaldig al expediente de',
    target_title: 'Periodista Digital (@PeriodistaDigital)',
    target_url: '/actor/11111111-1111-1111-1111-111111111111',
    timestamp: 'Hace 28 min',
    points_impact: 10,
  },
  {
    id: 'evt-4',
    type: 'shield_intercept',
    pseudonym: 'Escudo Táctico',
    action_text: 'neutralizó 34 impresiones en el feed de X de',
    target_title: 'Tuit engañoso sobre traslado en Lanzarote',
    target_url: '/claims/22222222-2222-2222-2222-222222222222',
    timestamp: 'Hace 45 min',
  },
  {
    id: 'evt-5',
    type: 'claim_reported',
    pseudonym: '@kai_audit',
    action_text: 'incorporó a la cola de verificación la alerta:',
    target_title: 'Vídeo descontextualizado en aeropuerto de Lanzarote',
    target_url: '/claims/22222222-2222-2222-2222-222222222222',
    timestamp: 'Hace 1 hora',
    points_impact: 5,
  },
];

interface CommunityActivityFeedProps {
  onNavigateToClaim?: (claimId: string) => void;
}

export const CommunityActivityFeed: React.FC<CommunityActivityFeedProps> = () => {
  const [events] = useState<CommunityEvent[]>(SEED_COMMUNITY_EVENTS);
  const [activeAuditorsCount, setActiveAuditorsCount] = useState(23);

  // Simulación de fluctuación orgánica de nodos activos en vivo
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAuditorsCount((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, o +1
        return Math.max(18, Math.min(35, prev + delta));
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const renderEventIcon = (type: CommunityEvent['type']) => {
    switch (type) {
      case 'evidence_added':
        return <span style={{ color: '#60a5fa' }}>🔬</span>;
      case 'verdict_reached':
        return <span style={{ color: '#ef4444' }}>⚖️</span>;
      case 'node_linked':
        return <span style={{ color: '#c084fc' }}>🔗</span>;
      case 'shield_intercept':
        return <span style={{ color: '#34d399' }}>🛡️</span>;
      case 'claim_reported':
      default:
        return <span style={{ color: '#fbbf24' }}>🚨</span>;
    }
  };

  return (
    <div style={{
      background: '#0b1120',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '14px',
      padding: '16px 20px',
      marginBottom: '28px',
      boxShadow: '0 12px 28px -10px rgba(0, 0, 0, 0.6)'
    }}>
      {/* Cabecera del Feed */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        paddingBottom: '12px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }} />
          <span style={{
            fontFamily: 'monospace',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            Actividad de la Red en Vivo
          </span>
        </div>

        {/* Indicador de Nodos Activos */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#34d399',
          fontWeight: 600
        }}>
          <span>👥</span>
          <span>{activeAuditorsCount} auditores patrullando</span>
        </div>
      </div>

      {/* Lista de Eventos Recientes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.slice(0, 3).map((evt) => (
          <div
            key={evt.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12.5px',
              color: '#cbd5e1',
              padding: '6px 8px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <span style={{ fontSize: '14px' }}>{renderEventIcon(evt.type)}</span>
              <strong style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px' }}>
                {evt.pseudonym}
              </strong>
              <span style={{ color: '#94a3b8' }}>{evt.action_text}</span>
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                “{evt.target_title}”
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {evt.points_impact && (
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '10.5px',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  +{evt.points_impact} PTS
                </span>
              )}
              <span style={{
                fontFamily: 'monospace',
                fontSize: '10.5px',
                color: '#64748b',
                whiteSpace: 'nowrap'
              }}>
                {evt.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
