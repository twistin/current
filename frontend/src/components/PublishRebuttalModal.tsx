import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publishRebuttal, getToken } from '../api/client';
import { Assertion } from '../api/types';

interface PublishRebuttalModalProps {
  claimId: string;
  claimSummary: string;
  verdictLabel: string;
  assertions: Assertion[];
  onClose: () => void;
  onSuccess: () => void;
  onRequestAuth: () => void;
}

export const PublishRebuttalModal: React.FC<PublishRebuttalModalProps> = ({
  claimId,
  claimSummary,
  verdictLabel,
  assertions,
  onClose,
  onSuccess,
  onRequestAuth,
}) => {
  const { t } = useTranslation();

  const generateDefaultDraft = (): string => {
    const lines: string[] = [];
    lines.push(`DESMENTIDO OFICIAL — Current`);
    lines.push(`Bulo: "${claimSummary}"`);
    lines.push(`Veredicto: ${verdictLabel.toUpperCase()}`);
    lines.push(``);
    lines.push(`Evidencias recopiladas:`);

    assertions.forEach((a, idx) => {
      lines.push(`0${idx + 1}. "${a.text}" [${a.status}]`);
      a.evidence.forEach((ev) => {
        if (ev.source) {
          lines.push(`   • ${ev.source.title} (${ev.source.url})`);
        }
      });
    });

    lines.push(``);
    lines.push(`Verificación transparente y sin filtros.`);
    return lines.join('\n');
  };

  const [baseText, setBaseText] = useState<string>(generateDefaultDraft());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!getToken()) {
      onRequestAuth();
      return;
    }

    if (!baseText.trim()) {
      setError('El texto del desmentido no puede estar vacío');
      return;
    }

    setSubmitting(true);
    try {
      await publishRebuttal(claimId, baseText.trim());
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onRequestAuth();
      } else {
        setError(err instanceof Error ? err.message : 'Error al publicar el desmentido');
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
        background: 'rgba(0,0,0,0.75)',
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          {t('rebuttal.modal_title')}
        </div>
        <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>
          “{claimSummary}”
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '16px' }}>
          {t('rebuttal.modal_subtitle')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Texto del desmentido (editable)
            </label>
            <textarea
              rows={10}
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                marginTop: '4px',
              }}
            />
          </div>

          {error && (
            <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
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
                color: '#0c1830',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Publicando...' : t('rebuttal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
