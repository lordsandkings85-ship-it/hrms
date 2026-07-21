import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;           // user-chosen: light | dark | system
  theme: ResolvedTheme;      // resolved actual theme
  setMode: (m: ThemeMode) => void;
  toggle: () => void;        // simple binary toggle for topbar button
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  theme: 'light',
  setMode: () => {},
  toggle: () => {},
});

/** Apply resolved theme to <html> — no React involvement needed */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
}

/** Get system preference */
function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Resolve mode → actual theme */
function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) ?? 'system';
  });

  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(
    (localStorage.getItem('themeMode') as ThemeMode) ?? 'system'
  ));

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    const resolved = resolve(m);
    setTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem('themeMode', m);
  }, []);

  const toggle = useCallback(() => {
    setMode(theme === 'light' ? 'dark' : 'light');
  }, [theme, setMode]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system preference changes when mode === 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
