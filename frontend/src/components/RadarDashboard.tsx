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

export function getActorTypeBadge(type: ActorType) {
  switch (type) {
    case 'media':
      return { label: 'MEDIO DIGITAL', icon: '📰', style: 'border-blue-500/40 text-blue-400 bg-blue-500/10' };
    case 'telegram_channel':
      return { label: 'CANAL TELEGRAM', icon: '✈️', style: 'border-purple-500/40 text-purple-400 bg-purple-500/10' };
    case 'social_account':
    default:
      return { label: 'CUENTA SOCIAL', icon: '⚡', style: 'border-amber-500/40 text-amber-400 bg-amber-500/10' };
  }
}

export const RadarDashboard: React.FC<RadarDashboardProps> = ({ onSelectActor }) => {
  const navigate = useNavigate();
  const [actors, setActors] = useState<ActorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<ActorType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sincronización en vivo con el Backend
  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const response = await fetch('/api/actors/radar');
        if (!response.ok) {
          // Fallback a URL absoluta si es necesario
          const resFallback = await fetch('https://current-app-qg6pp.ondigitalocean.app/api/actors/radar');
          if (!resFallback.ok) throw new Error('Error al conectar con el nodo central');
          const data = await resFallback.json();
          setActors(data);
          return;
        }
        const data = await response.json();
        setActors(data);
      } catch (err: any) {
        setError(err.message || 'Error al conectar con el nodo central');
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 bg-[#0f172a] text-[#f8fafc] font-mono text-sm text-center flex flex-col items-center justify-center gap-3">
        <span className="w-4 h-4 rounded-full bg-red-500 animate-ping shadow-[0_0_12px_#ef4444]" />
        <span className="text-red-400 font-bold uppercase tracking-widest">[ Sincronizando Radar de Inteligencia... ]</span>
      </div>
    );
  }

  if (error && actors.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 bg-[#0f172a] text-[#f8fafc] font-mono text-center">
        <div className="inline-block p-6 rounded-xl border border-red-500/40 bg-red-950/30 text-red-400 text-sm">
          ⚠️ ERROR TÁCTICO: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 bg-[#0f172a] text-[#f8fafc] font-sans antialiased min-h-screen">
      {/* CABECERA TÁCTICA */}
      <header className="border-b border-slate-800 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-red-500 uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            SISTEMA DE AUDITORÍA EN TIEMPO REAL
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Radar de Actores y Vectores
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Monitorización comunitaria de nodos y desinformación recurrente. Los índices de confianza se recalculan dinámicamente con rastro forense.
          </p>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por @handle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
          />

          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 font-mono text-xs">
            {(['all', 'media', 'social_account', 'telegram_channel'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  filterType === type
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'TODOS' : type === 'media' ? 'MEDIOS' : type === 'social_account' ? 'CUENTAS' : 'TELEGRAM'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* TABLA O ESTADO VACÍO */}
      {filteredActors.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 font-mono text-slate-500 text-sm">
          [ No se han detectado actores auditados en este filtro ]
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 font-mono text-xs text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Actor / Nodo Emisor</th>
                <th className="py-4 px-5">Vector</th>
                <th className="py-4 px-5">Índice de Confianza</th>
                <th className="py-4 px-5">Nivel de Amenaza</th>
                <th className="py-4 px-5 text-right">Trazas Auditadas</th>
                <th className="py-4 px-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-sm">
              {filteredActors.map((actor, idx) => {
                const threat = getThreatLevel(actor.reputation_score);
                const typeBadge = getActorTypeBadge(actor.actor_type);
                const isCritical = threat === 'CRÍTICO';

                return (
                  <tr
                    key={actor.id}
                    onClick={() => handleRowClick(actor.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="font-bold text-slate-100 group-hover:text-red-400 transition-colors">
                            {actor.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            ID: {actor.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${typeBadge.style}`}>
                        <span>{typeBadge.icon}</span> {typeBadge.label}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1.5 w-44">
                        <div className="flex justify-between items-baseline font-mono text-xs">
                          <span className={`font-bold text-sm ${isCritical ? 'text-red-400' : threat === 'ALTO' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {actor.reputation_score.toFixed(1)}
                          </span>
                          <span className="text-slate-500 text-[10px]">/ 100.0</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(0, actor.reputation_score))}%` }}
                            className={`h-full transition-all duration-500 ${
                              isCritical
                                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                                : threat === 'ALTO'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-red-950/60 text-red-400 border border-red-600/70 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          CRÍTICO
                        </span>
                      ) : threat === 'ALTO' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/40">
                          ALTO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-500/30">
                          CONFIABLE
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right font-mono text-sm text-slate-300">
                      <span className="font-bold">{actor.total_traces}</span>
                      <span className="text-xs text-slate-500 ml-1">evidencias</span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="font-mono text-xs text-blue-400 group-hover:text-blue-300 group-hover:underline">
                        Expediente →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
