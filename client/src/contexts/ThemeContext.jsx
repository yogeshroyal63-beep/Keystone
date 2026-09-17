import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'keystone-theme';
const ThemeContext = createContext(null);

function readInitialTheme() {
  if (typeof window === 'undefined') return 'dark';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  // No stored choice yet, so follow the operating system.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Keep following the system until the person makes an explicit choice.
  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return undefined;

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (event) => setTheme(event.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider.');
  }
  return context;
}
