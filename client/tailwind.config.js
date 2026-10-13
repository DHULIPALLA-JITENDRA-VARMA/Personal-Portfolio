/** @type {import('tailwindcss').Config} */
// Colours and fonts are not defined here: they point at the CSS variables in
// src/styles/theme.css, which is the single place to restyle the app.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: token('primary'),
        cream: token('cream'),
        surface: token('surface'),
        card: token('card'),
        success: token('success'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        serif: 'var(--font-serif)',
      },
      transitionTimingFunction: { expo: 'var(--ease-expo)' },
    },
  },
  plugins: [],
};
