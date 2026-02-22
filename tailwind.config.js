/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
    '!./node_modules/**',
    '!./server/**',
    '!./dist/**',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
