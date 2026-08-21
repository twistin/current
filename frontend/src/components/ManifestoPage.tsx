import React from 'react';
import { useTranslation } from 'react-i18next';

interface ManifestoPageProps {
  onBackToQueue: () => void;
  onRegister: () => void;
  isAuthenticated: boolean;
}

export const ManifestoPage: React.FC<ManifestoPageProps> = ({
  onBackToQueue,
  onRegister,
  isAuthenticated,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '740px', margin: '0 auto' }}>
      {/* Botón de regreso */}
      <button
        onClick={onBackToQueue}
        className="mono"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← {t('verification.back_to_queue')}
      </button>

      {/* CABECERA DEL MANIFIESTO */}
      <div style={{ marginBottom: '36px' }}>
        <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '14px' }}>
          {t('manifesto.eyebrow')}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(28px, 6vw, 42px)',
            fontWeight: 500,
            lineHeight: 1.2,
            color: 'var(--text)',
            marginBottom: '24px',
          }}
        >
          {t('manifesto.long.title')}
        </h1>
        <div
          style={{
            width: '48px',
            height: '2px',
            background: 'var(--accent)',
            marginBottom: '28px',
          }}
        />
      </div>

      {/* INTRODUCCIÓN */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          fontSize: '16px',
          lineHeight: 1.7,
          color: 'var(--text-body)',
          marginBottom: '32px',
        }}
      >
        <p>{t('manifesto.long.intro_p1')}</p>
        <p>{t('manifesto.long.intro_p2')}</p>
      </div>

      {/* CALLOUT: SECAR EL PANTANO */}
      <div
        style={{
          background: 'linear-gradient(145deg, var(--surface-2), var(--surface))',
          borderLeft: '4px solid var(--accent)',
          borderTop: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderRadius: '0 16px 16px 0',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <p
          className="serif"
          style={{
            fontSize: '22px',
            fontStyle: 'italic',
            color: 'var(--text)',
            fontWeight: 500,
          }}
        >
          {t('manifesto.long.riverbed_highlight')}
        </p>
      </div>

      {/* IDENTIDAD CURRENT */}
      <div
        style={{
          fontSize: '16.5px',
          lineHeight: 1.7,
          color: 'var(--text)',
          fontWeight: 500,
          marginBottom: '48px',
        }}
      >
        <p>{t('manifesto.long.identity_highlight')}</p>
      </div>

      {/* SECCIÓN: LO QUE CREEMOS */}
      <section style={{ marginBottom: '52px' }}>
        <h2
          className="serif"
          style={{
            fontSize: '26px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '24px',
            borderBottom: '1px solid var(--border-soft)',
            paddingBottom: '12px',
          }}
        >
          {t('manifesto.long.section_beliefs')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Creencia 1 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3
              className="serif"
              style={{ fontSize: '19px', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}
            >
              1. {t('manifesto.long.belief_1_title')}
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-body)', lineHeight: 1.65 }}>
              {t('manifesto.long.belief_1_body')}
            </p>
          </div>

          {/* Creencia 2 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3
              className="serif"
              style={{ fontSize: '19px', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}
            >
              2. {t('manifesto.long.belief_2_title')}
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-body)', lineHeight: 1.65 }}>
              {t('manifesto.long.belief_2_body')}
            </p>
          </div>

          {/* Creencia 3 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3
              className="serif"
              style={{ fontSize: '19px', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}
            >
              3. {t('manifesto.long.belief_3_title')}
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-body)', lineHeight: 1.65 }}>
              {t('manifesto.long.belief_3_body')}
            </p>
          </div>

          {/* Creencia 4 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3
              className="serif"
              style={{ fontSize: '19px', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}
            >
              4. {t('manifesto.long.belief_4_title')}
            </h3>
            <p style={{ fontSize: '14.5px', color: 'var(--text-body)', lineHeight: 1.65 }}>
              {t('manifesto.long.belief_4_body')}
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN: LO QUE HACEMOS */}
      <section style={{ marginBottom: '52px' }}>
        <h2
          className="serif"
          style={{
            fontSize: '26px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-soft)',
            paddingBottom: '12px',
          }}
        >
          {t('manifesto.long.section_actions')}
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: '15.5px',
            lineHeight: 1.7,
            color: 'var(--text-body)',
          }}
        >
          <p>{t('manifesto.long.action_body_1')}</p>
          <p>{t('manifesto.long.action_body_2')}</p>
        </div>
      </section>

      {/* SECCIÓN: POR QUÉ IMPORTA */}
      <section style={{ marginBottom: '48px' }}>
        <h2
          className="serif"
          style={{
            fontSize: '26px',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-soft)',
            paddingBottom: '12px',
          }}
        >
          {t('manifesto.long.section_matters')}
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: '15.5px',
            lineHeight: 1.7,
            color: 'var(--text-body)',
          }}
        >
          <p>{t('manifesto.long.matters_body_1')}</p>
          <p>{t('manifesto.long.matters_body_2')}</p>
        </div>
      </section>

      {/* CIERRE Y LLAMADA A LA ACCIÓN FINAL */}
      <div
        style={{
          background: 'linear-gradient(160deg, var(--surface-2), var(--bg))',
          border: '1px solid var(--accent)',
          borderRadius: '20px',
          padding: '36px',
          textAlign: 'center',
          marginTop: '40px',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h3
          className="serif"
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '20px',
            lineHeight: 1.3,
          }}
        >
          {t('manifesto.long.cta_final')}
        </h3>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isAuthenticated ? (
            <button
              onClick={onRegister}
              className="mono"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {t('landing.join_action')}
            </button>
          ) : null}

          <button
            onClick={onBackToQueue}
            className="mono"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontWeight: 500,
              fontSize: '13px',
              padding: '12px 22px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {t('landing.enter_queue')}
          </button>
        </div>
      </div>
    </div>
  );
};
