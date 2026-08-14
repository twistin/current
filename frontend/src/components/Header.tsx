import React from 'react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  memberPseudonym?: string | null;
  onRegisterClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ memberPseudonym, onRegisterClick }) => {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language || 'es';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <header className="topbar">
      <div className="wrap">
        <div className="brand">
          Current<span className="dot">.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Selector de idioma ES / EN */}
          <div
            className="mono"
            style={{
              display: 'flex',
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '2px',
              fontSize: '10px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => toggleLanguage('es')}
              style={{
                background: currentLang.startsWith('es') ? 'var(--accent)' : 'transparent',
                color: currentLang.startsWith('es') ? '#0c1830' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ES
            </button>
            <button
              onClick={() => toggleLanguage('en')}
              style={{
                background: currentLang.startsWith('en') ? 'var(--accent)' : 'transparent',
                color: currentLang.startsWith('en') ? '#0c1830' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              EN
            </button>
          </div>

          {memberPseudonym ? (
            <div
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--text-soft)',
                maxWidth: '110px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 1,
              }}
            >
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>@{memberPseudonym}</span>
            </div>
          ) : (
            <button
              onClick={onRegisterClick}
              className="mono"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--accent)',
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t('header.generate_pseudonym')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
