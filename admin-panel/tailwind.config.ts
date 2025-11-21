import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#102E4A',
          primarySoft: '#274F73',
          accent: '#5B88B2',
          accentMuted: '#3E6D97',
          accentSoft: '#E0ECF8',
          background: '#F4F5F9',
          surface: '#FFFFFF',
          surfaceMuted: '#F0F2F8',
          border: '#D6DEEB',
          highlight: '#E8EEF7',
          text: '#10131A'
        },
        blue: {
          50: '#F2F6FA',
          100: '#E8EEF7',
          200: '#CFDCE9',
          300: '#B3C8DE',
          400: '#94AECF',
          500: '#7A9DC0',
          600: '#5B88B2',
          700: '#3E6D97',
          800: '#274F73',
          900: '#102E4A',
          950: '#0B1F30'
        }
      },
      fontFamily: {
        serif: ['Constantia', 'Cormorant Garamond', 'ui-serif', 'serif'],
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
} satisfies Config



