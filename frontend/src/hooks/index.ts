/**
 * Custom React Hooks — Barrel Export
 * Add domain-specific hooks here as they are created.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
export { useAuthStore } from '../store/useAuthStore';

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * useDebounce — Returns a debounced version of the value.
 * Useful for search inputs to avoid excessive API calls.
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useLocalStorage — Synced state with localStorage.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('useLocalStorage write error:', error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * usePageTitle — Sets the browser tab title.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Workora HRMS` : 'Workora HRMS';
    return () => { document.title = prev; };
  }, [title]);
}
