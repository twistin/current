import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { publishRebuttal, getToken } from '../api/client';
import { Assertion } from '../api/types';

// URL base de Current en producción (o local en dev)
const CURRENT_BASE_URL =
  import.meta.env.VITE_PUBLIC_URL ||
  'https://current-app-qg6pp.ondigitalocean.app';

const X_LIMIT = 280;

// Emoji semántico por veredicto (en inglés canónico que devuelve el backend)
const VERDICT_EMOJI: Record<string, string> = {
  false: '❌',
  misleading: '⚠️',
  true: '✅',
};

type Platform = 'X' | 'other';

interface PublishRebuttalModalProps {
  claimId: string;
  claimSummary: string;
  verdictLabel: string;
  verdictKey: string; // 'false' | 'true' | 'misleading'
  assertions: Assertion[];
  onClose: () => void;
  onSuccess: () => void;
  onRequestAuth: () => void;
}

// Genera el borrador CORTO para X: emoji + veredicto + resumen truncado + enlace
function generateShortDraft(
  claimId: string,
  claimSummary: string,
  verdictLabel: string,
  verdictKey: string,
  assertions: Assertion[]
): string {
  const claimUrl = `${CURRENT_BASE_URL}/claims/${claimId}`;
  const emoji = VERDICT_EMOJI[verdictKey] ?? '🔍';

  // Dato clave: primera afirmación refutada/apoyada con evidencia
  const keyAssertion = assertions.find((a) => a.is_load_bearing && a.evidence.length > 0);
  const keyFact = keyAssertion
    ? keyAssertion.text.slice(0, 80).trimEnd() + (keyAssertion.text.length > 80 ? '…' : '')
    : '';

  // Construimos el tweet con margen para el enlace (Twitter cuenta t.co = 23 chars)
  // URL real puede ser más larga, pero Twitter la acorta a 23 chars automáticamente.
  const urlPlaceholderLen = 23;
  const suffix = ` Verificación completa: ${claimUrl}`;
  const suffixDisplayLen = ` Verificación completa: `.length + urlPlaceholderLen;

  // Línea del veredicto
  const verdictLine = `${emoji} ${verdictLabel.toUpperCase()}`;

  // Resumen del bulo — lo truncamos para que quepa todo
  const budgetForSummary = X_LIMIT - verdictLine.length - 2 - (keyFact ? keyFact.length + 2 : 0) - suffixDisplayLen;
  const truncatedSummary = claimSummary.slice(0, Math.max(budgetForSummary, 20)).trimEnd() +
    (claimSummary.length > Math.max(budgetForSummary, 20) ? '…' : '');

  const parts = [
    verdictLine + ':',
    `"${truncatedSummary}"`,
    keyFact ? keyFact + '.' : '',
    suffix,
  ].filter(Boolean);

  return parts.join('\n');
}

// Genera el borrador LARGO completo con todas las fuentes
function generateLongDraft(
  claimSummary: string,
  verdictLabel: string,
  verdictKey: string,
  assertions: Assertion[]
): string {
  const emoji = VERDICT_EMOJI[verdictKey] ?? '🔍';
  const lines: string[] = [];
  lines.push(`${emoji} DESMENTIDO OFICIAL — Current`);
  lines.push(`Bulo: "${claimSummary}"`);
  lines.push(`Veredicto: ${verdictLabel.toUpperCase()}`);
  lines.push('');
  lines.push('Evidencias recopiladas:');

  assertions.forEach((a, idx) => {
    lines.push(`${String(idx + 1).padStart(2, '0')}. "${a.text}" [${a.status ?? 'sin estado'}]`);
    a.evidence.forEach((ev) => {
      if (ev.source) {
        lines.push(`   • ${ev.source.title} (${ev.source.url})`);
      }
    });
  });

  lines.push('');
  lines.push('Verificación transparente y sin filtros — Current.');
  return lines.join('\n');
}

// Calcula cuántos caracteres "cuenta" Twitter: URLs = 23, el resto literal
function twitterLength(text: string): number {
  // Reemplaza URLs por placeholder de 23 chars para el conteo
  const urlRegex = /https?:\/\/[^\s]+/g;
  const replaced = text.replace(urlRegex, '0'.repeat(23));
  return replaced.length;
}

export const PublishRebuttalModal: React.FC<PublishRebuttalModalProps> = ({
  claimId,
  claimSummary,
  verdictLabel,
  verdictKey,
  assertions,
  onClose,
  onSuccess,
  onRequestAuth,
}) => {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform>('X');

  const shortDraft = useMemo(
    () => generateShortDraft(claimId, claimSummary, verdictLabel, verdictKey, assertions),
    [claimId, claimSummary, verdictLabel, verdictKey, assertions]
  );

  const longDraft = useMemo(
    () => generateLongDraft(claimSummary, verdictLabel, verdictKey, assertions),
    [claimSummary, verdictLabel, verdictKey, assertions]
  );

  const initialText = platform === 'X' ? shortDraft : longDraft;
  const [baseText, setBaseText] = useState<string>(initialText);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cuando cambia la plataforma, actualiza el texto base al borrador correspondiente
  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    setBaseText(p === 'X' ? shortDraft : longDraft);
    setError(null);
  };

  const charCount = platform === 'X' ? twitterLength(baseText) : baseText.length;
  const isOverLimit = platform === 'X' && charCount > X_LIMIT;
  const remaining = X_LIMIT - charCount;

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
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          {t('rebuttal.modal_title')}
        </div>
        <h3 className="serif" style={{ fontSize: '17px', color: 'var(--text)', marginBottom: '6px' }}>
          "{claimSummary}"
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '18px' }}>
          {t('rebuttal.modal_subtitle')}
        </p>

        {/* Selector de plataforma */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['X', 'other'] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePlatformChange(p)}
              className="mono"
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: platform === p ? 'none' : '1px solid var(--border)',
                background: platform === p ? 'var(--accent)' : 'var(--surface-2)',
                color: platform === p ? 'var(--accent-text)' : 'var(--text-soft)',
                transition: 'all 0.15s ease',
              }}
            >
              {p === 'X' ? '𝕏 / Twitter' : t('rebuttal.platform_other')}
            </button>
          ))}
        </div>

        {/* Hint para X */}
        {platform === 'X' && (
          <div
            className="mono"
            style={{
              fontSize: '10.5px',
              color: 'var(--text-faint)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
              lineHeight: 1.6,
            }}
          >
            {t('rebuttal.x_hint')}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                {t('rebuttal.text_label')}
              </label>
              {platform === 'X' && (
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isOverLimit ? 'var(--refute)' : remaining <= 20 ? 'var(--misleading)' : 'var(--text-faint)',
                    transition: 'color 0.2s',
                  }}
                >
                  {remaining < 0 ? `+${Math.abs(remaining)}` : remaining} / {X_LIMIT}
                </span>
              )}
            </div>

            {/* Barra de progreso para X */}
            {platform === 'X' && (
              <div
                style={{
                  height: '3px',
                  background: 'var(--surface-3)',
                  borderRadius: '2px',
                  marginBottom: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min((charCount / X_LIMIT) * 100, 100)}%`,
                    background: isOverLimit
                      ? 'var(--refute)'
                      : remaining <= 20
                      ? 'var(--misleading)'
                      : 'var(--accent)',
                    borderRadius: '2px',
                    transition: 'width 0.1s ease, background 0.2s ease',
                  }}
                />
              </div>
            )}

            <textarea
              rows={platform === 'X' ? 6 : 12}
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: `1px solid ${isOverLimit ? 'var(--refute)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                lineHeight: 1.55,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Enlace canónico mostrado para X */}
          {platform === 'X' && (
            <div
              className="mono"
              style={{
                fontSize: '10.5px',
                color: 'var(--text-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>↗</span>
              {t('rebuttal.canonical_link_label')}:{' '}
              <a
                href={`${CURRENT_BASE_URL}/claims/${claimId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                {CURRENT_BASE_URL}/claims/{claimId}
              </a>
            </div>
          )}

          {error && (
            <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
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
              disabled={submitting || isOverLimit}
              className="mono"
              style={{
                background: isOverLimit ? 'var(--surface-3)' : 'var(--accent)',
                border: isOverLimit ? '1px solid var(--border)' : 'none',
                color: isOverLimit ? 'var(--text-faint)' : 'var(--accent-text)',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: submitting || isOverLimit ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: submitting ? 0.6 : 1,
                transition: 'all 0.15s ease',
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
