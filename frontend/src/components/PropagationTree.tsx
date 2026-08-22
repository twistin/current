import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Tipos del Linaje Genealógico
// ---------------------------------------------------------------------------

export type NodeStage = 'origin_source' | 'mutation_factory' | 'amplifier_node' | 'viral_impact';

export interface PropagationNode {
  id: string;
  stage: NodeStage;
  actor_name: string;
  actor_type: 'media' | 'social_account' | 'telegram_channel' | 'official';
  timestamp: string;
  title_or_post: string;
  url: string;
  mutation_type?: string;
  reach_estimate?: string;
  notes: string;
  parent_id?: string | null;
}

interface PropagationTreeProps {
  claimId: string;
  claimSummary?: string;
  initialNodes?: PropagationNode[];
  onAddLink?: () => void;
}

function getStageBadge(stage: NodeStage) {
  switch (stage) {
    case 'origin_source':
      return {
        label: 'NIVEL 0 · FUENTE CITADA',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.35)',
        color: '#60a5fa',
        icon: '🌱',
      };
    case 'mutation_factory':
      return {
        label: 'NIVEL 1 · LA FÁBRICA / MUTACIÓN',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.45)',
        color: '#f87171',
        icon: '🏭',
      };
    case 'amplifier_node':
      return {
        label: 'NIVEL 2 · NODO AMPLIFICADOR',
        bg: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.35)',
        color: '#c084fc',
        icon: '📡',
      };
    case 'viral_impact':
    default:
      return {
        label: 'NIVEL 3 · IMPACTO EN FEED',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#fbbf24',
        icon: '👥',
      };
  }
}

export const PropagationTree: React.FC<PropagationTreeProps> = ({
  claimId,
  claimSummary,
  initialNodes,
  onAddLink,
}) => {
  // Generar nodos contextuales si no se pasan por props
  const defaultNodesForClaim: PropagationNode[] = initialNodes || [
    {
      id: `node-${claimId}-1`,
      stage: 'mutation_factory',
      actor_name: 'Nodo Emisor de la Noticia',
      actor_type: 'media',
      timestamp: new Date().toISOString(),
      title_or_post: claimSummary || 'Contenido detectado en auditoría',
      url: '#',
      mutation_type: '⚠️ Publicación sin verificación de fuentes primarias',
      reach_estimate: '~Alcance inicial en redes',
      notes: 'Origen reportado y registrado en la sala de ciberdefensa.',
      parent_id: null,
    },
  ];

  const [nodes, setNodes] = useState<PropagationNode[]>(defaultNodesForClaim);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form state
  const [newActor, setNewActor] = useState<string>('');
  const [newStage, setNewStage] = useState<NodeStage>('amplifier_node');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newMutation, setNewMutation] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActor.trim() || !newTitle.trim()) return;

    const newNode: PropagationNode = {
      id: `node-${Date.now()}`,
      stage: newStage,
      actor_name: newActor.trim(),
      actor_type: newStage === 'amplifier_node' ? 'social_account' : 'media',
      timestamp: new Date().toISOString(),
      title_or_post: newTitle.trim(),
      url: newUrl.trim() || '#',
      mutation_type: newMutation.trim() || undefined,
      notes: newNotes.trim() || 'Aportado por la comunidad en la auditoría.',
      parent_id: nodes[nodes.length - 1]?.id || null,
    };

    setNodes([...nodes, newNode]);
    setShowAddModal(false);
    setNewActor('');
    setNewTitle('');
    setNewUrl('');
    setNewMutation('');
    setNewNotes('');
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px 28px',
      marginTop: '24px',
      boxShadow: 'var(--card-shadow)',
      color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* CABECERA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid var(--border-soft)',
        paddingBottom: '18px',
        marginBottom: '24px'
      }}>
        <div>
          <div className="mono" style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            🌳 TRAZABILIDAD GENEALÓGICA FORENSE
          </div>
          <h3 className="serif" style={{
            fontSize: '22px',
            fontWeight: 600,
            margin: '0 0 6px',
            color: 'var(--text)'
          }}>
            Árbol de Linaje y Propagación
          </h3>
          <p style={{
            fontSize: '12.5px',
            color: 'var(--text-soft)',
            margin: 0,
            maxWidth: '650px',
            lineHeight: 1.5
          }}>
            Mapeo estructural de la desinformación: documenta la cadena de actores, desde la tergiversación inicial hasta las cuentas satélite que amplificaron el contenido.
          </p>
        </div>

        <button
          onClick={() => (onAddLink ? onAddLink() : setShowAddModal(true))}
          className="mono"
          style={{
            background: 'var(--accent)',
            border: 'none',
            color: '#ffffff',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>+</span> Añadir Eslabón al Linaje
        </button>
      </div>

      {/* LISTA ESTRUCTURADA DE NODOS DEL LINAJE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {nodes.map((node, idx) => {
          const badge = getStageBadge(node.stage);

          return (
            <div
              key={node.id}
              style={{
                position: 'relative',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-soft)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Header de la tarjeta */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span className="mono" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.color,
                  fontSize: '10.5px',
                  fontWeight: 600
                }}>
                  <span>{badge.icon}</span> {badge.label}
                </span>

                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                  Eslabón #{idx + 1} · {new Date(node.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              {/* Actor & Titular */}
              <div>
                <div className="mono" style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginBottom: '3px' }}>
                  Actor: <strong style={{ color: 'var(--text)' }}>{node.actor_name}</strong>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                  “{node.title_or_post}”
                </div>
              </div>

              {/* Mutación */}
              {node.mutation_type && (
                <div>
                  <span className="mono" style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {node.mutation_type}
                  </span>
                </div>
              )}

              {/* Notas */}
              {node.notes && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-soft)',
                  background: 'var(--surface-3)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  {node.notes}
                </p>
              )}

              {/* Footer */}
              <div className="mono" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                borderTop: '1px solid var(--border-soft)',
                paddingTop: '8px',
                marginTop: '4px'
              }}>
                {node.url && node.url !== '#' ? (
                  <a
                    href={node.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    Inspeccionar URL de prueba ↗
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-faint)' }}>Registro interno</span>
                )}

                {node.reach_estimate && (
                  <span style={{ color: 'var(--text-faint)' }}>
                    Alcance: <strong style={{ color: 'var(--text-soft)' }}>{node.reach_estimate}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: 'var(--card-shadow)'
          }}>
            <h3 className="mono" style={{ fontSize: '15px', color: 'var(--text)', margin: '0 0 8px' }}>
              [ + Añadir Eslabón al Linaje ]
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Registra una cuenta de X, canal de Telegram o réplica web que haya participado en la cadena de propagación.
            </p>

            <form onSubmit={handleAddNode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block', marginBottom: '4px' }}>
                  Nivel / Rol en la Cadena:
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as NodeStage)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--text)',
                    fontSize: '12px'
                  }}
                >
                  <option value="origin_source">Nivel 0: Fuente de referencia citada</option>
                  <option value="mutation_factory">Nivel 1: Fábrica / Mutación de la noticia</option>
                  <option value="amplifier_node">Nivel 2: Nodo Satélite / Amplificación (X / Telegram)</option>
                  <option value="viral_impact">Nivel 3: Viralización en feed / grupos</option>
                </select>
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block', marginBottom: '4px' }}>
                  Nombre del Actor / Cuenta:
                </label>
                <input
                  type="text"
                  placeholder="ej. @Okdiario, @Liberaldig, Canal Alertas..."
                  value={newActor}
                  onChange={(e) => setNewActor(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--text)',
                    fontSize: '12px'
                  }}
                  required
                />
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block', marginBottom: '4px' }}>
                  Titular o Texto del Post:
                </label>
                <input
                  type="text"
                  placeholder="Texto literal difundido..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--text)',
                    fontSize: '12px'
                  }}
                  required
                />
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block', marginBottom: '4px' }}>
                  URL de la Prueba:
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/... o https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--text)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)', display: 'block', marginBottom: '4px' }}>
                  Tipo de Mutación (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="ej. Vídeo descontextualizado, Reciclaje de fecha..."
                  value={newMutation}
                  onChange={(e) => setNewMutation(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'var(--text)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-soft)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Guardar Eslabón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
