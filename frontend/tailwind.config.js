/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181B',
        ink2: '#1B2226',
        paper: '#F6F5F1',
        paperDim: '#EFEDE5',
        ledger: '#1F6F5C',
        ledgerDark: '#154F42',
        ledgerLight: '#E8F2EF',
        rust: '#B5522E',
        rustLight: '#FBEAE3',
        line: '#E4E1D8',
        muted: '#6B6A63',
        success: { DEFAULT: '#10B981', dark: '#047857', light: '#E5F8F1' },
        warning: { DEFAULT: '#F59E0B', dark: '#B45309', light: '#FEF3E2' },
        danger: { DEFAULT: '#EF4444', dark: '#B91C1C', light: '#FDEAEA' },
        info: { DEFAULT: '#3B82F6', dark: '#1D4ED8', light: '#EAF1FE' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,24,27,0.04), 0 1px 8px rgba(18,24,27,0.03)',
        raised: '0 4px 14px rgba(18,24,27,0.08), 0 1px 3px rgba(18,24,27,0.06)',
        popover: '0 12px 32px rgba(18,24,27,0.14), 0 2px 6px rgba(18,24,27,0.08)',
      },
      borderRadius: { xl2: '1rem' },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        toastIn: { from: { opacity: 0, transform: 'translateX(16px) scale(0.97)' }, to: { opacity: 1, transform: 'translateX(0) scale(1)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer: { from: { backgroundPosition: '-400px 0' }, to: { backgroundPosition: '400px 0' } },
      },
      animation: {
        fadeIn: 'fadeIn .18s ease-out',
        slideUp: 'slideUp .22s cubic-bezier(0.16,1,0.3,1)',
        slideDown: 'slideDown .18s ease-out',
        toastIn: 'toastIn .25s cubic-bezier(0.16,1,0.3,1)',
        scaleIn: 'scaleIn .16s cubic-bezier(0.16,1,0.3,1)',
        shimmer: 'shimmer 1.4s infinite linear',
      },
    },
  },
  plugins: [],
};
