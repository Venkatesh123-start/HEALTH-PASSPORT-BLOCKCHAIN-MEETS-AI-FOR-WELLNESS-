/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#667eea',
          600: '#5a6fd6',
          700: '#4c5bc9',
          800: '#3e4bb5',
          900: '#1a1c2c',
        },
        secondary: {
          500: '#11998e',
          600: '#0e847a',
        },
        accent: {
          500: '#fc466b',
          600: '#e33d5f',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 40px rgba(102, 126, 234, 0.12)',
        'hover': '0 20px 60px rgba(102, 126, 234, 0.2)',
        'button': '0 4px 15px rgba(102, 126, 234, 0.4)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1c2c 0%, #2d3561 100%)',
      },
    },
  },
  plugins: [],
}