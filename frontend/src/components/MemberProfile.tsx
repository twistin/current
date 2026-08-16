import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMemberProfile } from '../api/client';
import { MemberProfileResponse } from '../api/types';
import { getMemberAvatarColor } from './AuthorChip';
import { sanitizeExternalUrl } from '../utils/url';

interface MemberProfileProps {
  identifier: string;
  onBack: () => void;
  onSelectClaim: (claimId: string) => void;
  onRegisterClick?: () => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  identifier,
  onBack,
  onSelectClaim,
  onRegisterClick,
}) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<MemberProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'assertions' | 'evidence'>('all');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchMemberProfile(identifier)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message === 'member_not_found' ? t('profile.not_found') : err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [identifier, t]);

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="mono" style={{ color: 'var(--text-soft)', fontSize: '13px' }}>
          {t('profile.loading')}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '40px 0' }}>
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

        <div
          style={{
            background: 'rgba(232, 112, 90, 0.1)',
            border: '1px solid var(--refute)',
            borderRadius: '16px',
            padding: '24px',
            color: 'var(--text)',
          }}
        >
          <div className="mono" style={{ color: 'var(--refute)', fontWeight: 600, fontSize: '12px' }}>
            {t('profile.error_title')}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-body)' }}>
            {error || t('profile.not_found')}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginTop: '8px', lineHeight: 1.5 }}>
            {t('profile.stale_session_prompt')}
          </div>
          {onRegisterClick && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={onRegisterClick}
                className="mono"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + {t('profile.re_register_button')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { member, stats, assertions, evidence } = profile;
  const avatarColor = getMemberAvatarColor(member.pseudonym);
  const avatarInitials = member.pseudonym.slice(0, 2).toLowerCase();

  const joinedDate = new Date(member.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '780px', margin: '0 auto' }}>
      {/* Botón Volver */}
      <button
        onClick={onBack}
        className="mono"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← {t('verification.back_to_queue')}
      </button>

      {/* CABECERA DEL PERFIL SEUDÓNIMO */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: 'clamp(20px, 4vw, 32px)',
          boxShadow: 'var(--card-shadow-sm)',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          {/* Avatar + Seudónimo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                textTransform: 'lowercase',
                boxShadow: '0 4px 16px var(--accent-shadow)',
                flexShrink: 0,
              }}
            >
              {avatarInitials}
            </div>

            <div>
              <div className="eyebrow" style={{ color: 'var(--text-faint)', marginBottom: '4px' }}>
                {t('profile.eyebrow')}
              </div>
              <h1
                className="mono"
                style={{
                  fontSize: 'clamp(22px, 4.5vw, 28px)',
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1.2,
                }}
              >
                @{member.pseudonym}
              </h1>
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-faint)',
                  marginTop: '6px',
                }}
              >
                {t('profile.member_since')} {joinedDate} · {t('profile.zero_pii_badge')}
              </div>
            </div>
          </div>

          {/* Badge Destacado de Rigor Score */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '12px 18px',
              textAlign: 'right',
              minWidth: '140px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '9.5px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                marginBottom: '4px',
              }}
            >
              {t('profile.rigor_label')}
            </div>
            <div
              className="mono"
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--support)',
                lineHeight: 1,
              }}
            >
              {member.rigor_score}
            </div>
          </div>
        </div>

        {/* EXPLICACIÓN DEL RIGOR */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '14px', marginTop: '2px' }}>ℹ</span>
          <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--text)' }}>{t('profile.rigor_concept_title')}: </strong>
            {t('profile.rigor_concept_body')}
          </p>
        </div>
      </div>

      {/* ESTADÍSTICAS AGREGADAS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: 'var(--card-shadow-sm)',
          }}
        >
          <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            {t('profile.stats_contributions')}
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>
            {stats.total_contributions}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: 'var(--card-shadow-sm)',
          }}
        >
          <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            {t('profile.stats_claims')}
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)', marginTop: '4px' }}>
            {stats.claims_participated}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: 'var(--card-shadow-sm)',
          }}
        >
          <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            {t('profile.stats_assertions')}
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>
            {stats.assertions_count}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: 'var(--card-shadow-sm)',
          }}
        >
          <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            {t('profile.stats_evidence')}
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginTop: '4px' }}>
            {stats.evidence_count}
          </div>
        </div>
      </div>

      {/* SECCIÓN DE HISTORIAL DE APORTACIONES */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: '4px' }}>
              {t('profile.history_eyebrow')}
            </div>
            <h2 className="serif" style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text)' }}>
              {t('profile.history_title')}
            </h2>
          </div>

          {/* Filtro / Tabs */}
          <div
            className="mono"
            style={{
              display: 'flex',
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '2px',
              fontSize: '11px',
            }}
          >
            <button
              onClick={() => setActiveTab('all')}
              style={{
                background: activeTab === 'all' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'all' ? 'var(--accent-text)' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('profile.tab_all')} ({stats.total_contributions})
            </button>
            <button
              onClick={() => setActiveTab('assertions')}
              style={{
                background: activeTab === 'assertions' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'assertions' ? 'var(--accent-text)' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('profile.tab_assertions')} ({stats.assertions_count})
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              style={{
                background: activeTab === 'evidence' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'evidence' ? 'var(--accent-text)' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('profile.tab_evidence')} ({stats.evidence_count})
            </button>
          </div>
        </div>

        {/* LISTADO DE ACTIVIDAD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* AFIRMACIONES */}
          {(activeTab === 'all' || activeTab === 'assertions') &&
            assertions.map((a) => (
              <div
                key={`a-${a.id}`}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  boxShadow: 'var(--card-shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '9.5px',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'var(--surface-3)',
                      color: 'var(--text-soft)',
                      fontWeight: 600,
                    }}
                  >
                    {t('profile.type_assertion')}
                  </span>

                  {a.is_load_bearing && (
                    <span
                      className="mono"
                      style={{
                        fontSize: '9.5px',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'var(--accent)',
                        color: 'var(--accent-text)',
                        fontWeight: 600,
                      }}
                    >
                      {t('verification.tag_key')}
                    </span>
                  )}

                  {a.retracted_at && (
                    <span
                      className="mono"
                      style={{
                        fontSize: '9.5px',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(232, 112, 90, 0.12)',
                        color: 'var(--refute)',
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ {t('profile.retracted_tag')}
                    </span>
                  )}

                  {a.outcome && !a.retracted_at && (
                    <span
                      className="mono"
                      style={{
                        marginLeft: 'auto',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: a.outcome === 'held' ? 'var(--support)' : 'var(--refute)',
                      }}
                    >
                      ● {a.outcome === 'held' ? t('profile.outcome_held') : t('profile.outcome_overturned')}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '15px',
                    color: a.retracted_at ? 'var(--text-soft)' : 'var(--text)',
                    textDecoration: a.retracted_at ? 'line-through' : 'none',
                    lineHeight: 1.45,
                    marginBottom: '12px',
                  }}
                >
                  {a.text}
                </div>

                {/* Enlace al bulo correspondiente */}
                <div
                  onClick={() => onSelectClaim(a.claim_id)}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                  title={t('profile.view_claim_tooltip')}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ↗ <span className="serif" style={{ color: 'var(--text-body)' }}>“{a.claim_summary}”</span>
                  </span>
                  <span className="mono" style={{ fontSize: '11px', flexShrink: 0 }}>
                    {t('profile.view_claim')}
                  </span>
                </div>
              </div>
            ))}

          {/* EVIDENCIAS */}
          {(activeTab === 'all' || activeTab === 'evidence') &&
            evidence.map((ev) => {
              let stanceColor = 'var(--support)';
              if (ev.stance === 'refutes') stanceColor = 'var(--refute)';
              if (ev.stance === 'contextualizes') stanceColor = 'var(--misleading)';

              return (
                <div
                  key={`e-${ev.id}`}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    boxShadow: 'var(--card-shadow-sm)',
                    opacity: ev.retracted_at ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '9.5px',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'var(--surface-3)',
                        color: 'var(--text-soft)',
                        fontWeight: 600,
                      }}
                    >
                      {t('profile.type_evidence')}
                    </span>

                    <span
                      className="mono"
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: stanceColor,
                      }}
                    >
                      ● {t(`stances.${ev.stance}`, { defaultValue: ev.stance })}
                    </span>

                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                      · {t('verification.weight')} {ev.strength}
                    </span>

                    {ev.retracted_at && (
                      <span
                        className="mono"
                        style={{
                          fontSize: '9.5px',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(232, 112, 90, 0.12)',
                          color: 'var(--refute)',
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ {t('profile.retracted_tag')}
                      </span>
                    )}

                    {ev.outcome && !ev.retracted_at && (
                      <span
                        className="mono"
                        style={{
                          marginLeft: 'auto',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: ev.outcome === 'held' ? 'var(--support)' : 'var(--refute)',
                        }}
                      >
                        ● {ev.outcome === 'held' ? t('profile.outcome_held') : t('profile.outcome_overturned')}
                      </span>
                    )}
                  </div>

                  {/* Razonamiento explicativo */}
                  <div style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.5, marginBottom: '10px' }}>
                    "{ev.rationale}"
                  </div>

                  {/* Fuente citada */}
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-faint)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{t('verification.source_registered')}:</span>
                    {(() => {
                      const safeUrl = sanitizeExternalUrl(ev.source_url);
                      return safeUrl ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                        >
                          {ev.source_title}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-soft)' }}>{ev.source_title}</span>
                      );
                    })()}
                    <span>({ev.source_reliability})</span>
                  </div>

                  {/* Enlace al bulo correspondiente */}
                  <div
                    onClick={() => onSelectClaim(ev.claim_id)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                    title={t('profile.view_claim_tooltip')}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ↗ <span className="serif" style={{ color: 'var(--text-body)' }}>“{ev.claim_summary}”</span>
                    </span>
                    <span className="mono" style={{ fontSize: '11px', flexShrink: 0 }}>
                      {t('profile.view_claim')}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* Empty State */}
          {assertions.length === 0 && evidence.length === 0 && (
            <div
              className="mono"
              style={{
                background: 'var(--surface)',
                border: '1px dashed var(--border)',
                borderRadius: '14px',
                padding: '36px',
                textAlign: 'center',
                color: 'var(--text-faint)',
                fontSize: '13px',
              }}
            >
              {t('profile.no_activity')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
