/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#FFB020',
          soft: '#FFE494',
          deep: '#E69500',
          hover: '#F5A30A'
        },
        ink: {
          DEFAULT: '#19150E',
          soft: '#544D42',
          muted: '#8A8275',
          light: '#BAAE9E'
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm: '#FAF7F2',
          card: '#FFFFFF'
        },
        page: '#F5F1EA',
        success: {
          DEFAULT: '#0E7D4D',
          tint: '#E4F5EB'
        },
        warning: {
          DEFAULT: '#C25700',
          tint: '#FFF1E5'
        },
        danger: {
          DEFAULT: '#D92D20',
          tint: '#FEE4E2',
          soft: '#F04438'
        }
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'sans-serif']
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(25, 21, 14, 0.08), 0 1px 4px -1px rgba(25, 21, 14, 0.04)',
        'raised': '0 8px 24px -4px rgba(25, 21, 14, 0.12), 0 2px 6px -1px rgba(25, 21, 14, 0.06)',
        'modal': '0 20px 40px -8px rgba(25, 21, 14, 0.25)'
      }
    },
  },
  plugins: [],
};
