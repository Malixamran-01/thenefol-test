import { useCart } from '../contexts/CartContext'
import { isOutOfStock, toCartProduct } from '../utils/stock'

/**
 * "Add to Cart" for product listing cards (Face / Body / Hair / Combos).
 * Shows a disabled "Out of stock" state using the same rule as the PDP, and passes the
 * product's id + stock to the cart so the cart's own stock guard applies too.
 */
export default function ListingAddToCartButton({ product, className = '' }: { product: any; className?: string }) {
  const { addItem } = useCart()
  const soldOut = isOutOfStock(product)

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (soldOut || !addItem) return
        addItem(toCartProduct(product)).catch(() => {
          /* CartContext surfaces its own error state */
        })
      }}
      className={`flex-1 px-6 py-3 text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase border rounded-xl min-h-[44px] ${
        soldOut
          ? 'cursor-not-allowed border-transparent bg-[color:var(--nf-button-disabled-bg)] text-[color:var(--nf-button-disabled-text)]'
          : 'border-transparent bg-[color:var(--nf-button-primary-bg)] text-[color:var(--nf-button-primary-text)] hover:bg-[color:var(--nf-button-primary-hover)]'
      } ${className}`}
      style={{ letterSpacing: '0.15em' }}
    >
      {soldOut ? 'Out of stock' : 'Add to Cart'}
    </button>
  )
}
