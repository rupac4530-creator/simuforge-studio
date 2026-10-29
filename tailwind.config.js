/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sim-bg': '#0a0e17',
        'sim-panel': '#111827',
        'sim-border': '#1e293b',
        'sim-accent': '#3b82f6',
        'sim-accent2': '#06b6d4',
        'sim-success': '#10b981',
        'sim-warning': '#f59e0b',
        'sim-danger': '#ef4444',
        'sim-text': '#e2e8f0',
        'sim-text-dim': '#64748b',
      },
    },
  },
  plugins: [],
};
