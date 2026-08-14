import React from 'react';
import { useTranslation } from 'react-i18next';
import { EvidenceWithSource } from '../api/types';

interface MeterBarProps {
  evidenceList: EvidenceWithSource[];
  activeIds: Record<string, boolean>;
}

const RELIABILITY_MULT: Record<string, number> = {
  high: 1.5,
  medium: 1.0,
  low: 0.5,
  disputed: 0.0,
};

const STRENGTH_MULT: Record<string, number> = {
  strong: 2.0,
  moderate: 1.0,
  weak: 0.5,
};

export function calcWeight(ev: EvidenceWithSource): number {
  if (ev.evidence.stance === 'contextualizes') return 0;
  const rel = ev.source ? RELIABILITY_MULT[ev.source.reliability] ?? 1.0 : 1.0;
  const str = STRENGTH_MULT[ev.evidence.strength] ?? 1.0;
  return rel * str;
}

export const MeterBar: React.FC<MeterBarProps> = ({ evidenceList, activeIds }) => {
  const { t } = useTranslation();

  let supWeight = 0;
  let refWeight = 0;

  evidenceList.forEach((item) => {
    if (activeIds[item.evidence.id] === false) return;
    const w = calcWeight(item);
    if (item.evidence.stance === 'supports') supWeight += w;
    if (item.evidence.stance === 'refutes') refWeight += w;
  });

  const T = 1.5;
  const max = 4.0;

  const supPct = Math.min((supWeight / max) * 100, 100);
  const refPct = Math.min((refWeight / max) * 100, 100);
  const thrPct = (T / max) * 100;

  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg)' }}>
      {/* Fila Apoyo */}
      <div
        className="mono"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: 'var(--text-soft)' }}
      >
        <span style={{ minWidth: '64px', maxWidth: '74px', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '9px', color: 'var(--text-faint)', flexShrink: 0 }}>
          {t('verification.meter_support')}
        </span>
        <div style={{ flex: 1, height: '7px', background: 'var(--surface-3)', borderRadius: '3px', position: 'relative', minWidth: 0 }}>
          <div
            style={{
              height: '100%',
              borderRadius: '3px',
              width: `${supPct}%`,
              background: 'var(--support)',
              transition: 'width 0.4s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              bottom: '-4px',
              width: '1.5px',
              background: 'var(--text-soft)',
              opacity: 0.7,
              left: `${thrPct}%`,
            }}
          >
            <span style={{ position: 'absolute', top: '-13px', left: '-3px', fontSize: '8.5px', color: 'var(--text-faint)' }}>
              T
            </span>
          </div>
        </div>
        <span style={{ width: '28px', textAlign: 'right', color: 'var(--text-body)', fontWeight: 500, flexShrink: 0 }}>
          {supWeight.toFixed(1)}
        </span>
      </div>

      {/* Fila Refutación */}
      <div
        className="mono"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: 'var(--text-soft)', marginTop: '8px' }}
      >
        <span style={{ minWidth: '64px', maxWidth: '74px', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '9px', color: 'var(--text-faint)', flexShrink: 0 }}>
          {t('verification.meter_refute')}
        </span>
        <div style={{ flex: 1, height: '7px', background: 'var(--surface-3)', borderRadius: '3px', position: 'relative', minWidth: 0 }}>
          <div
            style={{
              height: '100%',
              borderRadius: '3px',
              width: `${refPct}%`,
              background: 'var(--refute)',
              transition: 'width 0.4s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              bottom: '-4px',
              width: '1.5px',
              background: 'var(--text-soft)',
              opacity: 0.7,
              left: `${thrPct}%`,
            }}
          >
            <span style={{ position: 'absolute', top: '-13px', left: '-3px', fontSize: '8.5px', color: 'var(--text-faint)' }}>
              T
            </span>
          </div>
        </div>
        <span style={{ width: '28px', textAlign: 'right', color: 'var(--text-body)', fontWeight: 500, flexShrink: 0 }}>
          {refWeight.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

