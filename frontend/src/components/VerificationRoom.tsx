import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimDetailResponse, Assertion } from '../api/types';
import { AuthorChip } from './AuthorChip';
import { MeterBar, calcWeight } from './MeterBar';
import { AddEvidenceModal } from './AddEvidenceModal';
import { DecomposeClaimModal } from './DecomposeClaimModal';
import { PublishRebuttalModal } from './PublishRebuttalModal';

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
  const keyAssertion = assertions.find((a) => a.is_load_bearing && a.evidence.length > 0);
  const keyFact = keyAssertion
    ? keyAssertion.text.slice(0, 80).trimEnd() + (keyAssertion.text.length > 80 ? '…' : '')
    : '';
  const suffix = ` Verificación completa: ${claimUrl}`;
  const suffixDisplayLen = ' Verificación completa: '.length + 23; // Twitter acorta URLs a 23
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

  const [activeEvidence, setActiveEvidence] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    assertions.forEach((a) => {
      a.evidence.forEach((ev) => {
        initial[ev.evidence.id] = true;
      });
    });
    return initial;
  });

  const [addEvidenceTarget, setAddEvidenceTarget] = useState<{ id: string; text: string } | null>(null);
  const [showDecomposeModal, setShowDecomposeModal] = useState(false);
  const [showRebuttalModal, setShowRebuttalModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleEvidence = (id: string) => {
    setActiveEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deriveAssertionStatus = (a: Assertion): string => {
    let sup = 0;
    let ref = 0;
    a.evidence.forEach((ev) => {
      if (activeEvidence[ev.evidence.id] === false) return;
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
    const keyAssertions = assertions.filter((a) => a.is_load_bearing);
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

  const keyAssertions = assertions.filter((a) => a.is_load_bearing);
  const resolvedCount = keyAssertions.filter((a) => {
    const st = deriveAssertionStatus(a);
    return st === 'refuted' || st === 'supported';
  }).length;

  const hasContextChip = keyAssertions.some((a) =>
    a.evidence.some(
      (ev) =>
        activeEvidence[ev.evidence.id] !== false &&
        ev.evidence.stance === 'contextualizes' &&
        ev.source?.reliability !== 'disputed' &&
        (ev.evidence.strength === 'strong' || ev.evidence.strength === 'moderate')
    )
  );

  const canPublishRebuttal = currentVerdictKey !== 'unproven';

  // Variante principal (origen)
  const primaryVariant = variants && variants.length > 0 ? variants[0] : null;
  const platformName = primaryVariant ? primaryVariant.platform : 'Red Social';
  const originUrl = primaryVariant ? primaryVariant.origin_url : '#';

  const shortTweet = useMemo(
    () => buildShortTweet(claim.id, claim.summary, verdictLabel, currentVerdictKey, assertions),
    [claim.id, claim.summary, verdictLabel, currentVerdictKey, assertions]
  );

  const handleRespondOnSocial = () => {
    const isX = platformName.toUpperCase() === 'X' || platformName.toLowerCase().includes('twitter');

    if (isX) {
      // Para X: abre el composer con el texto corto pre-rellenado (Twitter intent)
      const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shortTweet)}`;
      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
      setToastMessage(t('rebuttal.x_opened_toast'));
    } else {
      // Para otras plataformas: copia el texto largo y abre la URL original
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rebuttal?.base_text ?? '');
      }
      setToastMessage(t('rebuttal.copied_toast', { platform: platformName }));
      if (originUrl && originUrl !== '#') {
        window.open(originUrl, '_blank', 'noopener,noreferrer');
      }
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Toast Notificación */}
      {toastMessage && (
        <div
          className="mono"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '16px',
            left: '16px',
            maxWidth: '340px',
            margin: '0 auto',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: 'var(--card-shadow)',
            zIndex: 1000,
            fontSize: '12px',
          }}
        >
          {toastMessage}
        </div>
      )}

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
        {t('verification.back_to_queue')}
      </button>

      <div className="claimhead" style={{ padding: '10px 0 6px' }}>
        <div className="eyebrow" style={{ marginBottom: '14px' }}>
          {t('verification.eyebrow')}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(20px, 5vw, 27px)',
            fontWeight: 500,
            lineHeight: 1.32,
            color: 'var(--text)',
            marginBottom: '16px',
          }}
        >
          <span style={{ color: 'var(--text-faint)' }}>“</span>
          {claim.summary}
          <span style={{ color: 'var(--text-faint)' }}>”</span>
        </h1>
        {/* Meta: propagación, tipo, hora — en móvil fluye en varias líneas */}
        <div
          className="meta"
          style={{
            display: 'flex',
            gap: '10px 16px',
            flexWrap: 'wrap',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--text-soft)',
          }}
        >
          <span>
            {t('verification.propagation')}{' '}
            <span style={{ color: 'var(--refute)' }}>
              {t('verification.propagation_high')} ({claim.propagation_score})
            </span>
          </span>
          <span>
            {t('verification.type')} <i>{kindLabel}</i>
          </span>
          <span>
            {t('verification.detected')}{' '}
            <i>{new Date(claim.detected_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</i>
          </span>
        </div>
      </div>

      {/* Panel de Veredicto Derivado */}
      <div
        style={{
          background: 'var(--verdict-gradient)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          margin: '22px 0 10px',
          overflow: 'hidden',
        }}
      >
        {/* Panel interior del veredicto — en móvil apila veredicto y botón */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '18px 16px 14px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: '9.5px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                marginBottom: '11px',
              }}
            >
              {t('verification.verdict_label')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  backgroundColor: verdictMeta.color,
                }}
              />
              <span
                className="serif"
                style={{
                  fontSize: '34px',
                  fontWeight: 600,
                  color: verdictMeta.color,
                  lineHeight: 1,
                }}
              >
                {verdictLabel}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-faint)', marginTop: '11px', lineHeight: 1.6 }}>
              {currentVerdictKey === 'unproven' && (
                <span>{t('verification.unproven_sub', { count: keyAssertions.length })}</span>
              )}
              {currentVerdictKey === 'misleading' && (
                <span>{t('verification.misleading_sub', { count: keyAssertions.length })}</span>
              )}
              {(currentVerdictKey === 'false' || currentVerdictKey === 'true') && (
                <span>
                  {t('verification.resolved_sub', {
                    count: keyAssertions.length,
                    resolved: resolvedCount,
                    total: keyAssertions.length,
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Columna derecha: live tag + botón redactar — se apila bajo el veredicto en móvil */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
            <div
              className="mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '9.5px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                }}
              />
              {t('verification.live_tag')}
            </div>

            {/* Botón Redactar Desmentido */}
            {!rebuttal && (
              <button
                onClick={() => {
                  if (canPublishRebuttal) {
                    setShowRebuttalModal(true);
                  }
                }}
                disabled={!canPublishRebuttal}
                title={!canPublishRebuttal ? t('rebuttal.draft_disabled_tooltip') : ''}
                className="mono"
                style={{
                  background: canPublishRebuttal ? 'var(--accent)' : 'var(--surface-3)',
                  color: canPublishRebuttal ? 'var(--accent-text)' : 'var(--text-faint)',
                  border: canPublishRebuttal ? 'none' : '1px solid var(--border)',
                  fontWeight: 600,
                  fontSize: '11px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  cursor: canPublishRebuttal ? 'pointer' : 'not-allowed',
                  opacity: canPublishRebuttal ? 1 : 0.6,
                }}
              >
                {t('rebuttal.draft_button')}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 22px 18px' }}>
          {keyAssertions.map((a, idx) => {
            const st = deriveAssertionStatus(a);
            const sm = STATUS_META[st] || STATUS_META.unverified;
            const statusText = t(`assertion_statuses.${sm.key}`);

            return (
              <div
                key={a.id}
                className="mono"
                style={{
                  fontSize: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '7px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  color: 'var(--text-soft)',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: sm.color }} />
                {t('verification.afirm_chip', { num: idx + 1, status: statusText })}
              </div>
            );
          })}
          {hasContextChip && (
            <div
              className="mono"
              style={{
                fontSize: '10px',
                border: '1px dashed var(--border)',
                borderRadius: '7px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                color: 'var(--text-soft)',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--misleading)' }} />
              {t('verification.solid_context')}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DESMENTIDO PUBLICADO Y VUELTA A REDES */}
      {rebuttal && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--accent)',
            borderRadius: '16px',
            padding: '24px',
            margin: '24px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                {t('rebuttal.section_title')}
              </div>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                {t('rebuttal.section_subtitle')}
              </div>
            </div>

            {/* BOTÓN VUELTA A REDES SOCIALES (Responder en [Plataforma]) */}
            <button
              onClick={() => handleRespondOnSocial()}
              className="mono"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                padding: '9px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px var(--accent-shadow)',
              }}
            >
              ↗ {t('rebuttal.respond_on_platform', { platform: platformName })}
            </button>
          </div>

          {/* Texto del Desmentido */}
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              color: 'var(--text)',
              fontSize: '13.5px',
              fontFamily: 'var(--mono)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {rebuttal.base_text}
          </div>

          {/* Cadena de Evidencias / Fuentes asociadas al desmentido */}
          <div style={{ marginTop: '16px' }}>
            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-faint)', marginBottom: '8px' }}>
              {t('rebuttal.source_chain_title')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assertions.flatMap((a) =>
                a.evidence.map((ev) => (
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
                    <a
                      href={ev.source?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text)', textDecoration: 'underline' }}
                    >
                      {ev.source?.title || 'Fuente'}
                    </a>
                    <span>({ev.source?.reliability})</span>
                    <AuthorChip pseudonym={ev.added_by_pseudonym} onSelectMember={onSelectMember} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sección Afirmaciones — el botón baja en móvil con flex-wrap */}
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
        const derivedStatus = a.status || deriveAssertionStatus(a);
        const sm = STATUS_META[derivedStatus] || STATUS_META.unverified;
        const statusText = t(`assertion_statuses.${sm.key}`);

        return (
          <div
            key={a.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              marginTop: '14px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px 13px', borderBottom: '1px solid var(--border-soft)' }}>
              {/* Fila: número + badge tipo + estado — en móvil el estado puede bajar */}
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
                    backgroundColor: a.is_load_bearing ? 'var(--accent)' : 'var(--surface-3)',
                    color: a.is_load_bearing ? 'var(--accent-text)' : 'var(--text-soft)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.is_load_bearing ? t('verification.tag_key') : t('verification.tag_aux')}
                </span>
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
              </div>

              <div style={{ fontSize: '15px', lineHeight: 1.5, color: 'var(--text)' }}>{a.text}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px', fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--text-faint)' }}>
                {t('verification.proposed_by')} <AuthorChip pseudonym={a.created_by_pseudonym} onSelectMember={onSelectMember} />
              </div>
            </div>

            <MeterBar evidenceList={a.evidence} activeIds={activeEvidence} />

            <div style={{ padding: '4px 12px 10px' }}>
              {a.evidence.map((item) => {
                const ev = item.evidence;
                const src = item.source;
                const stanceMeta = STANCE_META[ev.stance] || STANCE_META.supports;
                const stanceLabel = t(`stances.${stanceMeta.key}`);
                const weightVal = calcWeight(item);
                const isActive = activeEvidence[ev.id] !== false;

                let stanceColor = 'var(--support)';
                if (ev.stance === 'refutes') stanceColor = 'var(--refute)';
                if (ev.stance === 'contextualizes') stanceColor = 'var(--misleading)';

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '20px 1fr',
                      gap: '11px',
                      padding: '13px 8px',
                      borderTop: '1px solid var(--border-soft)',
                      opacity: isActive ? 1 : 0.38,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
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
                            color: stanceColor,
                          }}
                        >
                          <span>{stanceMeta.sg}</span>
                          {stanceLabel}
                        </span>
                        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)' }}>
                          {src ? `${src.kind} · ${src.reliability}` : 'fuente'} · {ev.strength}
                        </span>
                        <span className="mono" style={{ marginLeft: 'auto', fontSize: '9.5px', color: 'var(--text-soft)' }}>
                          {t('verification.weight')} <b style={{ color: 'var(--text-body)', fontWeight: 600 }}>{ev.stance === 'contextualizes' ? '—' : weightVal.toFixed(1)}</b>
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, marginBottom: '3px' }}>
                        {src ? src.title : t('verification.source_registered')}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.5, maxWidth: '58ch' }}>
                        {ev.rationale}
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <AuthorChip pseudonym={item.added_by_pseudonym} onSelectMember={onSelectMember} />
                      </div>
                    </div>
                  </div>
                );
              })}

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
    </div>
  );
};
