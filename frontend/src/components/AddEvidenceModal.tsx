import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addEvidence, getToken } from '../api/client';
import { EvidenceStance, EvidenceStrength, SourceKind, SourceReliability } from '../api/types';

interface AddEvidenceModalProps {
  assertionId: string;
  assertionText: string;
  onClose: () => void;
  onSuccess: () => void;
  onRequestAuth: () => void;
}

export const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({
  assertionId,
  assertionText,
  onClose,
  onSuccess,
  onRequestAuth,
}) => {
  const { t } = useTranslation();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<SourceKind>('official');
  const [reliability, setReliability] = useState<SourceReliability>('high');
  const [excerpt, setExcerpt] = useState('');

  const [stance, setStance] = useState<EvidenceStance>('refutes');
  const [strength, setStrength] = useState<EvidenceStrength>('strong');
  const [rationale, setRationale] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verificación de Autenticación
    if (!getToken()) {
      onRequestAuth();
      return;
    }

    // Validación Front-end
    if (!url.trim()) {
      setError(t('forms.url_required'));
      return;
    }
    if (!title.trim()) {
      setError(t('forms.title_required'));
      return;
    }
    if (!rationale.trim()) {
      setError(t('forms.rationale_required'));
      return;
    }

    setSubmitting(true);
    try {
      await addEvidence(assertionId, {
        source: {
          url: url.trim(),
          title: title.trim(),
          kind,
          reliability,
          excerpt: excerpt.trim() ? excerpt.trim() : null,
        },
        stance,
        strength,
        rationale: rationale.trim(),
      });

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onRequestAuth();
      } else {
        setError(err instanceof Error ? err.message : 'Error al guardar la evidencia');
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
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          {t('verification.add_evidence')}
        </div>
        <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>
          “{assertionText}”
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '16px' }}>
          {t('verification.add_evidence_subtitle')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Fuente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Fuente (URL & Título)
            </label>
            <input
              type="url"
              placeholder={t('forms.source_url_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <input
              type="text"
              placeholder={t('forms.source_title_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                {t('forms.kind_label')}
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as SourceKind)}
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
                <option value="official">oficial</option>
                <option value="primary">primaria</option>
                <option value="press">prensa</option>
                <option value="academic">académica</option>
                <option value="factchecker">factchecker</option>
                <option value="secundaria">secundaria</option>
              </select>
            </div>

            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                {t('forms.reliability_label')}
              </label>
              <select
                value={reliability}
                onChange={(e) => setReliability(e.target.value as SourceReliability)}
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
                <option value="high">alta (high)</option>
                <option value="medium">media (medium)</option>
                <option value="low">baja (low)</option>
                <option value="disputed">disputada (disputed)</option>
              </select>
            </div>
          </div>

          {/* Extracto de la Fuente (Opcional) */}
          <div>
            <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
              Cita o Extracto de la fuente (opcional)
            </label>
            <input
              type="text"
              placeholder="Cita literal del documento..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: 'var(--text)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                {t('forms.stance_label')}
              </label>
              <select
                value={stance}
                onChange={(e) => setStance(e.target.value as EvidenceStance)}
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
                <option value="refutes">⊖ refuta</option>
                <option value="supports">⊕ apoya</option>
                <option value="contextualizes">◐ contexto</option>
              </select>
            </div>

            <div>
              <label className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                {t('forms.strength_label')}
              </label>
              <select
                value={strength}
                onChange={(e) => setStrength(e.target.value as EvidenceStrength)}
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
                <option value="strong">fuerte (strong)</option>
                <option value="moderate">moderada (moderate)</option>
                <option value="weak">débil (weak)</option>
              </select>
            </div>
          </div>

          {/* Razonamiento Obligatorio */}
          <div>
            <label className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Razonamiento Explicativo (Obligatorio)
            </label>
            <textarea
              rows={3}
              placeholder={t('forms.rationale_placeholder')}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
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
              }}
            />
          </div>

          {error && (
            <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
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
              {submitting ? 'Guardando...' : t('forms.submit_evidence')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
