import React, { useEffect, useState } from 'react'
import { Share2, Copy, Check, Facebook, Mail, Instagram } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { getProductShareUrls, getShareSiteOrigin } from '../utils/productShareUrls'

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
  className = '',
}: ShareProductProps) {
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showIconOnly, setShowIconOnly] = useState(false)
  const [showInstagramOptions, setShowInstagramOptions] = useState(false)

  const { appUrl, crawlUrl } = getProductShareUrls(productSlug)
  const siteOrigin = getShareSiteOrigin()
  const siteLogoOgUrl = `${siteOrigin}/IMAGES/NEFOL%20icon.png`
  /**
   * WhatsApp/Facebook must use crawlUrl (no hash) so the server returns product OG tags.
   * Copy Link uses appUrl (#/user/...) so the SPA opens directly.
   */
  const shareText = `Check out ${productTitle} on NEFOL! ${crawlUrl}`
  const copyLinkLabel = copied ? 'App link copied!' : 'Copy app link (#/user)'

  const getAbsoluteImageUrl = (img?: string): string | undefined => {
    if (!img || !img.trim()) return undefined
    if (/^https?:\/\//i.test(img)) return img
    const baseUrl = typeof window !== 'undefined' ? getShareSiteOrigin() : getApiBase()
    return img.startsWith('/') ? `${baseUrl}${img}` : `${baseUrl}/${img}`
  }

  const absoluteImageUrl = getAbsoluteImageUrl(productImage)
  const ogImageUrl = absoluteImageUrl || siteLogoOgUrl

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

      const desc = productDescription || 'Discover premium skincare from NEFOL.'

      ensureMeta('property', 'og:type', 'product')
      ensureMeta('property', 'og:title', productTitle)
      ensureMeta('property', 'og:description', desc)
      ensureMeta('property', 'og:url', crawlUrl)
      ensureMeta('property', 'og:image', ogImageUrl)
      ensureMeta('property', 'og:image:width', '1200')
      ensureMeta('property', 'og:image:height', '630')
      if (absoluteImageUrl) {
        ensureMeta('property', 'og:image:type', 'image/jpeg')
      }

      ensureMeta('name', 'twitter:card', 'summary_large_image')
      ensureMeta('name', 'twitter:title', productTitle)
      ensureMeta('name', 'twitter:description', desc)
      ensureMeta('name', 'twitter:image', ogImageUrl)
      ensureMeta('property', 'og:site_name', 'NEFOL')
      ensureMeta('name', 'description', desc)
    } catch (err) {
      console.warn('Failed to update social meta tags', err)
    }
  }, [productSlug, productTitle, productDescription, crawlUrl, ogImageUrl, absoluteImageUrl])

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(appUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return
      }
      const textArea = document.createElement('textarea')
      textArea.value = appUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert(`Unable to copy link. Please copy manually: ${appUrl}`)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      if (absoluteImageUrl && navigator.canShare) {
        const response = await fetch(absoluteImageUrl)
        if (response.ok) {
          const blob = await response.blob()
          const file = new File([blob], `${productSlug}.jpg`, { type: blob.type || 'image/jpeg' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: productTitle,
              text: shareText,
              url: crawlUrl,
              files: [file],
            })
            setShowShareMenu(false)
            return
          }
        }
      }
      await navigator.share({
        title: productTitle,
        text: shareText,
        url: crawlUrl,
      })
      setShowShareMenu(false)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Error sharing:', err)
      }
    }
  }

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(whatsappUrl, '_blank')
    setShowShareMenu(false)
  }

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(crawlUrl)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
    setShowShareMenu(false)
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${productTitle} on NEFOL!`)
    const bodyParts = [`Check out ${productTitle} on NEFOL!`, '', appUrl]
    if (productDescription) bodyParts.push('', productDescription)
    const mailtoUrl = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyParts.join('\n'))}`
    window.location.href = mailtoUrl
    setShowShareMenu(false)
  }

  const copyShareContent = async () => {
    const shareContent = `Check out ${productTitle} on NEFOL!\n\n${appUrl}`
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareContent)
    } else {
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
    await copyShareContent()
    setShowShareMenu(false)
    setShowInstagramOptions(true)
  }

  const handleInstagramStory = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'instagram://story-camera'
      setTimeout(() => alert('Link copied! Open Instagram Stories and paste the link.'), 500)
    } else {
      window.open('https://www.instagram.com/', '_blank')
      alert('Link copied! Open Instagram and create a story, then paste the link.')
    }
  }

  const handleInstagramPost = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'instagram://camera'
      setTimeout(() => alert('Link copied! Open Instagram and create a post, then paste the link.'), 500)
    } else {
      window.open('https://www.instagram.com/', '_blank')
      alert('Link copied! Open Instagram and create a post, then paste the link.')
    }
  }

  const handleInstagramMessage = () => {
    setShowInstagramOptions(false)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'instagram://direct-inbox'
      setTimeout(() => alert('Link copied! Open Instagram Messages and paste the link.'), 500)
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
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
        }}
      >
        <Share2 className="w-4 h-4" />
        {!showIconOnly && <span>Share</span>}
      </button>

      {showShareMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
          <div
            className="fixed z-50 rounded-lg border border-gray-200 bg-white py-2 shadow-2xl"
            style={{
              width: '280px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                aria-label="Share product with image"
              >
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <Share2 className="h-6 w-6 text-white" />
                </span>
                <span className="font-medium">Share Image & Link</span>
              </button>
            )}
            <button
              onClick={handleWhatsAppShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Share on WhatsApp"
            >
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.15-.198.297-.768.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.672-1.62-.921-2.221-.242-.58-.487-.502-.672-.512l-.573-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 3.505h-.004a8.348 8.348 0 01-4.258-1.157l-.305-.181-3.172.832.847-3.094-.199-.317a8.345 8.345 0 01-1.277-4.43c.001-4.602 3.745-8.346 8.35-8.346 2.233 0 4.332.87 5.912 2.449a8.303 8.303 0 012.444 5.898c-.003 4.602-3.747 8.345-8.348 8.345M20.52 3.48A11.815 11.815 0 0012.057 0C5.495 0 .16 5.335.157 11.897c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.631a11.88 11.88 0 005.71 1.455h.005c6.56 0 11.895-5.335 11.898-11.897A11.821 11.821 0 0020.52 3.48" />
                </svg>
              </span>
              <span className="font-medium">WhatsApp</span>
            </button>
            <button
              onClick={handleFacebookShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Share on Facebook"
            >
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1877F2]">
                <Facebook className="h-6 w-6 text-white" />
              </span>
              <span className="font-medium">Facebook</span>
            </button>
            <button
              onClick={handleInstagramShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Share on Instagram"
            >
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]">
                <Instagram className="h-6 w-6 text-white" />
              </span>
              <span className="font-medium">Instagram</span>
            </button>
            <button
              onClick={handleEmailShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Share via Email"
            >
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#EA4335]">
                <Mail className="h-6 w-6 text-white" />
              </span>
              <span className="font-medium">Email</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Copy link"
            >
              {copied ? (
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-6 w-6 text-white" />
                </span>
              ) : (
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <Copy className="h-6 w-6 text-gray-700" />
                </span>
              )}
              <span className="font-medium">{copyLinkLabel}</span>
            </button>
          </div>
        </>
      )}

      {showInstagramOptions && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowInstagramOptions(false)} />
          <div
            className="fixed z-50 rounded-lg border border-gray-200 bg-white py-4 shadow-2xl"
            style={{
              width: '320px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '90vw',
            }}
          >
            <div className="border-b border-gray-200 px-4 py-2">
              <h3 className="text-lg font-semibold text-gray-900">Share on Instagram</h3>
              <p className="mt-1 text-xs text-gray-500">Link copied! Choose where to share:</p>
            </div>
            <button
              onClick={handleInstagramStory}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]">
                <Instagram className="h-6 w-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="block font-medium">Story</span>
                <span className="text-xs text-gray-500">Share in your story</span>
              </div>
            </button>
            <button
              onClick={handleInstagramPost}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]">
                <Instagram className="h-6 w-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="block font-medium">Post</span>
                <span className="text-xs text-gray-500">Share in a post</span>
              </div>
            </button>
            <button
              onClick={handleInstagramMessage}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]">
                <Instagram className="h-6 w-6 text-white" />
              </span>
              <div className="flex-1 text-left">
                <span className="block font-medium">Message</span>
                <span className="text-xs text-gray-500">Send in a message</span>
              </div>
            </button>
            <button
              onClick={() => setShowInstagramOptions(false)}
              className="mt-2 w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
