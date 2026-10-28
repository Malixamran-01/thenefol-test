import { cardBadgesOf } from '../../../common/src/productBadges'

/** Strong badges use the theme's badge colours; the rest are light so a card never shouts twice. */
const FILLED = new Set(['bestseller', 'sale', 'limited'])
const MAX_ON_CARD = 2

/** Badges set in Admin → Products (details.cardBadges), stacked in the card image's top-left corner. */
export default function ProductCardBadges({ details, className = 'left-2 top-2' }: { details: unknown; className?: string }) {
  const badges = cardBadgesOf(details).slice(0, MAX_ON_CARD)
  if (!badges.length) return null
  return (
    <div className={`pointer-events-none absolute z-10 flex flex-col items-start gap-1 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.id}
          className="rounded px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide shadow-sm sm:text-xs"
          style={
            FILLED.has(b.id)
              ? { backgroundColor: 'var(--nf-badge-bg)', color: 'var(--nf-badge-text)' }
              : { backgroundColor: 'rgba(255, 255, 255, 0.92)', color: 'var(--nf-heading)' }
          }
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}

export { cardBadgesOf }
