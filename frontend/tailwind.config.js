/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (map to CSS variables) ──────────────
        // These automatically switch with the theme.
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary:  'var(--bg-tertiary)',
        },
        surface: {
          DEFAULT:  'var(--surface)',
          elevated: 'var(--surface-elevated)',
          hover:    'var(--surface-hover)',
          active:   'var(--surface-active)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverse:   'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
          strong:  'var(--border-strong)',
          focus:   'var(--border-focus)',
        },
        sidebar: {
          bg:     'var(--sidebar-bg)',
          border: 'var(--sidebar-border)',
          text:   'var(--sidebar-text)',
          active: 'var(--sidebar-text-active)',
          item:   'var(--sidebar-item-active)',
          hover:  'var(--sidebar-item-hover)',
        },
        action: {
          primary: 'var(--action-primary)',
          hover:   'var(--action-primary-hover)',
          text:    'var(--action-primary-text)',
        },
        status: {
          success:        'var(--success)',
          'success-bg':   'var(--success-bg)',
          'success-text': 'var(--success-text)',
          warning:        'var(--warning)',
          'warning-bg':   'var(--warning-bg)',
          'warning-text': 'var(--warning-text)',
          danger:         'var(--danger)',
          'danger-bg':    'var(--danger-bg)',
          'danger-text':  'var(--danger-text)',
          info:           'var(--info)',
          'info-bg':      'var(--info-bg)',
          'info-text':    'var(--info-text)',
        },

        // ── Legacy palette colors (kept for compatibility) ──────
        ink:      '#09090B',
        ink2:     '#18181B',
        paper:    '#FFFFFF',
        paperDim: '#FAFAFA',
        ledger:   '#000000',
        ledgerDark: '#09090B',
        ledgerLight: '#F4F4F5',
        line:     '#E4E4E7',
        muted:    '#71717A',
        success: { DEFAULT: '#10B981', dark: '#047857', light: '#ECFDF5' },
        warning: { DEFAULT: '#F59E0B', dark: '#B45309', light: '#FFFBEB' },
        danger:  { DEFAULT: '#EF4444', dark: '#B91C1C', light: '#FEF2F2' },
        info:    { DEFAULT: '#3B82F6', dark: '#1D4ED8', light: '#EFF6FF' },
      },

      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },

      boxShadow: {
        card:    'var(--shadow-card)',
        raised:  'var(--shadow-raised)',
        popover: 'var(--shadow-popover)',
        modal:   'var(--shadow-modal)',
      },

      borderRadius: { xl2: '1rem', xl3: '1.25rem' },

      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:   { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        toastIn:     { from: { opacity: '0', transform: 'translateX(16px) scale(0.97)' }, to: { opacity: '1', transform: 'translateX(0) scale(1)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer:     { from: { backgroundPosition: '-400px 0' }, to: { backgroundPosition: '400px 0' } },
      },

      animation: {
        fadeIn:      'fadeIn .18s ease-out',
        slideUp:     'slideUp .22s cubic-bezier(0.16,1,0.3,1)',
        slideDown:   'slideDown .18s ease-out',
        toastIn:     'toastIn .25s cubic-bezier(0.16,1,0.3,1)',
        scaleIn:     'scaleIn .16s cubic-bezier(0.16,1,0.3,1)',
        slideInLeft: 'slideInLeft .20s ease-out',
        shimmer:     'shimmer 1.4s infinite linear',
      },
    },
  },
  plugins: [],
};
