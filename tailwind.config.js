/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['General Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'heading': '32px',
        'title': '20px',
        'body': '16px',
      },
    },
  },
  plugins: [],
};
