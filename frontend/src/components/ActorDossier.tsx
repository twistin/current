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

const SEED_DOSSIERS: Record<string, ActorDetailData> = {
  '11111111-1111-1111-1111-111111111111': {
    id: '11111111-1111-1111-1111-111111111111',
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
    id: '22222222-2222-2222-2222-222222222222',
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
};

export const ActorDossier: React.FC<ActorDossierProps> = ({
  actorId: propActorId,
  onBack: propOnBack,
}) => {
  const { id: routeActorId } = useParams<{ id: string }>();
  const idToFetch = propActorId || routeActorId || '11111111-1111-1111-1111-111111111111';
  const navigate = useNavigate();

  const [actor, setActor] = useState<ActorDetailData | null>(SEED_DOSSIERS[idToFetch] || null);
  const [isLoading, setIsLoading] = useState(!SEED_DOSSIERS[idToFetch]);
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
      } finally {
        setIsLoading(false);
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

  if (isLoading && !actor) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 bg-[#0f172a] text-[#f8fafc] font-mono text-center flex flex-col items-center justify-center gap-3">
        <span className="w-4 h-4 rounded-full bg-red-500 animate-ping shadow-[0_0_12px_#ef4444]" />
        <span className="text-red-400 font-bold uppercase tracking-widest">[ Desencriptando Expediente Forense... ]</span>
      </div>
    );
  }

  const currentActor = actor || SEED_DOSSIERS['11111111-1111-1111-1111-111111111111'];
  const threat = getThreatLevel(currentActor.reputation_score);
  const isCritical = threat === 'CRÍTICO';
  const linkedNodes = currentActor.linked_nodes || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 bg-[#0f172a] text-[#f8fafc] font-sans antialiased min-h-screen">
      {/* BOTÓN VOLVER Y STATUS */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-800">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 font-mono text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          ← VOLVER AL RADAR
        </button>

        <div className="font-mono text-xs text-slate-400">
          ESTADO DEL EXPEDIENTE: <span className="text-red-400 font-bold">BAJO AUDITORÍA ACTIVA</span>
        </div>
      </div>

      {/* CABECERA DE PERFIL FORENSE */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-md uppercase">
              {currentActor.actor_type === 'media' ? 'MEDIO DIGITAL AUDITADO' : 'NODO SOCIAL AUDITADO'}
            </span>
            <span className="font-mono text-xs text-slate-500">
              Primera traza: {new Date(currentActor.first_seen_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            {currentActor.name}
          </h1>
          <div className="font-mono text-xs text-slate-500 mb-6">
            ID CIBERDEFENSA: {currentActor.id}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800 font-mono">
            <div>
              <div className="text-xs text-slate-500 uppercase">Trazas Registradas</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{currentActor.traces.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase">Campañas Coord.</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{currentActor.coordinated_campaigns ?? 0}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-500 uppercase">Alcance Estimado</div>
              <div className="text-sm font-semibold text-slate-300 mt-2">{currentActor.network_reach_estimate || '~N/A'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md flex flex-col justify-between shadow-2xl">
          <div>
            <div className="font-mono text-xs text-slate-400 uppercase tracking-wider mb-2">
              Índice de Confianza Histórico
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className={`text-5xl font-extrabold ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                {currentActor.reputation_score.toFixed(1)}
              </span>
              <span className="text-slate-500 text-sm font-semibold">/ 100.0</span>
            </div>

            <div className="mt-4 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(0, currentActor.reputation_score))}%` }}
                className={`h-full ${isCritical ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-amber-500'}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-6 font-mono text-xs">
            <button
              onClick={() => alert(`Aportar prueba forense para ${currentActor.name}`)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <span>+</span> Aportar Traza Forense
            </button>
            <button
              onClick={() => alert(`Vincular nodo a ${currentActor.name}`)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔗</span> Vincular Nodo (Telegram / Bot)
            </button>
          </div>
        </div>
      </section>

      {/* PESTAÑAS DE CONTENIDO */}
      <div className="flex items-center gap-3 border-b border-slate-800 mb-6 font-mono text-xs">
        <button
          onClick={() => setActiveTab('traces')}
          className={`pb-3 font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'traces'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          REGISTRO DE TRAZAS ({currentActor.traces.length})
        </button>

        {linkedNodes.length > 0 && (
          <button
            onClick={() => setActiveTab('graph')}
            className={`pb-3 font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'graph'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            MAPA DE ENJAMBRES ({linkedNodes.length})
          </button>
        )}
      </div>

      {activeTab === 'traces' ? (
        <section className="flex flex-col gap-4">
          {currentActor.traces.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 font-mono text-slate-500 text-sm">
              [ No hay trazas forenses registradas para este actor ]
            </div>
          ) : (
            currentActor.traces.map((trace) => (
              <article
                key={trace.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm hover:border-slate-700 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                      VEREDICTO: {trace.verdict === 'false' ? 'FALSO / FABRICADO' : trace.verdict.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {new Date(trace.detected_at).toLocaleDateString()} · {trace.platform}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/60 px-2.5 py-1 rounded">
                    PENALIZACIÓN: {trace.penalty_score} PTS
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 mb-2 leading-snug">
                  {trace.claim_title}
                </h3>

                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  {trace.forensic_summary}
                </p>

                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-800/80 font-mono text-xs">
                  <a
                    href={trace.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline font-semibold"
                  >
                    Inspeccionar URL de Origen ↗
                  </a>

                  <span className="text-slate-500">
                    Auditado por <strong className="text-slate-300">{trace.verified_by_nodes}</strong> nodos verificadores
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <ThreatGraph
            actor={{
              id: currentActor.id,
              name: currentActor.name,
              linked_nodes: linkedNodes,
            }}
            height={420}
          />
        </section>
      )}
    </div>
  );
};
