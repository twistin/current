import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { decomposeClaim, getToken } from '../api/client';

interface DecomposeClaimModalProps {
  claimId: string;
  claimSummary: string;
  onClose: () => void;
  onSuccess: () => void;
  onRequestAuth: () => void;
}

export const DecomposeClaimModal: React.FC<DecomposeClaimModalProps> = ({
  claimId,
  claimSummary,
  onClose,
  onSuccess,
  onRequestAuth,
}) => {
  const { t } = useTranslation();

  const [text, setText] = useState('');
  const [isLoadBearing, setIsLoadBearing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!getToken()) {
      onRequestAuth();
      return;
    }

    if (!text.trim()) {
      setError(t('forms.text_required'));
      return;
    }

    setSubmitting(true);
    try {
      await decomposeClaim(claimId, [
        {
          text: text.trim(),
          is_load_bearing: isLoadBearing,
        },
      ]);

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onRequestAuth();
      } else {
        setError(err instanceof Error ? err.message : 'Error al añadir afirmación');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          Descomponer Bulo
        </div>
        <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '12px' }}>
          “{claimSummary}”
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Texto de la Afirmación
            </label>
            <textarea
              rows={3}
              placeholder={t('forms.assertion_placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                marginTop: '4px',
              }}
            />
            <div
              className="mono"
              style={{
                fontSize: '10.5px',
                color: 'var(--text-faint)',
                marginTop: '6px',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                background: 'var(--surface-2)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-soft)',
              }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>💡</span>
              <span>{t('forms.assertion_guidance')}</span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isLoadBearing}
              onChange={(e) => setIsLoadBearing(e.target.checked)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
              {t('forms.is_load_bearing_label')}
            </span>
          </label>

          {error && (
            <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="mono"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-soft)',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {t('forms.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="mono"
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: 'var(--accent-text)',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Guardando...' : t('forms.submit_assertion')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
