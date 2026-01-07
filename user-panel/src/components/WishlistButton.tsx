import { useWishlist } from '../contexts/WishlistContext'
import { useAuth } from '../contexts/AuthContext'

type WishlistButtonProps = {
  productId: number
  className?: string
}

export default function WishlistButton({
  productId,
  className = '',
}: WishlistButtonProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { isAuthenticated } = useAuth()

  const wishlisted = isInWishlist(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      window.location.hash = '#/user/login'
      return
    }

    if (wishlisted) {
      removeFromWishlist(productId)
    } else {
      addToWishlist(productId)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-9 h-9 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 ${className}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      aria-label="Toggle wishlist"
    >
      <svg
        className={`w-4 h-4 ${
          wishlisted ? 'text-red-500 fill-red-500' : 'text-slate-700'
        }`}
        fill={wishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}