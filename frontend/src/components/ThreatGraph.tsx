import React, { useRef, useEffect, useMemo } from 'react';
import { LinkedNode } from './ActorDossier';

export interface GraphNode {
  id: string;
  name: string;
  type: 'central' | 'satellite';
  platform?: string;
  color: string;
  radius: number;
  confidence?: number;
  x: number;
  y: number;
}

export interface GraphParticle {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
}

interface ThreatGraphProps {
  actor: {
    id: string;
    name: string;
    linked_nodes: LinkedNode[];
  };
  height?: number;
}

function getNodeColor(platform?: string, isCentral?: boolean): string {
  if (isCentral) return '#ffffff';
  const normalized = (platform || '').toLowerCase();
  if (normalized.includes('telegram')) return '#c084fc';
  if (normalized.includes('twitter') || normalized.includes('x')) return '#60a5fa';
  if (normalized.includes('enjambre') || normalized.includes('bot') || normalized.includes('coordinad')) {
    return '#ef4444';
  }
  return '#f59e0b';
}

export const ThreatGraph: React.FC<ThreatGraphProps> = ({ actor, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialNodes = useMemo(() => {
    const nodes: GraphNode[] = [
      {
        id: actor.id,
        name: actor.name,
        type: 'central',
        color: '#ffffff',
        radius: 20,
        x: 0,
        y: 0,
      },
    ];

    const count = actor.linked_nodes.length;
    actor.linked_nodes.forEach((node: LinkedNode, index: number) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      const distance = 130;
      nodes.push({
        id: node.id,
        name: `${node.platform}: ${node.handle_or_url}`,
        type: 'satellite',
        platform: node.platform,
        color: getNodeColor(node.platform, false),
        radius: 11,
        confidence: node.confidence,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    });

    return nodes;
  }, [actor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const nodes = JSON.parse(JSON.stringify(initialNodes)) as GraphNode[];
    const particles: GraphParticle[] = actor.linked_nodes.map((node, i) => ({
      sourceId: node.id,
      targetId: actor.id,
      progress: (i * 0.33) % 1,
      speed: 0.007 + (i % 3) * 0.003,
    }));

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const h = height;

      if (canvas.width !== width * 2 || canvas.height !== h * 2) {
        canvas.width = width * 2;
        canvas.height = h * 2;
      }

      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, width, h);

      const centerX = width / 2;
      const centerY = h / 2;

      const centralNode = nodes.find((n) => n.type === 'central') || nodes[0];
      nodes.forEach((node) => {
        if (node.type === 'satellite') {
          ctx.beginPath();
          ctx.moveTo(centerX + node.x, centerY + node.y);
          ctx.lineTo(centerX + centralNode.x, centerY + centralNode.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const src = nodes.find((n) => n.id === p.sourceId);
        const tgt = centralNode;

        if (src && tgt) {
          const px = centerX + src.x + (tgt.x - src.x) * p.progress;
          const py = centerY + src.y + (tgt.y - src.y) * p.progress;

          ctx.beginPath();
          ctx.arc(px, py, 3, 0, 2 * Math.PI);
          ctx.fillStyle = src.color;
          ctx.shadowColor = src.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      nodes.forEach((node) => {
        const nx = centerX + node.x;
        const ny = centerY + node.y;
        const isCentral = node.type === 'central';

        ctx.beginPath();
        ctx.arc(nx, ny, node.radius + (isCentral ? 8 : 4), 0, 2 * Math.PI);
        ctx.fillStyle = isCentral ? 'rgba(255, 255, 255, 0.15)' : `${node.color}26`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isCentral ? 14 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isCentral ? 2 : 1;
        ctx.stroke();

        ctx.font = isCentral ? 'bold 12px monospace' : '10px monospace';
        ctx.fillStyle = isCentral ? '#ffffff' : '#d1d5db';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, nx, ny + node.radius + 6);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [initialNodes, height, actor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '9.5px', color: '#9ca3af', fontWeight: 700 }}>
          [ MAPA DE VÍNCULOS Y ENJAMBRES ]
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#ffffff' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffffff' }} /> Central
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#60a5fa' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#60a5fa' }} /> X / Twitter
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#c084fc' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#c084fc' }} /> Telegram
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#ef4444' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }} /> Enjambre Bot
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
