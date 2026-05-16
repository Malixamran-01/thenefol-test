import React, { useEffect, useState } from 'react'
import { ArrowRight, Heart, MessageCircle, Star, Users } from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { AuthorVerifiedBadge } from './AuthorVerifiedBadge'

interface SneakPost {
  id: string | number
  title: string
  excerpt?: string | null
  cover_image?: string | null
  author_name?: string | null
  author_is_verified?: boolean
  featured?: boolean
  likes_count?: number | null
  comments_count?: number | null
  created_at?: string
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function coverUrl(cover: string | null | undefined): string | null {
  if (!cover) return null
  const apiBase = getApiBase()
  return cover.startsWith('/uploads/') ? `${apiBase}${cover}` : cover
}

function SneakPostCard({ post }: { post: SneakPost }) {
  const imgSrc = coverUrl(post.cover_image ?? null)

  return (
    <a
      href={`#/user/blog/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#DCE6EE] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#edf4f9]">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#9DB4C0]">
            <Users className="h-10 w-10 opacity-40" strokeWidth={1.5} />
          </div>
        )}
        {post.featured && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-white shadow">
            <Star className="h-3 w-3 fill-white" /> Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 group-hover:text-[#1B4965] sm:text-lg">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-medium text-gray-600">
            {post.author_name || 'NEFOL Community'}
            {post.author_is_verified ? <AuthorVerifiedBadge size="sm" /> : null}
          </span>
          <div className="flex flex-shrink-0 items-center gap-2.5 text-gray-400">
            <span className="flex items-center gap-0.5 text-[11px]">
              <Heart className="h-3.5 w-3.5" strokeWidth={2.5} />
              {formatCount(post.likes_count ?? 0)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              {formatCount(post.comments_count ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}

export default function SocialSneakPeek() {
  const [posts, setPosts] = useState<SneakPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await blogActivityAPI.searchPosts({
          featured: true,
          sort: 'featured',
          limit: 2,
          offset: 0,
        })
        if (!cancelled) {
          setPosts(Array.isArray(data) ? data.slice(0, 2) : [])
        }
      } catch (e) {
        console.error('[SocialSneakPeek] failed to load featured posts', e)
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-white" aria-labelledby="community-section-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10 text-center">
          <h2
            id="community-section-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.06em] text-[#1B4965]"
            style={{ fontFamily: 'var(--font-heading-family, inherit)' }}
          >
            Community
          </h2>
          <p className="mt-2 max-w-lg mx-auto text-sm sm:text-base text-gray-500">
            Featured stories from our creators.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#DCE6EE] bg-white overflow-hidden">
                <div className="aspect-[16/10] bg-[#edf4f9]" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 rounded bg-[#edf4f9]" />
                  <div className="h-4 w-full rounded bg-[#f4f9f9]" />
                  <div className="h-4 w-2/3 rounded bg-[#f4f9f9]" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {posts.map((post) => (
              <SneakPostCard key={String(post.id)} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 max-w-md mx-auto mb-6">
            New stories coming soon.
          </p>
        )}

        <div className="mt-8 sm:mt-10 flex justify-center">
          <a
            href="#/user/blog"
            className="inline-flex items-center gap-2 rounded-full bg-[#1B4965] px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#163d54] hover:shadow-lg"
          >
            View more
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  )
}
