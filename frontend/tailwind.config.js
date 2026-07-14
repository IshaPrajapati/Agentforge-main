/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f4eb',
          100: '#e4e7dd',
          500: '#c0c5b5',
          600: '#f2f4eb',
          700: '#e4e7dd',
          900: '#000000',
        },
        gray: {
          950: '#050505',
          900: '#0a0a0a',
          800: '#141414',
          700: '#1a1a1a',
          600: '#262626',
          500: '#404040',
          400: '#737373',
          300: '#a3a3a3',
          200: '#d4d4d4',
          100: '#f5f5f5',
          50: '#fafafa',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
