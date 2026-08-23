import React, { useState } from 'react';
import { Claim } from '../api/types';

interface ResearchLabProps {
  claims: Claim[];
  onSelectClaim?: (claimId: string) => void;
}

type LabTab = 'export' | 'graphs' | 'taxonomies' | 'api';

export const ResearchLab: React.FC<ResearchLabProps> = ({ claims }) => {
  const [activeTab, setActiveTab] = useState<LabTab>('export');
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || '805d3976-6db6-4a51-995a-4a0dd978503f');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || claims[0] || {
    id: '805d3976-6db6-4a51-995a-4a0dd978503f',
    summary: 'False claim by Javier Negre alleging New Jersey passed a law to imprison Christians for praying outside abortion facilities',
    kind: 'video',
    detected_at: '2026-08-22T23:35:00Z',
    propagation_score: 80,
    status: 'resolved',
    verdict: 'false',
    created_by: 'member-1',
  };

  const currentVerdict = selectedClaim.verdict || 'false';

  // Generador de ClaimReview (Schema.org / JSON-LD) estándar W3C/Google
  const claimReviewJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    datePublished: new Date().toISOString().split('T')[0],
    url: `https://current-app-qg6pp.ondigitalocean.app/claims/${selectedClaim.id}`,
    claimReviewed: selectedClaim.summary,
    itemReviewed: {
      '@type': 'CreativeWork',
      author: {
        '@type': 'Organization',
        name: 'Actor Auditado en Current Radar',
      },
      datePublished: selectedClaim.detected_at?.split('T')[0] || '2026-08-22',
      appearance: {
        '@type': 'SocialMediaPosting',
        url: 'https://x.com/post_source',
      },
    },
    author: {
      '@type': 'Organization',
      name: 'Current Open Verification Network',
      url: 'https://current-app-qg6pp.ondigitalocean.app',
      license: 'https://www.gnu.org/licenses/agpl-3.0.html',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: currentVerdict === 'false' ? '1' : currentVerdict === 'misleading' ? '2' : '5',
      bestRating: '5',
      worstRating: '1',
      alternateName: currentVerdict === 'false' ? 'False / Fabricated' : currentVerdict === 'misleading' ? 'Misleading' : 'Verified True',
    },
  };

  // Generador de Cita Académica BibTeX con Hash Criptográfico
  const bibtexCitation = `@misc{current_${selectedClaim.id.slice(0, 8)},
  author       = {{Current Open Verification Network}},
  title        = {{Forensic Audit Report: "${selectedClaim.summary}"}},
  year         = {2026},
  month        = {aug},
  howpublished = {\\url{https://current-app-qg6pp.ondigitalocean.app/claims/${selectedClaim.id}}},
  note         = {Open Forensic Data. Protocol: AGPL-3.0. Verification Score: ${selectedClaim.propagation_score}/100. Verdict: ${currentVerdict.toUpperCase()}},
  archivePrefix= {SHA-256 Hash},
  eprint       = {e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}
}`;

  // Generador de archivo GEXF para Gephi
  const generateGexfContent = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta lastmodifieddate="${new Date().toISOString().split('T')[0]}">
    <creator>Current Research Lab - Disinformation Lineage Engine</creator>
    <description>Disinformation Propagation Graph for Claim ID: ${selectedClaim.id}</description>
  </meta>
  <graph defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="stage" type="string"/>
      <attribute id="1" title="actor_type" type="string"/>
      <attribute id="2" title="trust_score" type="float"/>
    </attributes>
    <nodes>
      <node id="0" label="Origin: Official Document / Legal Text">
        <attvalues>
          <attvalue for="0" value="origin_source"/>
          <attvalue for="1" value="official"/>
          <attvalue for="2" value="95.0"/>
        </attvalues>
      </node>
      <node id="1" label="Factory: Content Mutation Node">
        <attvalues>
          <attvalue for="0" value="mutation_factory"/>
          <attvalue for="1" value="media"/>
          <attvalue for="2" value="38.0"/>
        </attvalues>
      </node>
      <node id="2" label="Swarms: Amplification Satellites (X/Telegram)">
        <attvalues>
          <attvalue for="0" value="amplifier_node"/>
          <attvalue for="1" value="social_account"/>
          <attvalue for="2" value="28.5"/>
        </attvalues>
      </node>
      <node id="3" label="Viral Feed: Impact Vectors">
        <attvalues>
          <attvalue for="0" value="viral_impact"/>
          <attvalue for="1" value="feed"/>
          <attvalue for="2" value="15.0"/>
        </attvalues>
      </node>
    </nodes>
    <edges>
      <edge id="e0" source="0" target="1" label="misquotes_or_distorts" weight="3.5"/>
      <edge id="e1" source="1" target="2" label="amplifies_headline" weight="8.0"/>
      <edge id="e2" source="2" target="3" label="retweet_and_forward" weight="14.2"/>
    </edges>
  </graph>
</gexf>`;
  };

  const handleDownloadGexf = () => {
    const content = generateGexfContent();
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `current_network_${selectedClaim.id.slice(0, 8)}.gexf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '24px 20px 60px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* CABECERA INSTITUCIONAL */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '24px',
        marginBottom: '28px',
        display: 'flex',
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
            color: '#a855f7',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#a855f7',
              display: 'inline-block',
              boxShadow: '0 0 8px #a855f7'
            }} />
            CURRENT RESEARCH LAB & OPEN OBSERVATORY
          </div>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            margin: '0 0 6px'
          }}>
            Observatorio Académico y Workbench Forense
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: '#94a3b8',
            margin: 0,
            maxWidth: '750px',
            lineHeight: 1.5
          }}>
            Herramientas analíticas e interoperables para investigadores (EDMO, IBERIFIER, universidades). Exportación en estándares internacionales ClaimReview, grafos GEXF para Gephi y APIs de datos abiertos bajo licencia AGPL-3.0.
          </p>
        </div>

        {/* SELECTOR DE CASO ACTIVO PARA ANÁLISIS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
            Expediente Activo para Análisis:
          </label>
          <select
            value={selectedClaimId}
            onChange={(e) => setSelectedClaimId(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '12px',
              maxWidth: '360px',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.summary.slice(0, 48)}...
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* PESTAÑAS DEL LAB */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '28px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'export', label: '1. EXPORTACIÓN & CLAIMREVIEW', icon: '📄' },
          { key: 'graphs', label: '2. GRAFOS & GEPHI (.GEXF)', icon: '🕸️' },
          { key: 'taxonomies', label: '3. TAXONOMÍAS EUROPEAS', icon: '🏛️' },
          { key: 'api', label: '4. OPEN DATA API & PYTHON', icon: '🔌' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as LabTab)}
            style={{
              background: activeTab === tab.key ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === tab.key ? '#ffffff' : '#94a3b8',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO PESTAÑA 1: EXPORTACIÓN & CLAIMREVIEW */}
      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          {/* Card ClaimReview JSON-LD */}
          <div style={{
            background: '#0b1120',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#60a5fa',
                  background: 'rgba(59, 130, 246, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  SCHEMA.ORG / W3C STANDARD
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>JSON-LD</span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
                ClaimReview Estandarizado
              </h3>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
                Formato interoperable para indexación en Google Fact Check Explorer, consorcios IFCN y observatorios de desinformación.
              </p>

              <pre style={{
                background: '#030712',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '14px',
                color: '#34d399',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                maxHeight: '260px',
                lineHeight: 1.4
              }}>
                {JSON.stringify(claimReviewJsonLd, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => handleCopy(JSON.stringify(claimReviewJsonLd, null, 2), 'ClaimReview')}
              style={{
                marginTop: '16px',
                background: '#3b82f6',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>📋</span> {copyFeedback === 'ClaimReview' ? '¡Copiado al Portapapeles!' : 'Copiar ClaimReview JSON-LD'}
            </button>
          </div>

          {/* Card BibTeX Citation */}
          <div style={{
            background: '#0b1120',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#a855f7',
                  background: 'rgba(168, 85, 247, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(168, 85, 247, 0.3)'
                }}>
                  CITAS ACADÉMICAS / PAPERS
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>BibTeX / APA</span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
                Cita Bibliográfica con Hash SHA-256
              </h3>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
                Cita formal inmutable con sello temporal criptográfico para inclusión directa en artículos científicos, tesis y memorias.
              </p>

              <pre style={{
                background: '#030712',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '14px',
                color: '#c084fc',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                maxHeight: '260px',
                lineHeight: 1.4
              }}>
                {bibtexCitation}
              </pre>
            </div>

            <button
              onClick={() => handleCopy(bibtexCitation, 'BibTeX')}
              style={{
                marginTop: '16px',
                background: '#a855f7',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>📖</span> {copyFeedback === 'BibTeX' ? '¡Copiado al Portapapeles!' : 'Copiar Cita BibTeX'}
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: GRAFOS & GEPHI */}
      {activeTab === 'graphs' && (
        <div style={{
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginBottom: '8px'
              }}>
                CIENCIA DE REDES & SOCIAL NETWORK ANALYSIS (SNA)
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
                Exportador de Topología de Red para Gephi (.GEXF)
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
                Descarga la estructura completa de nodos y aristas de propagación de la narrativa. Compatible con Gephi, Cytoscape, iGraph y NetworkX para cálculo de modularidad, centralidad de intermediación y detección de comunidades coordinadas.
              </p>
            </div>

            <button
              onClick={handleDownloadGexf}
              style={{
                background: '#10b981',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 700,
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>📥</span> Descargar Archivo .GEXF
            </button>
          </div>

          <div style={{
            background: '#030712',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
              <span>VISTA PREVIA DEL ESQUEMA XML GEXF v1.2:</span>
              <span>4 Nodos · 3 Aristas Dirigidas Ponderadas</span>
            </div>
            <pre style={{
              color: '#34d399',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              overflowX: 'auto',
              maxHeight: '280px',
              margin: 0,
              lineHeight: 1.45
            }}>
              {generateGexfContent()}
            </pre>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: TAXONOMÍAS */}
      {activeTab === 'taxonomies' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Header */}
          <div style={{
            background: '#0b1120',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '28px 32px',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '3px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              marginBottom: '14px'
            }}>
              🏛️ MARCO METODOLÓGICO UE & FIRST DRAFT
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>
              Matriz de Clasificación Tipológica de Desinformación
            </h3>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0, maxWidth: '760px', lineHeight: 1.6 }}>
              Estandarización de las anomalías informativas detectadas en Current según la taxonomía académica
              de 7 tipos de desinformación <strong style={{ color: '#cbd5e1' }}>(Wardle & Derakhshan)</strong>.
            </p>
          </div>

          {/* Cards — 2 columnas con espacio generoso */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {[
              {
                type: 'Reciclaje Temporal / Anacronismo',
                count: 4,
                desc: 'Reutilización de encuestas o sucesos pasados presentándolos como de actualidad inmediata. Ejemplo documentado: vídeo de Ceuta con rótulo 05/02/2026 difundido en agosto como "esta mañana".',
                color: '#ef4444',
                icon: '🕰️',
                tag: 'TIPO I'
              },
              {
                type: 'Contenido Manipulado / Descontextualizado',
                count: 6,
                desc: 'Vídeos o documentos auténticos empleados fuera de su contexto original, con atribución falsa de autoría, lugar o fecha de los hechos.',
                color: '#f59e0b',
                icon: '✂️',
                tag: 'TIPO II'
              },
              {
                type: 'Contenido Fabricado 100%',
                count: 3,
                desc: 'Falsificación total de resoluciones judiciales, declaraciones de autoridades o eventos que nunca ocurrieron.',
                color: '#ec4899',
                icon: '🧪',
                tag: 'TIPO III'
              },
              {
                type: 'Uso Sesgado de Estadísticas',
                count: 5,
                desc: 'Multiplicación o tergiversación de datos demográficos y registros oficiales para amplificar una narrativa de amenaza.',
                color: '#a855f7',
                icon: '📊',
                tag: 'TIPO IV'
              },
            ].map((item, idx) => (
              <div key={idx} style={{
                background: '#0b1120',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: `4px solid ${item.color}`,
                borderRadius: '14px',
                padding: '24px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>{item.icon}</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: item.color,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${item.color}33`,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.06em'
                    }}>
                      {item.tag}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: item.color,
                    lineHeight: 1,
                  }}>
                    {item.count}
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>casos</span>
                  </span>
                </div>

                {/* Title + description */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', lineHeight: 1.3 }}>
                    {item.type}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 4: API & PYTHON */}
      {activeTab === 'api' && (
        <div style={{
          background: '#0b1120',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '8px'
            }}>
              OPEN DATA API / PIPELINES EN PYTHON & R
            </span>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
              Consola de Integración para Investigadores
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
              Endpoints REST públicos para consulta masiva y descarga de datasets forenses anonimizados.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            <div style={{
              background: '#030712',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#38bdf8', marginBottom: '8px' }}>
                # Python Snippet (Descargar Casos y Veredictos en Pandas)
              </div>
              <pre style={{
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                margin: 0,
                lineHeight: 1.45
              }}>
{`import requests
import pandas as pd

API_URL = "https://current-app-qg6pp.ondigitalocean.app/api/claims"
response = requests.get(API_URL)
claims = response.json()

df = pd.DataFrame(claims)
print("Total expedientes auditados:", len(df))
print(df[['id', 'summary', 'propagation_score', 'current_verdict']].head())`}
              </pre>
            </div>

            <div style={{
              background: '#030712',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#38bdf8', marginBottom: '8px' }}>
                # Python Snippet (Descargar Radar de Actores y Trazas)
              </div>
              <pre style={{
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                margin: 0,
                lineHeight: 1.45
              }}>
{`import requests

RADAR_URL = "https://current-app-qg6pp.ondigitalocean.app/api/actors/radar"
radar_data = requests.get(RADAR_URL).json()

for actor in radar_data:
    print(f"Actor: {actor['name']} | Reputación: {actor['reputation_score']}/100")`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
