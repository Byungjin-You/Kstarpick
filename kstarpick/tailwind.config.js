/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          DEFAULT: '#f43f5e',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'reverse-spin': 'reverse-spin 3s linear infinite',
        'float-1': 'float1 3s ease-in-out infinite',
        'float-2': 'float2 4s ease-in-out infinite',
        'float-3': 'float3 3.5s ease-in-out infinite',
        'text-reveal': 'reveal 0.5s ease-in-out forwards',
        'dot-1': 'dot 1.5s infinite 0.2s',
        'dot-2': 'dot 1.5s infinite 0.4s',
        'dot-3': 'dot 1.5s infinite 0.6s',
        'expand-line': 'expandLine 2s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fadeIn': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        'reverse-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        'float1': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-10px) scale(1.1)' },
        },
        'float2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(5px, -5px) scale(1.2)' },
        },
        'float3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-7px, -2px) scale(1.1)' },
        },
        'reveal': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'dot': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '50%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        'expandLine': {
          '0%, 100%': { width: '0%', left: '50%' },
          '50%': { width: '100%', left: '0%' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} 