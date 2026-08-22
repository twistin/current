import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Tipos del Linaje Genealógico de la Desinformación
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
  mutation_type?: string; // ej. 'Anacronismo deliberado', 'Cifras infladas 70.000', 'Amplificación coordinada'
  reach_estimate?: string;
  notes: string;
  parent_id?: string | null;
}

interface PropagationTreeProps {
  claimId: string;
  initialNodes?: PropagationNode[];
  onAddLink?: () => void;
}

function getStageMeta(stage: NodeStage) {
  switch (stage) {
    case 'origin_source':
      return {
        label: 'NIVEL 0 · FUENTE CITADA',
        badgeColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
        cardBorder: 'border-blue-500/50 hover:border-blue-400',
        glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        headerBg: 'bg-blue-950/40',
        dotColor: 'bg-blue-500',
        icon: '🌱',
      };
    case 'mutation_factory':
      return {
        label: 'NIVEL 1 · FÁBRICA / MUTACIÓN',
        badgeColor: 'border-red-500/50 text-red-400 bg-red-950/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
        cardBorder: 'border-red-500/60 hover:border-red-400',
        glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
        headerBg: 'bg-red-950/50',
        dotColor: 'bg-red-500 animate-pulse',
        icon: '🏭',
      };
    case 'amplifier_node':
      return {
        label: 'NIVEL 2 · NODO AMPLIFICADOR',
        badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
        cardBorder: 'border-purple-500/50 hover:border-purple-400',
        glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
        headerBg: 'bg-purple-950/40',
        dotColor: 'bg-purple-500',
        icon: '📡',
      };
    case 'viral_impact':
    default:
      return {
        label: 'NIVEL 3 · IMPACTO EN FEED',
        badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
        cardBorder: 'border-amber-500/50 hover:border-amber-400',
        glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        headerBg: 'bg-amber-950/40',
        dotColor: 'bg-amber-500',
        icon: '👥',
      };
  }
}

const DEFAULT_NODES: PropagationNode[] = [
  {
    id: 'node-0',
    stage: 'origin_source',
    actor_name: 'El Mundo (Marta Belver)',
    actor_type: 'media',
    timestamp: '2026-08-21T01:15:00Z',
    title_or_post: 'El Gobierno en alerta ante el rédito para Vox de la crisis en Ceuta',
    url: 'https://www.elmundo.es/espana/2026/08/21/6a873531e9cf4a6c0c8b456e.html',
    mutation_type: 'Análisis político cualitativo',
    reach_estimate: 'Lectorado general',
    notes: 'Cita la encuesta de Sigma Dos realizada en FEBRERO de 2026 (hace 6 meses) sobre la regularización de extranjeros.',
    parent_id: null,
  },
  {
    id: 'node-1',
    stage: 'mutation_factory',
    actor_name: 'Periodista Digital (Mario Lima)',
    actor_type: 'media',
    timestamp: '2026-08-22T07:55:00Z',
    title_or_post: 'VOX se dispara en las encuestas impulsado por la ‘traición’ de Sánchez en Ceuta',
    url: 'https://www.periodistadigital.com/politica/20260822/noticia-vox-ceuta-encuestas/',
    mutation_type: '⚠️ Anacronismo (recicla fecha) + Cifras infladas 70.000',
    reach_estimate: '~480K visitas potenciales',
    notes: 'Recicla la encuesta de febrero vendiéndola como sondeo actual de agosto e infla la cifra migratoria.',
    parent_id: 'node-0',
  },
  {
    id: 'node-2',
    stage: 'amplifier_node',
    actor_name: 'Liberal Digital 🇪🇸 (@Liberaldig)',
    actor_type: 'social_account',
    timestamp: '2026-08-22T08:12:00Z',
    title_or_post: '🔴 VOX se dispara en las encuestas impulsado por la ‘traición’ de Sánchez en Ceuta y la sensación de que España va a la deriva',
    url: 'https://x.com/Liberaldig/status/1787430297213',
    mutation_type: '⚡ Amplificación sensacionalista en X',
    reach_estimate: '~12.000 visualizaciones',
    notes: 'Enlaza a periodistadigital.com sin verificar la fecha de la encuesta.',
    parent_id: 'node-1',
  },
  {
    id: 'node-3',
    stage: 'amplifier_node',
    actor_name: 'Canal Noticias Inmediatas (Telegram)',
    actor_type: 'telegram_channel',
    timestamp: '2026-08-22T08:28:00Z',
    title_or_post: 'URGENTE: Encuestas dan 63 diputados a Vox tras el caos en Ceuta',
    url: 'https://t.me/alertas_esp_noticias',
    mutation_type: '📲 Reenvío masivo en canales',
    reach_estimate: '~35.000 suscriptores',
    notes: 'Reenvía el enlace recortado a la web con titulares de clickbait intercalados.',
    parent_id: 'node-1',
  },
  {
    id: 'node-4',
    stage: 'viral_impact',
    actor_name: 'Audiencia y Cuentas Espejo',
    actor_type: 'social_account',
    timestamp: '2026-08-22T09:00:00Z',
    title_or_post: 'Replicación en hilos y retuits con enlaces a Periodista Digital',
    url: '#',
    mutation_type: '👥 Impacto no verificado en el feed',
    reach_estimate: '~50K impactos agregados',
    notes: 'Los usuarios asumen como real una encuesta de febrero pensando que es de hoy.',
    parent_id: 'node-2',
  },
];

export const PropagationTree: React.FC<PropagationTreeProps> = ({
  initialNodes = DEFAULT_NODES,
  onAddLink,
}) => {
  const [nodes, setNodes] = useState<PropagationNode[]>(initialNodes);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'tree' | 'timeline'>('tree');

  // Separar nodos por niveles de linaje para el diagrama de árbol
  const level0 = nodes.filter((n) => n.stage === 'origin_source');
  const level1 = nodes.filter((n) => n.stage === 'mutation_factory');
  const level2 = nodes.filter((n) => n.stage === 'amplifier_node');
  const level3 = nodes.filter((n) => n.stage === 'viral_impact');

  // Estado del formulario
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
      notes: newNotes.trim() || 'Aportado por la comunidad en la auditoría forense.',
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

  const renderNodeCard = (node: PropagationNode) => {
    const meta = getStageMeta(node.stage);

    return (
      <div
        key={node.id}
        className={`rounded-xl border ${meta.cardBorder} bg-slate-950/80 p-4 md:p-5 backdrop-blur-md transition-all ${meta.glowColor} text-left flex flex-col justify-between`}
      >
        <div>
          {/* Header de la tarjeta */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold px-2 py-0.5 rounded border ${meta.badgeColor}`}>
              <span>{meta.icon}</span> {meta.label}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(node.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Actor & Titular */}
          <div className="font-mono text-xs text-slate-400 mb-1">
            Actor: <strong className="text-slate-100">{node.actor_name}</strong>
          </div>
          <h4 className="text-sm font-bold text-slate-200 leading-snug mb-2.5">
            “{node.title_or_post}”
          </h4>

          {/* Mutación */}
          {node.mutation_type && (
            <div className="mb-2.5">
              <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2 py-0.5 rounded inline-block">
                {node.mutation_type}
              </span>
            </div>
          )}

          {/* Explicación forense */}
          <p className="text-xs text-slate-400 bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 leading-relaxed mb-3">
            {node.notes}
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 font-mono text-[11px]">
          {node.url && node.url !== '#' ? (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline font-semibold"
            >
              Ver fuente original ↗
            </a>
          ) : (
            <span className="text-slate-600">Sin URL externa</span>
          )}

          {node.reach_estimate && (
            <span className="text-slate-500">
              Alcance: <strong className="text-slate-300">{node.reach_estimate}</strong>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 backdrop-blur-md shadow-2xl mt-8 font-sans text-[#f8fafc]">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-red-500 uppercase tracking-widest mb-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            TRAZABILIDAD GENEALÓGICA FORENSE
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            Esquema de Árbol de Propagación
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Estructura jerárquica de la desinformación: cómo muta desde el documento original hasta la fábrica de noticias y sus enjambres de difusión.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Vista */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌳 ÁRBOL JERÁRQUICO
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⏱️ LÍNEA TEMPORAL
            </button>
          </div>

          <button
            onClick={() => (onAddLink ? onAddLink() : setShowAddModal(true))}
            className="inline-flex items-center justify-center gap-2 font-mono text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-950/50 cursor-pointer"
          >
            <span>+</span> Añadir Eslabón
          </button>
        </div>
      </div>

      {/* VISTA 1: ESQUEMA DE ÁRBOL JERÁRQUICO */}
      {viewMode === 'tree' ? (
        <div className="space-y-6">
          {/* NIVEL 0: FUENTE ORIGINAL */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl">
              {level0.map(renderNodeCard)}
            </div>
            
            {/* Conector Nivel 0 -> Nivel 1 */}
            <div className="flex flex-col items-center my-2">
              <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-red-500" />
              <div className="font-mono text-[10px] text-red-400 bg-red-950/80 border border-red-500/40 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                ⚠️ Tergiversación de fecha y cifras
              </div>
              <div className="w-0.5 h-8 bg-gradient-to-b from-red-500 to-red-500" />
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>

          {/* NIVEL 1: LA FÁBRICA / MUTACIÓN */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl">
              {level1.map(renderNodeCard)}
            </div>

            {/* Conector Ramificado Nivel 1 -> Nivel 2 */}
            <div className="w-full max-w-3xl flex flex-col items-center my-3">
              <div className="w-0.5 h-6 bg-red-500" />
              <div className="font-mono text-[10px] text-purple-400 bg-purple-950/80 border border-purple-500/40 px-3 py-0.5 rounded-full">
                🔗 Ramificación en redes y canales satélite
              </div>
              <div className="w-full border-t-2 border-purple-500/60 mt-3 relative">
                <div className="absolute left-1/4 -top-1 w-2 h-2 rounded-full bg-purple-500" />
                <div className="absolute right-1/4 -top-1 w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <div className="w-full flex justify-around">
                <div className="w-0.5 h-6 bg-purple-500" />
                <div className="w-0.5 h-6 bg-purple-500" />
              </div>
            </div>
          </div>

          {/* NIVEL 2: NODOS SATÉLITE EN PARALELO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {level2.map(renderNodeCard)}
          </div>

          {/* Conector Nivel 2 -> Nivel 3 */}
          {level3.length > 0 && (
            <div className="flex flex-col items-center my-2">
              <div className="w-full max-w-3xl border-t-2 border-amber-500/40 mb-3" />
              <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-amber-500" />
              <div className="font-mono text-[10px] text-amber-400 bg-amber-950/80 border border-amber-500/40 px-3 py-0.5 rounded-full mb-3">
                👥 Dispersión masiva en el feed de los usuarios
              </div>
              <div className="w-full max-w-xl">
                {level3.map(renderNodeCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: TIMELINE VERTICAL CLÁSICA */
        <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:left-2.5 md:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-red-500 before:to-purple-500">
          {nodes.map((node) => {
            const meta = getStageMeta(node.stage);
            return (
              <div key={node.id} className="relative">
                <div
                  className={`absolute -left-[29px] md:-left-[37px] top-4 w-4 h-4 rounded-full border-2 border-slate-900 ${meta.dotColor || 'bg-blue-500'}`}
                />
                {renderNodeCard(node)}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA AÑADIR NUEVO ESLABÓN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 font-mono">
              [ + Añadir Eslabón al Árbol Genealógico ]
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Registra un nuevo nodo de difusión (post de X, canal de Telegram o réplica en web) para expandir el árbol.
            </p>

            <form onSubmit={handleAddNode} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Nivel / Rol en la Cadena:</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as NodeStage)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="origin_source">Nivel 0: Fuente de referencia citada</option>
                  <option value="mutation_factory">Nivel 1: Fábrica / Mutación de la noticia</option>
                  <option value="amplifier_node">Nivel 2: Nodo Satélite / Amplificación (X / Telegram)</option>
                  <option value="viral_impact">Nivel 3: Viralización en feed / grupos</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Nombre del Actor / Cuenta:</label>
                <input
                  type="text"
                  placeholder="ej. @Liberaldig o Canal Alertas"
                  value={newActor}
                  onChange={(e) => setNewActor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Titular o Texto del Post:</label>
                <input
                  type="text"
                  placeholder="Texto literal difundido por este nodo..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">URL de la Prueba / Post:</label>
                <input
                  type="url"
                  placeholder="https://x.com/... o https://t.me/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Tipo de Mutación / Tergiversación (Opcional):</label>
                <input
                  type="text"
                  placeholder="ej. Reciclaje de fecha de encuesta, Cifra inflada..."
                  value={newMutation}
                  onChange={(e) => setNewMutation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Notas Forenses / Razonamiento:</label>
                <textarea
                  placeholder="Explica cómo conecta este nodo con el eslabón anterior..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-transparent border border-slate-700 text-slate-400 px-4 py-2 rounded-lg hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg"
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
