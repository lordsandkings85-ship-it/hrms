/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181B',        // near-black, slightly warm — primary text/sidebar
        paper: '#F6F5F1',      // warm off-white — canvas background (not the AI-cliche cream)
        ledger: '#1F6F5C',     // deep teal-green — the "money/ledger" accent, ties to payroll domain
        ledgerDark: '#154F42',
        rust: '#B5522E',       // warm rust for warnings/overdue
        line: '#E4E1D8',       // hairline dividers
        muted: '#6B6A63',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
