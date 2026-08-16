import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimDetailResponse, Assertion } from '../api/types';
import { AuthorChip } from './AuthorChip';
import { MeterBar, calcWeight } from './MeterBar';
import { AddEvidenceModal } from './AddEvidenceModal';
import { DecomposeClaimModal } from './DecomposeClaimModal';
import { PublishRebuttalModal } from './PublishRebuttalModal';
import { sanitizeExternalUrl } from '../utils/url';
import { getStoredPseudonym, retractEvidence, retractAssertion } from '../api/client';

const CURRENT_BASE_URL =
  import.meta.env.VITE_PUBLIC_URL ||
  'https://current-app-qg6pp.ondigitalocean.app';

const VERDICT_EMOJI: Record<string, string> = {
  false: '❌',
  misleading: '⚠️',
  true: '✅',
};

function buildShortTweet(
  claimId: string,
  claimSummary: string,
  verdictLabel: string,
  verdictKey: string,
  assertions: Assertion[]
): string {
  const claimUrl = `${CURRENT_BASE_URL}/claims/${claimId}`;
  const emoji = VERDICT_EMOJI[verdictKey] ?? '🔍';

  const allEvidences = assertions
    .filter((a) => !a.retracted_at)
    .flatMap((a) => a.evidence)
    .filter((e) => !e.evidence.retracted_at);

  const refutingEv = allEvidences.find((e) => e.evidence.stance === 'refutes');
  const contextualizingEv = allEvidences.find((e) => e.evidence.stance === 'contextualizes');
  const supportingEv = allEvidences.find((e) => e.evidence.stance === 'supports');

  let keyFact = '';
  if (verdictKey === 'false' && refutingEv) {
    const raw = refutingEv.evidence.rationale.trim();
    keyFact = `Dato clave: ${raw.slice(0, 90).trimEnd()}${raw.length > 90 ? '…' : ''}`;
  } else if (verdictKey === 'misleading' && contextualizingEv) {
    const raw = contextualizingEv.evidence.rationale.trim();
    keyFact = `Contexto real: ${raw.slice(0, 90).trimEnd()}${raw.length > 90 ? '…' : ''}`;
  } else if (verdictKey === 'true' && supportingEv) {
    const raw = supportingEv.evidence.rationale.trim();
    keyFact = `Dato verificado: ${raw.slice(0, 90).trimEnd()}${raw.length > 90 ? '…' : ''}`;
  } else {
    const keyAssertion = assertions.find(
      (a) => !a.retracted_at && a.is_load_bearing && a.evidence.some((e) => !e.evidence.retracted_at)
    );
    if (keyAssertion) {
      keyFact = keyAssertion.text.slice(0, 80).trimEnd() + (keyAssertion.text.length > 80 ? '…' : '');
    }
  }

  const suffix = ` Verificación con fuentes: ${claimUrl}`;
  const suffixDisplayLen = ' Verificación con fuentes: '.length + 23; // Twitter acorta URLs a 23
  const verdictLine = `${emoji} ${verdictLabel.toUpperCase()}:`;
  const budgetForSummary = 280 - verdictLine.length - 2 - (keyFact ? keyFact.length + 2 : 0) - suffixDisplayLen;
  const truncated = claimSummary.slice(0, Math.max(budgetForSummary, 20)).trimEnd() +
    (claimSummary.length > Math.max(budgetForSummary, 20) ? '…' : '');
  return [verdictLine, `"${truncated}"`, keyFact ? keyFact + '.' : '', suffix].filter(Boolean).join('\n');
}

interface VerificationRoomProps {
  detail: ClaimDetailResponse;
  onBack: () => void;
  onRefresh: () => void;
  onRequestAuth: () => void;
  onSelectMember?: (pseudonym: string) => void;
}

const STANCE_META: Record<string, { cls: string; sg: string; key: string }> = {
  supports: { cls: 'st-sup', sg: '⊕', key: 'supports' },
  refutes: { cls: 'st-ref', sg: '⊖', key: 'refutes' },
  contextualizes: { cls: 'st-ctx', sg: '◐', key: 'contextualizes' },
};

const STATUS_META: Record<string, { color: string; key: string }> = {
  supported: { color: 'var(--support)', key: 'supported' },
  refuted: { color: 'var(--refute)', key: 'refuted' },
  contested: { color: 'var(--contested)', key: 'contested' },
  unverified: { color: 'var(--neutral)', key: 'unverified' },
};

const VERDICT_META: Record<string, { color: string; key: string }> = {
  true: { color: 'var(--support)', key: 'true' },
  false: { color: 'var(--refute)', key: 'false' },
  misleading: { color: 'var(--misleading)', key: 'misleading' },
  unproven: { color: 'var(--neutral)', key: 'unproven' },
};

export const VerificationRoom: React.FC<VerificationRoomProps> = ({
  detail,
  onBack,
  onRefresh,
  onRequestAuth,
  onSelectMember,
}) => {
  const { t } = useTranslation();
  const { claim, assertions, variants, rebuttal } = detail;
  const kindLabel = t(`kinds.${claim.kind}`, { defaultValue: claim.kind });

  const currentPseudonym = getStoredPseudonym();

  const [activeEvidence, setActiveEvidence] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    assertions.forEach((a) => {
      a.evidence.forEach((ev) => {
        initial[ev.evidence.id] = !ev.evidence.retracted_at;
      });
    });
    return initial;
  });

  const [addEvidenceTarget, setAddEvidenceTarget] = useState<{ id: string; text: string } | null>(null);
  const [showDecomposeModal, setShowDecomposeModal] = useState(false);
  const [showRebuttalModal, setShowRebuttalModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de confirmación de retractación
  const [retractTarget, setRetractTarget] = useState<{
    type: 'evidence' | 'assertion';
    id: string;
    textOrTitle: string;
  } | null>(null);
  const [retracting, setRetracting] = useState<boolean>(false);
  const [retractError, setRetractError] = useState<string | null>(null);

  const toggleEvidence = (id: string) => {
    setActiveEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deriveAssertionStatus = (a: Assertion): string => {
    if (a.retracted_at) return 'unverified';

    let sup = 0;
    let ref = 0;
    a.evidence.forEach((ev) => {
      if (ev.evidence.retracted_at || activeEvidence[ev.evidence.id] === false) return;
      const w = calcWeight(ev);
      if (ev.evidence.stance === 'supports') sup += w;
      if (ev.evidence.stance === 'refutes') ref += w;
    });

    const T = 1.5;
    if (sup < T && ref < T) return 'unverified';
    if (sup >= T && ref < T) return 'supported';
    if (ref >= T && sup < T) return 'refuted';
    return 'contested';
  };

  const deriveVerdict = (): string => {
    const keyAssertions = assertions.filter((a) => a.is_load_bearing && !a.retracted_at);
    if (keyAssertions.length === 0) return 'unproven';

    const statuses = keyAssertions.map(deriveAssertionStatus);

    let v: string;
    if (statuses.some((s) => s === 'unverified' || s === 'contested')) {
      v = 'unproven';
    } else if (statuses.every((s) => s === 'refuted')) {
      v = 'false';
    } else if (statuses.every((s) => s === 'supported')) {
      v = 'true';
    } else {
      v = 'misleading';
    }

    if (v === 'false' || v === 'true') {
      const hasSolidContext = keyAssertions.some((a) =>
        a.evidence.some(
          (ev) =>
            !ev.evidence.retracted_at &&
            activeEvidence[ev.evidence.id] !== false &&
            ev.evidence.stance === 'contextualizes' &&
            ev.source?.reliability !== 'disputed' &&
            (ev.evidence.strength === 'strong' || ev.evidence.strength === 'moderate')
        )
      );
      if (hasSolidContext) {
        v = 'misleading';
      }
    }

    return v;
  };

  const currentVerdictKey = claim.verdict || deriveVerdict();
  const verdictMeta = VERDICT_META[currentVerdictKey] || VERDICT_META.unproven;
  const verdictLabel = t(`verdicts.${verdictMeta.key}`);

  const activeKeyAssertions = assertions.filter((a) => a.is_load_bearing && !a.retracted_at);
  const resolvedCount = activeKeyAssertions.filter((a) => {
    const st = deriveAssertionStatus(a);
    return st === 'refuted' || st === 'supported';
  }).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmRetract = async () => {
    if (!retractTarget) return;
    setRetracting(true);
    setRetractError(null);
    try {
      if (retractTarget.type === 'evidence') {
        await retractEvidence(retractTarget.id);
      } else {
        await retractAssertion(retractTarget.id);
      }
      setRetractTarget(null);
      onRefresh();
    } catch (err) {
      setRetractError(err instanceof Error ? err.message : 'Error al retirar la aportación');
    } finally {
      setRetracting(false);
    }
  };

  const shareOnTwitter = () => {
    const tweetText = buildShortTweet(
      claim.id,
      claim.summary,
      verdictLabel,
      currentVerdictKey,
      assertions
    );
    navigator.clipboard?.writeText(tweetText).catch(() => {});
    showToast(t('rebuttal.x_opened_toast'));
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyTweetText = () => {
    const tweetText = buildShortTweet(
      claim.id,
      claim.summary,
      verdictLabel,
      currentVerdictKey,
      assertions
    );
    navigator.clipboard
      .writeText(tweetText)
      .then(() => {
        showToast(t('rebuttal.copied_toast', { platform: 'portapapeles' }));
      })
      .catch(() => {
        showToast(t('rebuttal.copied_toast', { platform: 'portapapeles' }));
      });
  };

  return (
    <div className="room-container">
      {toastMessage && (
        <div
          className="mono"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Botón Volver a la cola */}
      <button
        onClick={onBack}
        className="mono"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← {t('verification.back_to_queue')}
      </button>

      <div className="claimhead" style={{ padding: '10px 0 6px' }}>
        <div className="eyebrow" style={{ marginBottom: '14px' }}>
          {t('verification.eyebrow')}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: '28px',
            lineHeight: 1.3,
            color: 'var(--text)',
            fontWeight: 500,
            marginBottom: '18px',
          }}
        >
          “{claim.summary}”
        </h1>

        {/* Metadatos del bulo */}
        <div
          className="mono"
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-soft)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            {t('verification.propagation')}:{' '}
            <strong style={{ color: 'var(--refute)' }}>
              {claim.propagation_score}/100 {claim.propagation_score > 70 ? t('verification.propagation_high') : ''}
            </strong>
          </span>
          <span>·</span>
          <span>
            {t('verification.type')}: <strong style={{ color: 'var(--text)' }}>{kindLabel}</strong>
          </span>
          <span>·</span>
          <span>
            {t('verification.detected')}:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {new Date(claim.detected_at).toLocaleDateString()}
            </strong>
          </span>
        </div>

        {/* Variantes del bulo (URLs donde circula) */}
        {variants && variants.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: 'var(--surface-2)',
              borderRadius: '10px',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '10.5px',
                color: 'var(--text-faint)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Variantes registradas ({variants.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {variants.map((v) => {
                const safeUrl = sanitizeExternalUrl(v.origin_url);
                return (
                  <div
                    key={v.id}
                    className="mono"
                    style={{
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-soft)',
                    }}
                  >
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'var(--surface-3)',
                        fontSize: '9.5px',
                        color: 'var(--text)',
                      }}
                    >
                      {v.platform}
                    </span>
                    {safeUrl ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--accent)',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.origin_url}
                      </a>
                    ) : (
                      <span
                        style={{
                          color: 'var(--text-soft)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.origin_url}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta del Veredicto Derivado */}
      <div
        className="card card-hero"
        style={{
          marginTop: '20px',
          borderLeft: `4px solid ${verdictMeta.color}`,
          background: 'var(--surface)',
          padding: '24px 28px',
          borderRadius: '16px',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span className="mono" style={{ fontSize: '10.5px', letterSpacing: '0.12em', color: 'var(--text-faint)' }}>
            {t('verification.verdict_label')}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '10.5px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'var(--surface-2)',
              color: 'var(--accent)',
              border: '1px solid var(--border-soft)',
            }}
          >
            ⚡ {t('verification.live_tag')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
          <h2
            className="serif"
            style={{
              fontSize: '42px',
              fontWeight: 600,
              lineHeight: 1.1,
              color: verdictMeta.color,
              margin: 0,
            }}
          >
            {verdictLabel}
          </h2>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            {currentVerdictKey === 'unproven' &&
              t('verification.unproven_sub', { count: activeKeyAssertions.length })}
            {currentVerdictKey === 'misleading' &&
              t('verification.misleading_sub', { count: activeKeyAssertions.length })}
            {(currentVerdictKey === 'false' || currentVerdictKey === 'true') &&
              t('verification.resolved_sub', {
                count: activeKeyAssertions.length,
                resolved: resolvedCount,
                total: activeKeyAssertions.length,
              })}
          </span>
        </div>

        {/* Chips de estado por cada afirmación clave activa */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {activeKeyAssertions.map((a, idx) => {
            const st = deriveAssertionStatus(a);
            const sm = STATUS_META[st] || STATUS_META.unverified;
            return (
              <span
                key={a.id}
                className="mono"
                style={{
                  fontSize: '11px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'var(--surface-2)',
                  border: `1px solid ${sm.color}`,
                  color: sm.color,
                }}
              >
                {t('verification.afirm_chip', { num: idx + 1, status: t(`assertion_statuses.${sm.key}`) })}
              </span>
            );
          })}
        </div>

        {/* Botones de acción del veredicto */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={shareOnTwitter}
            disabled={currentVerdictKey === 'unproven'}
            className="mono"
            style={{
              background: '#000000',
              border: '1px solid #333333',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: currentVerdictKey === 'unproven' ? 'not-allowed' : 'pointer',
              opacity: currentVerdictKey === 'unproven' ? 0.45 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
          >
            <span>𝕏</span> {t('rebuttal.respond_on_platform', { platform: '𝕏' })}
          </button>

          <button
            onClick={copyTweetText}
            disabled={currentVerdictKey === 'unproven'}
            className="mono"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '11.5px',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: currentVerdictKey === 'unproven' ? 'not-allowed' : 'pointer',
              opacity: currentVerdictKey === 'unproven' ? 0.45 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
          >
            <span>📋</span> {t('rebuttal.platform_other')}
          </button>

          {!rebuttal && (
            <button
              onClick={() => setShowRebuttalModal(true)}
              disabled={currentVerdictKey === 'unproven'}
              className="mono"
              style={{
                marginLeft: 'auto',
                background: currentVerdictKey === 'unproven' ? 'var(--surface-3)' : 'var(--accent)',
                border: 'none',
                color: currentVerdictKey === 'unproven' ? 'var(--text-faint)' : 'var(--accent-text)',
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: currentVerdictKey === 'unproven' ? 'not-allowed' : 'pointer',
                opacity: currentVerdictKey === 'unproven' ? 0.5 : 1,
                boxShadow: currentVerdictKey === 'unproven' ? 'none' : '0 2px 8px var(--accent-shadow)',
              }}
              title={currentVerdictKey === 'unproven' ? t('rebuttal.draft_disabled_tooltip') : undefined}
            >
              {t('rebuttal.draft_button')}
            </button>
          )}
        </div>
      </div>

      {/* Desmentido Oficial Publicado si existe */}
      {rebuttal && rebuttal.status === 'published' && (
        <div
          style={{
            marginTop: '20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--support)' }}>
                {t('rebuttal.section_title')}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '2px' }}>
                {t('rebuttal.section_subtitle')}
              </p>
            </div>
            <span
              className="mono"
              style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(46, 139, 94, 0.15)',
                color: 'var(--support)',
                fontWeight: 600,
              }}
            >
              ✓ PUBLICADO
            </span>
          </div>

          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
              borderRadius: '10px',
              padding: '14px 18px',
              fontSize: '14.5px',
              color: 'var(--text)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {rebuttal.base_text}
          </div>

          {/* Cadena de Evidencias / Fuentes asociadas al desmentido (solo activas y no retiradas) */}
          <div style={{ marginTop: '16px' }}>
            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-faint)', marginBottom: '8px' }}>
              {t('rebuttal.source_chain_title')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assertions
                .filter((a) => !a.retracted_at)
                .flatMap((a) =>
                  a.evidence
                    .filter((ev) => !ev.evidence.retracted_at)
                    .map((ev) => (
                      <div
                        key={ev.evidence.id}
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ color: 'var(--accent)' }}>•</span>
                        {(() => {
                          const safeUrl = sanitizeExternalUrl(ev.source?.url);
                          return safeUrl ? (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text)', textDecoration: 'underline' }}
                            >
                              {ev.source?.title || 'Fuente'}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text)' }}>{ev.source?.title || 'Fuente'}</span>
                          );
                        })()}
                        <span>({ev.source?.reliability})</span>
                        <AuthorChip pseudonym={ev.added_by_pseudonym} onSelectMember={onSelectMember} />
                      </div>
                    ))
                )}
            </div>
          </div>
        </div>
      )}

      {/* Sección Afirmaciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '32px 0 14px', flexWrap: 'wrap' }}>
        <span className="eyebrow">{t('verification.assertions_title')}</span>
        <small style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{t('verification.assertions_subtitle')}</small>
        <span style={{ height: '1px', background: 'var(--border)', flex: 1, minWidth: '20px' }} />
        <button
          onClick={() => setShowDecomposeModal(true)}
          className="mono"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--accent)',
            fontSize: '11px',
            padding: '7px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t('verification.decompose_button')}
        </button>
      </div>

      {assertions.map((a, idx) => {
        const isAssertionRetracted = !!a.retracted_at;
        const derivedStatus = isAssertionRetracted ? 'unverified' : a.status || deriveAssertionStatus(a);
        const sm = STATUS_META[derivedStatus] || STATUS_META.unverified;
        const statusText = t(`assertion_statuses.${sm.key}`);

        const isOwnAssertion =
          !!currentPseudonym &&
          a.created_by_pseudonym.toLowerCase() === currentPseudonym.toLowerCase();

        return (
          <div
            key={a.id}
            style={{
              background: isAssertionRetracted ? 'var(--surface-2)' : 'var(--surface)',
              border: isAssertionRetracted ? '1px dashed var(--border-soft)' : '1px solid var(--border)',
              borderRadius: '16px',
              marginTop: '14px',
              overflow: 'hidden',
              opacity: isAssertionRetracted ? 0.65 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div style={{ padding: '14px 16px 13px', borderBottom: '1px solid var(--border-soft)' }}>
              {/* Fila: número + badge tipo + estado + botón retirar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', flexShrink: 0 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '9.5px',
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontWeight: 500,
                    backgroundColor: isAssertionRetracted ? 'var(--surface-3)' : a.is_load_bearing ? 'var(--accent)' : 'var(--surface-3)',
                    color: isAssertionRetracted ? 'var(--text-faint)' : a.is_load_bearing ? 'var(--accent-text)' : 'var(--text-soft)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.is_load_bearing ? t('verification.tag_key') : t('verification.tag_aux')}
                </span>

                {isAssertionRetracted ? (
                  <span
                    className="mono"
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 600,
                      color: 'var(--refute)',
                      background: 'rgba(232, 112, 90, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ⚠️ {t('verification.retracted_assertion_badge')}
                  </span>
                ) : (
                  <span
                    className="mono"
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: sm.color,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sm.color, flexShrink: 0 }} />
                    {statusText}
                  </span>
                )}

                {/* Botón para que el autor retire su propia afirmación activa */}
                {!isAssertionRetracted && isOwnAssertion && (
                  <button
                    onClick={() =>
                      setRetractTarget({
                        type: 'assertion',
                        id: a.id,
                        textOrTitle: a.text,
                      })
                    }
                    className="mono"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-faint)',
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginLeft: '8px',
                    }}
                    title="Retirar esta afirmación con rastro de auditoría"
                  >
                    {t('verification.retract_assertion_button')}
                  </button>
                )}
              </div>

              <div
                style={{
                  fontSize: '15px',
                  lineHeight: 1.5,
                  color: isAssertionRetracted ? 'var(--text-soft)' : 'var(--text)',
                  textDecoration: isAssertionRetracted ? 'line-through' : 'none',
                }}
              >
                {a.text}
              </div>

              {isAssertionRetracted && (
                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '6px' }}>
                  {t('verification.retracted_notice')}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px', fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--text-faint)' }}>
                {t('verification.proposed_by')} <AuthorChip pseudonym={a.created_by_pseudonym} onSelectMember={onSelectMember} />
              </div>
            </div>

            {!isAssertionRetracted && <MeterBar evidenceList={a.evidence} activeIds={activeEvidence} />}

            <div style={{ padding: '4px 12px 10px' }}>
              {a.evidence.map((item) => {
                const ev = item.evidence;
                const src = item.source;
                const isEvRetracted = !!ev.retracted_at;
                const stanceMeta = STANCE_META[ev.stance] || STANCE_META.supports;
                const stanceLabel = t(`stances.${stanceMeta.key}`);
                const weightVal = calcWeight(item);
                const isActive = !isEvRetracted && activeEvidence[ev.id] !== false;

                const isOwnEvidence =
                  !!currentPseudonym &&
                  item.added_by_pseudonym.toLowerCase() === currentPseudonym.toLowerCase();

                let stanceColor = 'var(--support)';
                if (ev.stance === 'refutes') stanceColor = 'var(--refute)';
                if (ev.stance === 'contextualizes') stanceColor = 'var(--misleading)';

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isEvRetracted ? '1fr' : '20px 1fr',
                      gap: '11px',
                      padding: '13px 8px',
                      borderTop: '1px solid var(--border-soft)',
                      opacity: isEvRetracted ? 0.55 : isActive ? 1 : 0.38,
                      background: isEvRetracted ? 'var(--surface-3)' : 'transparent',
                      borderRadius: isEvRetracted ? '8px' : '0',
                      marginBottom: isEvRetracted ? '6px' : '0',
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {!isEvRetracted && (
                      <div>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleEvidence(ev.id)}
                          aria-label={`Incluir evidencia de ${src ? src.title : 'Fuente'}`}
                          style={{
                            width: '15px',
                            height: '15px',
                            cursor: 'pointer',
                            marginTop: '2px',
                            accentColor: 'var(--accent)',
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: isEvRetracted ? 'var(--text-faint)' : stanceColor,
                          }}
                        >
                          <span>{stanceMeta.sg}</span>
                          {stanceLabel}
                        </span>
                        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)' }}>
                          {src ? `${src.kind} · ${src.reliability}` : 'fuente'} · {ev.strength}
                        </span>

                        {isEvRetracted ? (
                          <span
                            className="mono"
                            style={{
                              marginLeft: 'auto',
                              fontSize: '9.5px',
                              fontWeight: 600,
                              color: 'var(--refute)',
                              background: 'rgba(232, 112, 90, 0.12)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ⚠️ {t('verification.retracted_badge')}
                          </span>
                        ) : (
                          <span className="mono" style={{ marginLeft: 'auto', fontSize: '9.5px', color: 'var(--text-soft)' }}>
                            {t('verification.weight')}{' '}
                            <b style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                              {ev.stance === 'contextualizes' ? '—' : weightVal.toFixed(1)}
                            </b>
                          </span>
                        )}

                        {/* Botón para que el autor retire su propia evidencia activa */}
                        {!isEvRetracted && isOwnEvidence && (
                          <button
                            onClick={() =>
                              setRetractTarget({
                                type: 'evidence',
                                id: ev.id,
                                textOrTitle: src?.title || ev.rationale,
                              })
                            }
                            className="mono"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-soft)',
                              color: 'var(--text-faint)',
                              fontSize: '9.5px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginLeft: '8px',
                            }}
                            title="Retirar esta evidencia con rastro de auditoría"
                          >
                            {t('verification.retract_evidence_button')}
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, marginBottom: '3px' }}>
                        {(() => {
                          const safeUrl = sanitizeExternalUrl(src?.url);
                          return safeUrl ? (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              {src?.title || t('verification.source_registered')}
                            </a>
                          ) : (
                            <span>{src?.title || t('verification.source_registered')}</span>
                          );
                        })()}
                      </div>

                      <div
                        style={{
                          fontSize: '12.5px',
                          color: isEvRetracted ? 'var(--text-faint)' : 'var(--text-soft)',
                          lineHeight: 1.5,
                          maxWidth: '58ch',
                          textDecoration: isEvRetracted ? 'line-through' : 'none',
                        }}
                      >
                        {ev.rationale}
                      </div>

                      {isEvRetracted && (
                        <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '4px' }}>
                          {t('verification.retracted_notice')}
                        </div>
                      )}

                      <div style={{ marginTop: '8px' }}>
                        <AuthorChip pseudonym={item.added_by_pseudonym} onSelectMember={onSelectMember} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isAssertionRetracted && (
                <div
                  onClick={() => setAddEvidenceTarget({ id: a.id, text: a.text })}
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent)',
                    padding: '11px 8px 5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <span>{t('verification.add_evidence')}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: '22px',
          border: '1px solid var(--border)',
          borderRadius: '13px',
          padding: '15px 18px',
          background: 'var(--surface)',
          display: 'flex',
          gap: '13px',
          alignItems: 'flex-start',
        }}
      >
        <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 'none', marginTop: '2px' }}>
          {t('verification.try_it_title')}
        </span>
        <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.6 }}>
          {t('verification.try_it_body')}
        </p>
      </div>

      {addEvidenceTarget && (
        <AddEvidenceModal
          assertionId={addEvidenceTarget.id}
          assertionText={addEvidenceTarget.text}
          onClose={() => setAddEvidenceTarget(null)}
          onSuccess={onRefresh}
          onRequestAuth={onRequestAuth}
        />
      )}

      {showDecomposeModal && (
        <DecomposeClaimModal
          claimId={claim.id}
          claimSummary={claim.summary}
          onClose={() => setShowDecomposeModal(false)}
          onSuccess={onRefresh}
          onRequestAuth={onRequestAuth}
        />
      )}

      {showRebuttalModal && (
        <PublishRebuttalModal
          claimId={claim.id}
          claimSummary={claim.summary}
          verdictLabel={verdictLabel}
          verdictKey={currentVerdictKey}
          assertions={assertions}
          onClose={() => setShowRebuttalModal(false)}
          onSuccess={onRefresh}
          onRequestAuth={onRequestAuth}
        />
      )}

      {/* Modal de confirmación para Retractar aportación con rastro */}
      {retractTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--refute)', marginBottom: '8px' }}>
              ⚠️ {t('verification.retract_modal_title')}
            </div>
            <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '10px' }}>
              “{retractTarget.textOrTitle.length > 80 ? retractTarget.textOrTitle.slice(0, 80) + '…' : retractTarget.textOrTitle}”
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.55, marginBottom: '18px' }}>
              {t('verification.retract_modal_desc')}
            </p>

            {retractError && (
              <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px', marginBottom: '14px' }}>
                ⚠️ {retractError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRetractTarget(null)}
                disabled={retracting}
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
                {t('verification.retract_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRetract}
                disabled={retracting}
                className="mono"
                style={{
                  background: 'var(--refute)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  opacity: retracting ? 0.7 : 1,
                }}
              >
                {retracting ? '...' : t('verification.retract_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
