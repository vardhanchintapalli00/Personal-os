import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: v('card'),
        muted: v('muted'),
        'muted-foreground': v('muted-foreground'),
        border: v('border'),
        success: v('success'), // green: healthy, savings, done
        danger: v('danger'), // red: overdue, junk, overspend
        study: v('study'), // blue: productivity
        movie: v('movie'), // purple: entertainment
        fit: v('fit'), // orange: fitness & energy
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      opacity: { 8: '0.08', 12: '0.12' },
      borderRadius: { '2xl': '1.1rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        pop: '0 20px 50px -12px rgb(15 23 42 / 0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        'slide-up': 'slide-up .35s ease-out both',
        pop: 'pop .2s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
