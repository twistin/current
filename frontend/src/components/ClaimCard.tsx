import React from 'react';
import { useTranslation } from 'react-i18next';
import { Claim } from '../api/types';

interface ClaimCardProps {
  claim: Claim;
  onClick?: () => void;
}

const VERDICT_CONFIG: Record<string, { key: string; color: string; bg: string }> = {
  false: { key: 'false', color: 'var(--refute)', bg: 'color-mix(in srgb, var(--refute) 12%, transparent)' },
  true: { key: 'true', color: 'var(--support)', bg: 'color-mix(in srgb, var(--support) 12%, transparent)' },
  misleading: { key: 'misleading', color: 'var(--misleading)', bg: 'color-mix(in srgb, var(--misleading) 12%, transparent)' },
  unproven: { key: 'unproven', color: 'var(--neutral)', bg: 'color-mix(in srgb, var(--neutral) 12%, transparent)' },
};

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, onClick }) => {
  const { t } = useTranslation();

  const verdictKey = claim.verdict || 'unproven';
  const verdict = VERDICT_CONFIG[verdictKey] || VERDICT_CONFIG.unproven;
  const verdictLabel = t(`verdicts.${verdict.key}`);
  const statusLabel = t(`statuses.${claim.status}`, { defaultValue: claim.status });
  const kindLabel = t(`kinds.${claim.kind}`, { defaultValue: claim.kind });

  const formattedDate = new Date(claim.detected_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginTop: '14px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s ease, transform 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="eyebrow">{t('queue.propagation')} {claim.propagation_score}</span>
          <span
            className="mono"
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
            }}
          >
            · {kindLabel}
          </span>
        </div>
        <span
          className="status-badge"
          style={{
            color: verdict.color,
            backgroundColor: verdict.bg,
            border: `1px solid ${verdict.color}`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: verdict.color,
              flexShrink: 0,
            }}
          />
          {verdictLabel}
        </span>
      </div>

      <h2
        className="serif"
        style={{
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--text)',
          lineHeight: 1.35,
          marginBottom: '14px',
        }}
      >
        “{claim.summary}”
      </h2>

      <div
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '4px 12px',
          fontSize: '11px',
          color: 'var(--text-faint)',
          borderTop: '1px solid var(--border-soft)',
          paddingTop: '12px',
        }}
      >
        <span>{t('queue.detected')}: {formattedDate}</span>
        <span>
          {t('queue.status')}: <span style={{ color: 'var(--text-soft)' }}>{statusLabel}</span>
        </span>
      </div>
    </div>
  );
};
