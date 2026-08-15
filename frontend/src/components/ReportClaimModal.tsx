import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createClaim, getToken } from '../api/client';
import { ClaimKind } from '../api/types';

interface ReportClaimModalProps {
  onClose: () => void;
  onSuccess: (newClaimId: string) => void;
  onRequestAuth: () => void;
}

export const ReportClaimModal: React.FC<ReportClaimModalProps> = ({
  onClose,
  onSuccess,
  onRequestAuth,
}) => {
  const { t } = useTranslation();

  const [summary, setSummary] = useState('');
  const [kind, setKind] = useState<ClaimKind>('text');
  const [propagationScore, setPropagationScore] = useState<number>(75);
  const [originUrl, setOriginUrl] = useState('');
  const [platform, setPlatform] = useState('X');
  const [language, setLanguage] = useState('es');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!getToken()) {
      onRequestAuth();
      return;
    }

    if (!summary.trim()) {
      setError('El enunciado del bulo es obligatorio');
      return;
    }
    if (!originUrl.trim()) {
      setError('La URL de origen es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createClaim({
        summary: summary.trim(),
        kind,
        propagation_score: propagationScore,
        origin_url: originUrl.trim(),
        platform: platform.trim(),
        language: language.trim(),
      });

      onSuccess(res.claim.id);
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onRequestAuth();
      } else {
        setError(err instanceof Error ? err.message : 'Error al reportar el bulo');
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
          maxWidth: '520px',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          {t('forms.report_claim_modal_title')}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Enunciado del bulo
            </label>
            <textarea
              rows={3}
              placeholder={t('forms.summary_placeholder')}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                Tipo de contenido
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ClaimKind)}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}
              >
                <option value="text">texto</option>
                <option value="image">imagen</option>
                <option value="video">vídeo</option>
                <option value="mixed">mixto</option>
              </select>
            </div>

            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                Propagación (1-100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={propagationScore}
                onChange={(e) => setPropagationScore(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              URL del post u origen
            </label>
            <input
              type="url"
              placeholder={t('forms.origin_url_placeholder')}
              value={originUrl}
              onChange={(e) => setOriginUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                marginTop: '4px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                Plataforma
              </label>
              <input
                type="text"
                placeholder={t('forms.platform_placeholder')}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}
              />
            </div>

            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                Idioma (código)
              </label>
              <input
                type="text"
                placeholder={t('forms.language_placeholder')}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}
              />
            </div>
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
                color: 'var(--accent-text)',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Enviando...' : t('forms.submit_report')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
