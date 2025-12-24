import React, { useEffect, useState } from 'react'
import { Share2, Copy, Check, Facebook, Mail, Instagram } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

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
  const [showInstagramOptions, setShowInstagramOptions] = useState(false)

  const productUrl = `${window.location.origin}/#/user/product/${productSlug}`
  const shareText = `Check out ${productTitle} on NEFOL®! ${productUrl}`
  
  // Ensure image URL is absolute and accessible
  const getAbsoluteImageUrl = (img?: string): string | undefined => {
    if (!img || !img.trim()) return undefined
    
    // If already absolute URL, return as is
    if (/^https?:\/\//i.test(img)) return img
    
    try {
      // Use getApiBase() to get the correct base URL (it returns base without /api)
      const baseUrl = getApiBase()
      
      // Construct full absolute URL
      if (img.startsWith('/')) {
        return `${baseUrl}${img}`
      } else {
        return `${baseUrl}/${img}`
      }
    } catch (e) {
      console.warn('Failed to construct absolute image URL:', e)
      // Fallback to window.location.origin
      return img.startsWith('/') ? `${window.location.origin}${img}` : `${window.location.origin}/${img}`
    }
  }
  
  const absoluteImageUrl = getAbsoluteImageUrl(productImage)
  
  // Log for debugging
  useEffect(() => {
    if (absoluteImageUrl) {
      console.log('📸 Share image URL:', absoluteImageUrl)
    }
  }, [absoluteImageUrl])

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

      const desc = productDescription || 'Discover premium skincare from NEFOL®.'

      // Open Graph tags
      ensureMeta('property', 'og:type', 'product')
      ensureMeta('property', 'og:title', productTitle)
      ensureMeta('property', 'og:description', desc)
      ensureMeta('property', 'og:url', productUrl)
      if (absoluteImageUrl) {
        ensureMeta('property', 'og:image', absoluteImageUrl)
        ensureMeta('property', 'og:image:width', '1200')
        ensureMeta('property', 'og:image:height', '630')
        ensureMeta('property', 'og:image:type', 'image/jpeg')
      }

      // Twitter card tags
      ensureMeta('name', 'twitter:card', 'summary_large_image')
      ensureMeta('name', 'twitter:title', productTitle)
      ensureMeta('name', 'twitter:description', desc)
      if (absoluteImageUrl) {
        ensureMeta('name', 'twitter:image', absoluteImageUrl)
      }
      
      // Additional meta tags for better compatibility
      ensureMeta('property', 'og:site_name', 'NEFOL®')
      ensureMeta('name', 'description', desc)
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

  // Native share with image file
  const handleNativeShare = async () => {
    if (!absoluteImageUrl) {
      // Fallback to text-only share if no image
      if (navigator.share) {
        try {
          await navigator.share({
            title: productTitle,
            text: shareText,
            url: productUrl
          })
          setShowShareMenu(false)
          return
        } catch (err) {
          console.error('Error sharing:', err)
        }
      }
      return
    }

    try {
      // Fetch the image as a blob
      const response = await fetch(absoluteImageUrl)
      if (!response.ok) throw new Error('Failed to fetch image')
      
      const blob = await response.blob()
      const file = new File([blob], `${productSlug}.jpg`, { type: blob.type || 'image/jpeg' })

      // Use Web Share API with files (if supported)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: productTitle,
          text: shareText,
          url: productUrl,
          files: [file]
        })
        setShowShareMenu(false)
      } else {
        // Fallback: download image and share link
        const link = document.createElement('a')
        link.href = URL.createObjectURL(file)
        link.download = `${productSlug}.jpg`
        link.click()
        // Also copy link to clipboard
        await handleCopyLink()
        alert('Image downloaded! Link copied to clipboard. You can now share the image and link.')
      }
    } catch (error) {
      console.error('Error sharing image:', error)
      // Fallback to text share
      if (navigator.share) {
        try {
          await navigator.share({
            title: productTitle,
            text: `${shareText}\n\nImage: ${absoluteImageUrl}`,
            url: productUrl
          })
          setShowShareMenu(false)
        } catch (err) {
          console.error('Error sharing text:', err)
        }
      }
    }
  }

  const handleWhatsAppShare = () => {
    // WhatsApp will use Open Graph meta tags for image preview
    // Include image URL in share text for better compatibility
    const shareMessage = absoluteImageUrl 
      ? `${shareText}\n\n${absoluteImageUrl}`
      : shareText
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleFacebookShare = () => {
    // Facebook supports Open Graph tags for image preview
    // The image will be automatically fetched from og:image meta tag
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${productTitle} on NEFOL®!`)
    const emailBody = `${shareText}\n\n${productUrl}${absoluteImageUrl ? `\n\nView Product Image: ${absoluteImageUrl}` : ''}${productDescription ? `\n\n${productDescription}` : ''}`
    const body = encodeURIComponent(emailBody)
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
    // Open email client with draft
    window.location.href = mailtoUrl
  }

  const copyShareContent = async () => {
    const shareContent = absoluteImageUrl 
      ? `${shareText}\n\n${productUrl}\n\nImage: ${absoluteImageUrl}`
      : `${shareText}\n\n${productUrl}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareContent)
    } else {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = shareContent
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const handleInstagramShare = async () => {
    // Copy content first
    await copyShareContent()
    // Show options modal
    setShowShareMenu(false)
    setShowInstagramOptions(true)
  }

  const handleInstagramStory = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Try Instagram Stories URL scheme
      window.location.href = 'instagram://story-camera'
      setTimeout(() => {
        alert('Link copied! Open Instagram Stories and paste the link.')
      }, 500)
    } else {
      window.open('https://www.instagram.com/', '_blank')
      alert('Link copied! Open Instagram and create a story, then paste the link.')
    }
  }

  const handleInstagramPost = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Try Instagram Camera URL scheme
      window.location.href = 'instagram://camera'
      setTimeout(() => {
        alert('Link copied! Open Instagram and create a post, then paste the link.')
      }, 500)
    } else {
      window.open('https://www.instagram.com/', '_blank')
      alert('Link copied! Open Instagram and create a post, then paste the link.')
    }
  }

  const handleInstagramMessage = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Try Instagram Direct Message URL scheme
      window.location.href = 'instagram://direct-inbox'
      setTimeout(() => {
        alert('Link copied! Open Instagram Messages and paste the link.')
      }, 500)
    } else {
      window.open('https://www.instagram.com/direct/inbox/', '_blank')
      alert('Link copied! Open Instagram Messages and paste the link.')
    }
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
          <div className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-50 py-2" style={{
            width: '280px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}>
            {/* Native Share Button (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 border-b border-gray-100"
                aria-label="Share product with image"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 flex-shrink-0">
                  <Share2 className="w-6 h-6 text-white" />
                </span>
                <span className="font-medium">Share Image & Link</span>
              </button>
            )}
            <button
              onClick={handleWhatsAppShare}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Share on WhatsApp"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.15-.198.297-.768.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.62-.921-2.221-.242-.58-.487-.502-.672-.512l-.573-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 3.505h-.004a8.348 8.348 0 01-4.258-1.157l-.305-.181-3.172.832.847-3.094-.199-.317a8.345 8.345 0 01-1.277-4.43c.001-4.602 3.745-8.346 8.35-8.346 2.233 0 4.332.87 5.912 2.449a8.303 8.303 0 012.444 5.898c-.003 4.602-3.747 8.345-8.348 8.345M20.52 3.48A11.815 11.815 0 0012.057 0C5.495 0 .16 5.335.157 11.897c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.631a11.88 11.88 0 005.71 1.455h.005c6.56 0 11.895-5.335 11.898-11.897A11.821 11.821 0 0020.52 3.48" />
                </svg>
              </span>
              <span className="font-medium">WhatsApp</span>
            </button>
            <button
              onClick={handleFacebookShare}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Share on Facebook"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1877F2] flex-shrink-0">
                <Facebook className="w-6 h-6 text-white" />
              </span>
              <span className="font-medium">Facebook</span>
            </button>
            <button
              onClick={handleInstagramShare}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Share on Instagram"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex-shrink-0">
                <Instagram className="w-6 h-6 text-white" />
              </span>
              <span className="font-medium">Instagram</span>
            </button>
            <button
              onClick={handleEmailShare}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Share via Email"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#EA4335] flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </span>
              <span className="font-medium">Email</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Copy link"
            >
              {copied ? (
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500 flex-shrink-0">
                  <Check className="w-6 h-6 text-white" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 flex-shrink-0">
                  <Copy className="w-6 h-6 text-gray-700" />
                </span>
              )}
              <span className="font-medium">{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </>
      )}

      {/* Instagram Options Modal */}
      {showInstagramOptions && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50" 
            onClick={() => setShowInstagramOptions(false)}
          />
          <div className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-50 py-4" style={{
            width: '320px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}>
            <div className="px-4 py-2 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Share on Instagram</h3>
              <p className="text-xs text-gray-500 mt-1">Link copied! Choose where to share:</p>
            </div>
            <button
              onClick={handleInstagramStory}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 border-b border-gray-100"
              aria-label="Share on Instagram Story"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex-shrink-0">
                <Instagram className="w-6 h-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="font-medium block">Story</span>
                <span className="text-xs text-gray-500">Share in your story</span>
              </div>
            </button>
            <button
              onClick={handleInstagramPost}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 border-b border-gray-100"
              aria-label="Share on Instagram Post"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex-shrink-0">
                <Instagram className="w-6 h-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="font-medium block">Post</span>
                <span className="text-xs text-gray-500">Share in a post</span>
              </div>
            </button>
            <button
              onClick={handleInstagramMessage}
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
              aria-label="Share via Instagram Message"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex-shrink-0">
                <Instagram className="w-6 h-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="font-medium block">Message</span>
                <span className="text-xs text-gray-500">Send in a message</span>
              </div>
            </button>
            <button
              onClick={() => setShowInstagramOptions(false)}
              className="w-full px-4 py-2 mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

