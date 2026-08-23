/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f43f5e',
        'primary-dark': '#e11d48',
        secondary: '#fcd34d',
        background: '#fdfbf7',
        surface: '#ffffff',
        text: '#334155',
        'text-light': '#64748b',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
