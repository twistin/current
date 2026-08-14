import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimDetailResponse, Assertion } from '../api/types';
import { AuthorChip } from './AuthorChip';
import { MeterBar, calcWeight } from './MeterBar';
import { AddEvidenceModal } from './AddEvidenceModal';
import { DecomposeClaimModal } from './DecomposeClaimModal';

interface VerificationRoomProps {
  detail: ClaimDetailResponse;
  onBack: () => void;
  onRefresh: () => void;
  onRequestAuth: () => void;
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
}) => {
  const { t } = useTranslation();
  const { claim, assertions } = detail;
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

  return (
    <div style={{ paddingBottom: '60px' }}>
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
            fontSize: '27px',
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
        <div className="meta" style={{ display: 'flex', gap: '16px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-soft)' }}>
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

      <div
        style={{
          background: 'linear-gradient(158deg, var(--surface-2), #181B21)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          margin: '22px 0 10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '18px',
            padding: '20px 22px 16px',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '13px', margin: '32px 0 14px' }}>
        <span className="eyebrow">{t('verification.assertions_title')}</span>
        <small style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{t('verification.assertions_subtitle')}</small>
        <span style={{ height: '1px', background: 'var(--border)', flex: 1 }} />
        <button
          onClick={() => setShowDecomposeModal(true)}
          className="mono"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--accent)',
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
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
            <div style={{ padding: '16px 20px 15px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '11px' }}>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)' }}>
                  0{idx + 1}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontWeight: 500,
                    backgroundColor: a.is_load_bearing ? 'var(--accent)' : 'var(--surface-3)',
                    color: a.is_load_bearing ? '#0c1830' : 'var(--text-soft)',
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
                    gap: '7px',
                    color: sm.color,
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sm.color }} />
                  {statusText}
                </span>
              </div>

              <div style={{ fontSize: '15.5px', lineHeight: 1.45, color: 'var(--text)', maxWidth: '54ch' }}>{a.text}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px', fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--text-faint)' }}>
                {t('verification.proposed_by')} <AuthorChip pseudonym={a.created_by_pseudonym} />
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
                        <AuthorChip pseudonym={item.added_by_pseudonym} />
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

      {/* Modal Añadir Evidencia */}
      {addEvidenceTarget && (
        <AddEvidenceModal
          assertionId={addEvidenceTarget.id}
          assertionText={addEvidenceTarget.text}
          onClose={() => setAddEvidenceTarget(null)}
          onSuccess={onRefresh}
          onRequestAuth={onRequestAuth}
        />
      )}

      {/* Modal Descomponer Bulo */}
      {showDecomposeModal && (
        <DecomposeClaimModal
          claimId={claim.id}
          claimSummary={claim.summary}
          onClose={() => setShowDecomposeModal(false)}
          onSuccess={onRefresh}
          onRequestAuth={onRequestAuth}
        />
      )}
    </div>
  );
};
