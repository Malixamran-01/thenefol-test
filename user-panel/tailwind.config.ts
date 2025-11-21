import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          spaceCadet: '#102E4A',
          black: '#000000',
          silverLakeBlue: '#5B88B2',
          oldLace: '#FBF9E4',
          cultured: '#F5F5F5'
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



