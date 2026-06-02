/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

