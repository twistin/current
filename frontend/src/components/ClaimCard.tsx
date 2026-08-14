import React from 'react';
import { useTranslation } from 'react-i18next';
import { Claim } from '../api/types';

interface ClaimCardProps {
  claim: Claim;
  onClick?: () => void;
}

const VERDICT_CONFIG: Record<string, { key: string; color: string; bg: string }> = {
  false: { key: 'false', color: 'var(--refute)', bg: 'rgba(232, 112, 90, 0.12)' },
  true: { key: 'true', color: 'var(--support)', bg: 'rgba(95, 184, 138, 0.12)' },
  misleading: { key: 'misleading', color: 'var(--misleading)', bg: 'rgba(224, 166, 77, 0.12)' },
  unproven: { key: 'unproven', color: 'var(--neutral)', bg: 'rgba(124, 130, 144, 0.12)' },
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: verdict.color,
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
