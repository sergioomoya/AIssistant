/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta principal - Elegante y profesional
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8ddff',
          300: '#7ac2ff',
          400: '#36a3ff',
          500: '#0c84ff',
          600: '#0066e0',
          700: '#0052b5',
          800: '#004494',
          900: '#003a7a',
          950: '#002451',
        },
        // Acento - Coral vibrante
        accent: {
          50: '#fff5f2',
          100: '#ffe9e3',
          200: '#ffd4c7',
          300: '#ffb39e',
          400: '#ff8766',
          500: '#ff5e38',
          600: '#ed3f18',
          700: '#c72f0f',
          800: '#a42a12',
          900: '#882815',
          950: '#4a1106',
        },
        // Superficie oscura - Estilo editor de código
        surface: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c5c6cb',
          300: '#a0a2aa',
          400: '#7c7f89',
          500: '#61646e',
          600: '#4d4f58',
          700: '#3f4048',
          800: '#2d2e34',
          900: '#1e1f23',
          950: '#121316',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(12, 132, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(12, 132, 255, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

