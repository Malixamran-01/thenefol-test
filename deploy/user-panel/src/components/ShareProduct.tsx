import React, { useState } from 'react'
import { Share2, Copy, Check, Facebook, Mail } from 'lucide-react'

interface ShareProductProps {
  productSlug: string
  productTitle: string
  productImage?: string
  className?: string
}

export default function ShareProduct({ 
  productSlug, 
  productTitle, 
  productImage,
  className = '' 
}: ShareProductProps) {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const productUrl = `${window.location.origin}/#/user/product/${productSlug}`
  const shareText = `Check out ${productTitle} on Nefol!`

  const handleCopyLink = async () => {
    try {
      // Try modern clipboard API first (requires HTTPS or localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(productUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return
      }
      
      // Fallback for browsers/environments without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = productUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } else {
          throw new Error('execCommand copy failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
      // Show user-friendly error message
      alert('Unable to copy link. Please copy manually: ' + productUrl)
    }
  }

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${productTitle}`)
    const body = encodeURIComponent(`${shareText}\n\n${productUrl}`)
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
    window.location.href = mailtoUrl
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        aria-label="Share product"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm font-medium">Share</span>
      </button>

      {showShareMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowShareMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
            <button
              onClick={handleWhatsAppShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <span className="text-xl">💬</span>
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleFacebookShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </button>
            <button
              onClick={handleEmailShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

