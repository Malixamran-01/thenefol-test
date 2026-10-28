/**
 * NEFöL text logo with the "Natural as the morning dew" tagline, as printed on the packaging.
 * Colours come from theme tokens (Admin → Theme customizer), so the logo follows the active theme.
 * Size it with a font-size class on `className`; the tagline scales with it.
 */
const COLORS: Record<string, [string, string]> = {
  header: ['var(--nf-logo)', 'var(--nf-logo-tagline)'],
  footer: ['var(--nf-footer-logo)', 'var(--nf-footer-logo-tagline)'],
  social: ['var(--nf-social-logo)', 'var(--nf-social-logo-tagline)'],
  inherit: ['currentColor', 'currentColor'],
}

export default function BrandWordmark({
  variant = 'header',
  tagline = true,
  className = '',
}: {
  /** header / footer / social use their theme tokens; inherit uses the surrounding text colour */
  variant?: 'header' | 'footer' | 'social' | 'inherit'
  tagline?: boolean
  className?: string
}) {
  const [color, taglineColor] = COLORS[variant]
  return (
    <span
      className={`inline-flex flex-col items-center leading-none ${className}`}
      // Brand lettering stays Montserrat whatever the theme's heading font is
      style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}
    >
      <span className="sr-only">NEFOL</span>
      <span aria-hidden="true" className="whitespace-nowrap font-medium" style={{ color, letterSpacing: '0.03em' }}>
        NEF<span style={{ letterSpacing: '0.01em' }}>ö</span>L
      </span>
      {tagline && (
        <span
          aria-hidden="true"
          className="mt-[0.22em] whitespace-nowrap font-bold uppercase"
          style={{ color: taglineColor, fontSize: '0.255em', letterSpacing: '0.02em' }}
        >
          Natural as the morning dew
        </span>
      )}
    </span>
  )
}
