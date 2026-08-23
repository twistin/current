import React from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { ThemeMode } from '../theme';

interface HeaderProps {
  memberPseudonym?: string | null;
  onRegisterClick?: () => void;
  onLogout?: () => void;
  currentView?: 'landing' | 'queue' | 'manifesto' | 'room' | 'profile' | 'radar' | 'actor';
  onNavigate?: (view: 'landing' | 'queue' | 'manifesto' | 'radar') => void;
  onSelectMember?: (pseudonym: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  memberPseudonym,
  onRegisterClick,
  onLogout,
  currentView = 'queue',
  onNavigate,
  onSelectMember,
  theme,
  onToggleTheme,
}) => {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language || 'es';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <header className="topbar">
      <div className="wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Logo / Brand Adaptativo */}
          <Logo
            variant="horizontal"
            size="md"
            onClick={() => onNavigate?.('landing')}
            className="brand"
          />

          {/* Navegación Principal */}
          {onNavigate && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => onNavigate('radar')}
                className="mono"
                style={{
                  background: currentView === 'radar' || currentView === 'actor' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: currentView === 'radar' || currentView === 'actor' ? '#60a5fa' : 'var(--text-soft)',
                  border: currentView === 'radar' || currentView === 'actor' ? '1px solid #3b82f6' : '1px solid transparent',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'radar' || currentView === 'actor' ? 700 : 400,
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📡</span> Radar de Actores
              </button>

              <button
                onClick={() => onNavigate('queue')}
                className="mono"
                style={{
                  background: currentView === 'queue' || currentView === 'room' ? 'var(--surface-3)' : 'transparent',
                  color: currentView === 'queue' || currentView === 'room' ? 'var(--text)' : 'var(--text-soft)',
                  border: currentView === 'queue' || currentView === 'room' ? '1px solid var(--border)' : '1px solid transparent',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'queue' || currentView === 'room' ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {t('header.nav_queue')}
              </button>

              <button
                onClick={() => onNavigate('manifesto')}
                className="mono"
                style={{
                  background: currentView === 'manifesto' ? 'var(--surface-3)' : 'transparent',
                  color: currentView === 'manifesto' ? 'var(--accent)' : 'var(--text-soft)',
                  border: currentView === 'manifesto' ? '1px solid var(--border)' : '1px solid transparent',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'manifesto' ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {t('header.nav_manifesto')}
              </button>
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Indicador de Pulso de Red en Vivo */}
          <div
            className="mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 9px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title="Nodos ciudadanos verificadores activos patrullando en tiempo real"
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }} />
            <span>24 ONLINE</span>
          </div>

          {/* Interruptor Modo Claro / Oscuro */}
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? t('header.theme_light') : t('header.theme_dark')}
            title={theme === 'dark' ? t('header.theme_light') : t('header.theme_dark')}
            className="mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '28px',
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
            }}
          >
            {theme === 'dark' ? (
              // Icono Sol (para pasar a claro)
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Icono Luna (para pasar a oscuro)
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

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
                color: currentLang.startsWith('es') ? 'var(--accent-text)' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              ES
            </button>
            <button
              onClick={() => toggleLanguage('en')}
              style={{
                background: currentLang.startsWith('en') ? 'var(--accent)' : 'transparent',
                color: currentLang.startsWith('en') ? 'var(--accent-text)' : 'var(--text-soft)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              EN
            </button>
          </div>

          {memberPseudonym ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                onClick={() => onSelectMember?.(memberPseudonym)}
                title={t('header.my_profile_tooltip', { defaultValue: 'Ver mi perfil' })}
                className="mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--text)',
                  background: currentView === 'profile' ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: currentView === 'profile' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>@{memberPseudonym}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title={t('header.logout')}
                  className="mono"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ✕
                </button>
              )}
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
