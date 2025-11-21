// Premium International Beauty Brand Style Utilities
// Use these constants across all pages for consistency

export const premiumStyles = {
  // Colors
  colors: {
    primary: '#1a1a1a',
    secondary: '#666',
    tertiary: '#999',
    background: '#ffffff',
    arcticBlue: {
      primary: '#7DD3D3',
      hover: '#5EC4C4',
      dark: '#4A9FAF',
      light: '#E0F5F5',
      lighter: '#F0F9F9',
      background: '#F4F9F9'
    }
  },
  
  // Typography
  typography: {
    heading: {
      fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
      fontWeight: 400,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const
    },
    body: {
      fontFamily: 'Lato, Inter, sans-serif',
      fontWeight: 300,
      letterSpacing: '0.02em'
    },
    button: {
      fontFamily: 'Lato, Inter, sans-serif',
      fontWeight: 300,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      fontSize: '0.75rem'
    }
  },
  
  // Spacing
  spacing: {
    section: 'py-12 sm:py-16 md:py-20',
    container: 'px-4 sm:px-6 lg:px-8',
    maxWidth: 'max-w-7xl'
  }
}

// Helper function to get premium heading styles
export const getHeadingStyle = (level: 1 | 2 | 3 | 4 = 1) => ({
  ...premiumStyles.typography.heading,
  color: premiumStyles.colors.primary,
  fontSize: level === 1 ? 'clamp(2rem, 5vw, 3.5rem)' :
           level === 2 ? 'clamp(1.75rem, 4vw, 2.75rem)' :
           level === 3 ? 'clamp(1.5rem, 3vw, 2rem)' :
           'clamp(1.25rem, 2.5vw, 1.5rem)'
})

// Helper function to get premium button styles
export const getButtonStyle = (variant: 'primary' | 'secondary' = 'primary') => ({
  ...premiumStyles.typography.button,
  backgroundColor: variant === 'primary' ? premiumStyles.colors.arcticBlue.primary : 'transparent',
  color: variant === 'primary' ? '#fff' : premiumStyles.colors.primary,
  border: variant === 'secondary' ? `1px solid ${premiumStyles.colors.primary}` : 'none',
  padding: '0.75rem 1.5rem',
  transition: 'all 0.3s ease'
})

