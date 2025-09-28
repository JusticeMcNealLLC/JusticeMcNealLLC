/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './pages/**/*.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui'],
        display: ['Poppins','ui-sans-serif','system-ui'],
      },
      colors: {
        brand:  { 50:'#eef5ff', 100:'#dfeaff', 600:'#2563eb', 700:'#1d4ed8' },
        accent: { 50:'#fff7e6', 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706' },
      },
      boxShadow: { soft: '0 20px 40px rgba(2,6,23,.08)' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
