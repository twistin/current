import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'current_theme_preference';

/**
 * Obtiene el tema inicial respetando:
 * 1. Preferencia manual guardada en localStorage (si existe).
 * 2. Preferencia del sistema (prefers-color-scheme: light / dark).
 * 3. Por defecto oscuro.
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

/**
 * Hook para gestionar el tema en toda la aplicación.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const applyTheme = (newTheme: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    // Aplica el tema al cargar
    applyTheme(theme);

    // Escucha cambios del sistema si el usuario no tiene preferencia explícita en localStorage
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        const sysTheme: ThemeMode = e.matches ? 'light' : 'dark';
        setThemeState(sysTheme);
        applyTheme(sysTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      }
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  return { theme, toggleTheme, setTheme };
}
