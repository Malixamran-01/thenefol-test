import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Core screen & surface colors
          screenBg: '#358D9E', // Primary screen background
          navBg: '#0E2730', // Navigation / app bar background
          cardBg: '#FFFFFF',

          // Text colors
          textOnNav: '#FFFFFF',
          textSecondaryOnTeal: '#E8F5F7',
          textBody: '#0E2730',

          // Inputs
          inputBorder: '#DCE5E7',

          // Buttons
          primaryButton: '#0E2730',
          primaryButtonHover: '#1A4550',
          secondaryButtonBg: 'transparent',
          secondaryButtonBorder: '#0E2730',
          secondaryButtonHoverBg: 'rgba(14,39,48,0.1)'
        }
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        // Make the default sans body text use Inter
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
} satisfies Config



