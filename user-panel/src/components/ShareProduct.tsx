import React, { useEffect, useState } from 'react'
import { Share2, Copy, Check, Facebook, Mail } from 'lucide-react'

interface ShareProductProps {
  productSlug: string
  productTitle: string
  productImage?: string
  productDescription?: string
  className?: string
}

export default function ShareProduct({ 
  productSlug, 
  productTitle, 
  productImage,
  productDescription,
  className = '' 
}: ShareProductProps) {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showIconOnly, setShowIconOnly] = useState(false)

  const productUrl = `${window.location.origin}/#/user/product/${productSlug}`
  const shareText = `Check out ${productTitle} on Nefol!`
  const absoluteImageUrl = productImage 
    ? (/^https?:\/\//i.test(productImage) 
        ? productImage 
        : `${window.location.origin}${productImage.startsWith('/') ? '' : '/'}${productImage}`)
    : undefined

  // Update Open Graph / Twitter meta tags so that sharing shows product image & title where supported
  useEffect(() => {
    try {
      const head = document.head
      if (!head) return

      const ensureMeta = (attr: 'name' | 'property', key: string, value: string) => {
        if (!value) return
        let el = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
        if (!el) {
          el = document.createElement('meta')
          el.setAttribute(attr, key)
          head.appendChild(el)
        }
        el.setAttribute('content', value)
      }

      const desc = productDescription || 'Discover premium skincare from Nefol.'

      // Open Graph tags
      ensureMeta('property', 'og:type', 'product')
      ensureMeta('property', 'og:title', productTitle)
      ensureMeta('property', 'og:description', desc)
      ensureMeta('property', 'og:url', productUrl)
      if (absoluteImageUrl) {
        ensureMeta('property', 'og:image', absoluteImageUrl)
      }

      // Twitter card tags
      ensureMeta('name', 'twitter:card', 'summary_large_image')
      ensureMeta('name', 'twitter:title', productTitle)
      ensureMeta('name', 'twitter:description', desc)
      if (absoluteImageUrl) {
        ensureMeta('name', 'twitter:image', absoluteImageUrl)
      }
    } catch (err) {
      // Fail silently – meta tags are a progressive enhancement
      console.warn('Failed to update social meta tags', err)
    }
  }, [productSlug, productTitle, productDescription, productUrl, absoluteImageUrl])

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
        onClick={() => {
          setShowShareMenu(!showShareMenu)
          setShowIconOnly(true)
        }}
        className={`flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
          showIconOnly ? 'p-2' : 'px-4 py-2 gap-2'
        }`}
        aria-label="Share product"
        style={{
          backgroundColor: 'rgb(75,151,201)',
          color: '#FFFFFF',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
      >
        <Share2 className="w-4 h-4" />
        {!showIconOnly && <span>Share</span>}
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
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.15-.198.297-.768.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.62-.921-2.221-.242-.58-.487-.502-.672-.512l-.573-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 3.505h-.004a8.348 8.348 0 01-4.258-1.157l-.305-.181-3.172.832.847-3.094-.199-.317a8.345 8.345 0 01-1.277-4.43c.001-4.602 3.745-8.346 8.35-8.346 2.233 0 4.332.87 5.912 2.449a8.303 8.303 0 012.444 5.898c-.003 4.602-3.747 8.345-8.348 8.345M20.52 3.48A11.815 11.815 0 0012.057 0C5.495 0 .16 5.335.157 11.897c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.631a11.88 11.88 0 005.71 1.455h.005c6.56 0 11.895-5.335 11.898-11.897A11.821 11.821 0 0020.52 3.48" />
                </svg>
              </span>
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleFacebookShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2]">
                <Facebook className="w-4 h-4 text-white" />
              </span>
              <span>Facebook</span>
            </button>
            <button
              onClick={handleEmailShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EA4335]">
                <Mail className="w-4 h-4 text-white" />
              </span>
              <span>Email</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              {copied ? (
                <>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
                    <Check className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200">
                    <Copy className="w-4 h-4 text-gray-700" />
                  </span>
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

