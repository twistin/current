import React from 'react';
import { useTranslation } from 'react-i18next';

interface ManifestoLandingProps {
  onEnterQueue: () => void;
  onRegister: () => void;
  onReadFullManifesto: () => void;
  isAuthenticated: boolean;
}

export const ManifestoLanding: React.FC<ManifestoLandingProps> = ({
  onEnterQueue,
  onRegister,
  onReadFullManifesto,
  isAuthenticated,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '24px 0 60px' }}>
      {/* SECCIÓN HERO — MANIFIESTO CORTO */}
      <section
        style={{
          background: 'linear-gradient(165deg, var(--surface), #14171D 80%)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: 'clamp(28px, 6vw, 48px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Glow sutil en el fondo */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(111, 168, 255, 0.12) 0%, rgba(20, 22, 26, 0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '18px' }}>
          {t('landing.badge')}
        </div>

        {/* LEMA PRINCIPAL — PROMINENTE */}
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(26px, 5.5vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.22,
            color: 'var(--text)',
            marginBottom: '28px',
            maxWidth: '22ch',
          }}
        >
          {t('manifesto.motto')}
        </h1>

        {/* CUERPO DEL MANIFIESTO CORTO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: 'clamp(14.5px, 2.4vw, 16px)',
            color: 'var(--text-body)',
            lineHeight: 1.68,
            maxWidth: '68ch',
            marginBottom: '32px',
          }}
        >
          <p>{t('manifesto.short.p1')}</p>
          <p
            className="serif"
            style={{
              fontSize: 'clamp(18px, 3vw, 21px)',
              fontWeight: 500,
              color: 'var(--accent)',
              fontStyle: 'italic',
            }}
          >
            {t('manifesto.short.p2')}
          </p>
          <p>{t('manifesto.short.p3')}</p>
          <p style={{ color: 'var(--text)', fontWeight: 500 }}>
            {t('manifesto.short.p4')}
          </p>
        </div>

        {/* LLAMADA A LA ACCIÓN FINAL DEL MANIFIESTO */}
        <div
          className="mono"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.04em',
            padding: '12px 16px',
            background: 'rgba(111, 168, 255, 0.08)',
            border: '1px solid rgba(111, 168, 255, 0.25)',
            borderRadius: '10px',
            display: 'inline-block',
            marginBottom: '32px',
          }}
        >
          {t('manifesto.short.cta')}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          {!isAuthenticated ? (
            <button
              onClick={onRegister}
              className="mono"
              style={{
                background: 'var(--accent)',
                color: '#0c1830',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(111, 168, 255, 0.25)',
                transition: 'transform 0.15s ease',
              }}
            >
              {t('landing.join_action')}
            </button>
          ) : null}

          <button
            onClick={onEnterQueue}
            className="mono"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontWeight: 500,
              fontSize: '13px',
              padding: '12px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {t('landing.enter_queue')}
          </button>

          <button
            onClick={onReadFullManifesto}
            className="mono"
            style={{
              background: 'transparent',
              color: 'var(--text-soft)',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '8px 12px',
            }}
          >
            {t('landing.read_full_manifesto')} →
          </button>
        </div>
      </section>

      {/* SECCIÓN: CÓMO FUNCIONA CURRENT */}
      <section style={{ marginTop: '48px' }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          {t('landing.how_it_works_badge')}
        </div>
        <h2
          className="serif"
          style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 500, marginBottom: '20px' }}
        >
          {t('landing.how_it_works_title')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Paso 1 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--refute)',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              01 · VELOCIDAD
            </span>
            <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', fontWeight: 500 }}>
              {t('landing.step_1_title')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.55 }}>
              {t('landing.step_1_desc')}
            </p>
          </div>

          {/* Paso 2 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--accent)',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              02 · DISCERNIMIENTO
            </span>
            <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', fontWeight: 500 }}>
              {t('landing.step_2_title')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.55 }}>
              {t('landing.step_2_desc')}
            </p>
          </div>

          {/* Paso 3 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--support)',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              03 · DIFUSIÓN PROPIA
            </span>
            <h3 className="serif" style={{ fontSize: '18px', color: 'var(--text)', fontWeight: 500 }}>
              {t('landing.step_3_title')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.55 }}>
              {t('landing.step_3_desc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
