/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', 'sans-serif'],
      },
      animation: {
        'sway': 'sway 3s ease-in-out infinite',
        'sway-slow': 'sway 5s ease-in-out infinite',
        'water-ripple': 'water-ripple 2.5s ease-in-out infinite',
        'float-up': 'float-up 2.8s ease-in-out infinite',
        'harvest-shimmer': 'harvest-shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        'grain-droop': 'grain-droop 4s ease-in-out infinite',
        'wave-scroll': 'wave-scroll 3s linear infinite',
      },
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(2.5deg)' },
          '75%': { transform: 'rotate(-2deg)' },
        },
        'water-ripple': {
          '0%, 100%': { opacity: '0.3', transform: 'scaleX(0.8) translateX(-10%)' },
          '50%': { opacity: '0.7', transform: 'scaleX(1.1) translateX(5%)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.6' },
          '50%': { transform: 'translateY(-40%) scale(1.1)', opacity: '0.4' },
          '100%': { transform: 'translateY(-90%) scale(0.8)', opacity: '0' },
        },
        'harvest-shimmer': {
          '0%, 100%': { opacity: '0.8', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.15) saturate(1.2)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'grain-droop': {
          '0%, 100%': { transform: 'rotate(0deg) translateY(0)' },
          '50%': { transform: 'rotate(3deg) translateY(1px)' },
        },
        'wave-scroll': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
}