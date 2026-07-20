/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Modern Minimalist Palette (Zinc/Stripe inspired)
        ink: '#09090B',       // Zinc 950 - Pure dark for text
        ink2: '#18181B',      // Zinc 900 - Slightly softer text
        paper: '#FFFFFF',     // Pure white background
        paperDim: '#FAFAFA',  // Zinc 50 - Very subtle off-white for cards/sections
        ledger: '#000000',    // Premium Black for brand actions (Vercel/Linear style)
        ledgerDark: '#09090B',
        ledgerLight: '#F4F4F5',
        rust: '#E11D48',      // Modern Rose for destructive actions
        rustLight: '#FFF1F2',
        line: '#E4E4E7',      // Zinc 200 - Crisp, light borders
        muted: '#71717A',     // Zinc 500 - Secondary text
        success: { DEFAULT: '#10B981', dark: '#047857', light: '#ECFDF5' }, // Emerald
        warning: { DEFAULT: '#F59E0B', dark: '#B45309', light: '#FFFBEB' }, // Amber
        danger: { DEFAULT: '#EF4444', dark: '#B91C1C', light: '#FEF2F2' },  // Red
        info: { DEFAULT: '#3B82F6', dark: '#1D4ED8', light: '#EFF6FF' },    // Blue
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'], // Linear uses Inter for everything
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        // Stripe/Vercel diffused shadows
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        raised: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.025)',
        popover: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
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
