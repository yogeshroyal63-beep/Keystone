/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every token resolves to a CSS variable so that flipping
      // data-theme on <html> re-themes the whole app. Hard-coding hex
      // values here was why light mode only changed the background.
      colors: {
        paper: 'var(--bg)',
        panel: 'var(--panel-strong)',
        panelSoft: 'var(--panel-alt)',
        chip: 'var(--chip)',
        ink: 'var(--text)',
        muted: 'var(--text-soft)',
        blueprint: 'var(--accent)',
        blueprintDeep: 'var(--accent-strong)',
        rust: 'var(--danger)',
        rustSoft: 'var(--danger-soft)',
        hair: 'var(--line)',
        hairStrong: 'var(--line-strong)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        soft: 'var(--shadow)',
        lift: '0 1px 0 var(--line)',
      },
    },
  },
  plugins: [],
};
