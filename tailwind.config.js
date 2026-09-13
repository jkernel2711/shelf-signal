/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f3efe6',
        panel: '#fbf8f1',
        ink: '#161513',
        mute: '#6a6458',
        line: '#e4dccb',
        forest: {
          DEFAULT: '#1f4a38',
          dim: '#2f6b4f',
        },
        amber: '#b7791f',
        crit: '#a32d21',
        mist: '#e8e2d4',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sheet: '0 1px 0 rgba(22,21,19,0.04), 0 18px 40px -24px rgba(22,21,19,0.18)',
      },
    },
  },
  plugins: [],
};
