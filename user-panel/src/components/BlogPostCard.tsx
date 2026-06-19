import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Bookmark } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { RepostButton } from './RepostButton'

export interface BlogPostCardPost {
  id: string
  title: string
  excerpt: string
  cover_image?: string
  images?: string[]
  featured?: boolean
  reposts_count?: number
}

/** Strip HTML for card previews so titles/excerpts don’t show raw tags and line-clamp works. */
export function plainTextCardPreview(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  let s = String(value)
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
  return s.replace(/\s+/g, ' ').trim()
}

function useImageThemeColor(src: string | undefined): string {
  const DEFAULT = 'rgba(28,28,28,0.88)'
  const [bg, setBg] = useState(DEFAULT)
  const prevSrc = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!src || src === prevSrc.current) return
    prevSrc.current = src

    const img = new Image()
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      img.crossOrigin = 'anonymous'
    }

    img.onload = () => {
      try {
        const W = 80, H = 80
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, W, H)

        const startY = Math.floor(H * 0.65)
        const sampleH = H - startY
        const { data } = ctx.getImageData(0, startY, W, sampleH)

        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
        }
        if (n === 0) return

        const f = 0.45
        setBg(`rgba(${Math.round(r / n * f)},${Math.round(g / n * f)},${Math.round(b / n * f)},0.97)`)
      } catch {
        setBg(DEFAULT)
      }
    }
    img.onerror = () => setBg(DEFAULT)
    img.src = src
  }, [src])

  return bg
}

export function BlogPostCard({
  post,
  initialLikes,
  initialComments,
  initialSaved,
  onUnsave,
  showActions = true,
  skipStatusFetch = false,
}: {
  post: BlogPostCardPost
  initialLikes: number
  initialComments: number
  initialSaved?: boolean
  onUnsave?: () => void
  /** Homepage preview: no like / comment / repost / save (read-only teaser) */
  showActions?: boolean
  /** Skip per-card likes/reposts/bookmarks fetch (e.g. already known from parent) */
  skipStatusFetch?: boolean
}) {
  const coverImage = post.cover_image || (post.images && post.images[0]) || '/IMAGES/default-blog.jpg'
  const cardBg = useImageThemeColor(coverImage)
  const apiBase = getApiBase()
  const titlePlain = plainTextCardPreview(post.title)
  const excerptPlain = plainTextCardPreview(post.excerpt)

  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [reposts, setReposts] = useState(post.reposts_count ?? 0)
  const [reposted, setReposted] = useState(false)
  const [saved, setSaved] = useState(initialSaved ?? false)
  const [actionPending, setActionPending] = useState<'like' | 'bookmark' | null>(null)

  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  useEffect(() => {
    if (!showActions || skipStatusFetch) return
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch(`${apiBase}/api/blog/posts/${post.id}/likes`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/blog/posts/${post.id}/reposts`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/blog/posts/${post.id}/bookmarks`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([likeData, repostData, bookmarkData]) => {
      if (likeData) { setLikes(likeData.count); setLiked(!!likeData.liked) }
      if (repostData) { setReposts(repostData.count); setReposted(!!repostData.reposted) }
      if (bookmarkData) { setSaved(!!bookmarkData.saved) }
    }).catch(() => {/* silently ignore */})
  }, [post.id, apiBase, token, showActions])

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isLoggedIn) { window.location.hash = '#/user/login'; return }
    if (actionPending === 'like') return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(n => wasLiked ? n - 1 : n + 1)
    setActionPending('like')
    try {
      const endpoint = wasLiked ? 'unlike' : 'like'
      const res = await fetch(`${apiBase}/api/blog/posts/${post.id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLikes(data.count)
      } else {
        setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1)
      }
    } catch { setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1) }
    finally { setActionPending(null) }
  }, [liked, isLoggedIn, actionPending, apiBase, post.id, token])

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isLoggedIn) { window.location.hash = '#/user/login'; return }
    if (actionPending === 'bookmark') return
    const wasSaved = saved
    setSaved(!wasSaved)
    setActionPending('bookmark')
    window.dispatchEvent(new CustomEvent('blog:bookmarked', { detail: { saved: !wasSaved } }))
    try {
      const endpoint = wasSaved ? 'unbookmark' : 'bookmark'
      const res = await fetch(`${apiBase}/api/blog/posts/${post.id}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setSaved(wasSaved)
        window.dispatchEvent(new CustomEvent('blog:bookmarked', { detail: { saved: wasSaved } }))
      } else if (wasSaved && onUnsave) {
        onUnsave()
      }
    } catch {
      setSaved(wasSaved)
      window.dispatchEvent(new CustomEvent('blog:bookmarked', { detail: { saved: wasSaved } }))
    }
    finally { setActionPending(null) }
  }, [saved, isLoggedIn, actionPending, apiBase, post.id, token, onUnsave])

  return (
    <a
      href={`#/user/blog/${post.id}`}
      className="group flex h-[360px] flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer"
      style={{ textDecoration: 'none' }}
    >
      <div className="relative min-h-0 flex-[7] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        {post.featured && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#4B97C9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Featured
          </span>
        )}
      </div>

      <div
        className="flex min-h-0 flex-[3] flex-col overflow-hidden px-4 py-2.5"
        style={{ background: cardBg, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <h3
            className="mb-0.5 line-clamp-2 text-[14px] font-semibold leading-snug text-white"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
          >
            {titlePlain || '\u00A0'}
          </h3>
          <p className={`leading-snug text-white/70 ${showActions ? 'line-clamp-1 text-[12px]' : 'line-clamp-2 text-[12px]'}`}>
            {excerptPlain || '\u00A0'}
          </p>
        </div>

        {showActions && (
          <div className="mt-1 flex shrink-0 items-center justify-between border-t border-white/15 pt-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handleLike}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10 active:scale-95"
                title={liked ? 'Unlike' : 'Like'}
              >
                <Heart
                  className="h-4 w-4 transition-colors"
                  style={{ color: liked ? '#ff5e7e' : 'rgba(255,255,255,0.85)', fill: liked ? '#ff5e7e' : 'none' }}
                />
                <span className="text-[12px] font-medium text-white/85 min-w-[14px] text-center">{likes}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation() }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10"
                title="Comments"
              >
                <MessageCircle className="h-4 w-4 text-white/85" />
                <span className="text-[12px] font-medium text-white/85 min-w-[14px] text-center">{initialComments}</span>
              </button>

              <RepostButton
                postId={Number(post.id)}
                postTitle={titlePlain || post.title}
                postCover={coverImage}
                initialReposted={reposted}
                initialCount={reposts}
                onCountChange={(count, isReposted) => { setReposts(count); setReposted(isReposted) }}
                variant="card"
                showCount
              />
            </div>

            <button
              onClick={handleBookmark}
              className="rounded-lg p-2 transition-colors hover:bg-white/10 active:scale-95"
              title={saved ? 'Remove from saved' : 'Save for later'}
            >
              <Bookmark
                className="h-4 w-4 transition-colors"
                style={{ color: saved ? '#fbbf24' : 'rgba(255,255,255,0.85)', fill: saved ? '#fbbf24' : 'none' }}
              />
            </button>
          </div>
        )}
      </div>
    </a>
  )
}
