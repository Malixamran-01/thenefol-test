import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { BlogCardAuthor } from './BlogCardAuthor'
import { BlogPostCard, type BlogPostCardPost } from './BlogPostCard'
import {
  getCarouselActiveIndex,
  scrollCarouselToIndex,
} from '../utils/carouselScroll'

interface SneakPost extends BlogPostCardPost {
  author_name?: string | null
  author_is_verified?: boolean
  author_id?: number | string | null
  author_unique_user_id?: string | null
  likes_count?: number | null
  comments_count?: number | null
}

function mapPostUrls(post: SneakPost): SneakPost {
  const apiBase = getApiBase()
  return {
    ...post,
    id: String(post.id),
    excerpt: post.excerpt ?? '',
    cover_image:
      post.cover_image && post.cover_image.startsWith('/uploads/')
        ? `${apiBase}${post.cover_image}`
        : post.cover_image,
    images: (post.images || []).map((imagePath: string) =>
      imagePath.startsWith('/uploads/') ? `${apiBase}${imagePath}` : imagePath
    ),
  }
}

function CommunityPostColumn({ post }: { post: SneakPost }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <BlogCardAuthor
        authorId={post.author_id}
        authorUniqueUserId={post.author_unique_user_id}
        authorName={post.author_name ?? 'NEFOL Community'}
        authorVerified={post.author_is_verified === true}
        showFollowButton={false}
      />
      <BlogPostCard
        post={post}
        initialLikes={post.likes_count ?? 0}
        initialComments={post.comments_count ?? 0}
        showActions={false}
      />
    </div>
  )
}

function CommunityCardsSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 animate-pulse">
          <div className="h-5 w-32 rounded bg-[#edf4f9]" />
          <div className="h-[360px] rounded-2xl bg-[#edf4f9]" />
        </div>
      ))}
    </>
  )
}

export default function SocialSneakPeek() {
  const [posts, setPosts] = useState<SneakPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await blogActivityAPI.searchPosts({
          featured: true,
          sort: 'featured',
          limit: 3,
          offset: 0,
        })
        if (!cancelled) {
          const rows = Array.isArray(data) ? data.slice(0, 3) : []
          setPosts(rows.map((p) => mapPostUrls(p as SneakPost)))
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

  const updateActiveSlide = useCallback(() => {
    const el = carouselRef.current
    if (!el || el.children.length === 0) return
    setActiveSlide(getCarouselActiveIndex(el))
  }, [])

  const scrollToSlide = (index: number) => {
    const el = carouselRef.current
    if (!el || el.children.length === 0) return
    scrollCarouselToIndex(el, index)
    setActiveSlide(index)
  }

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
            Featured stories from our users.
          </p>
        </div>

        {loading ? (
          <>
            <div className="nefol-horizontal-carousel md:hidden">
              {[0, 1, 2].map((i) => (
                <div key={i} className="nefol-horizontal-carousel__slide animate-pulse">
                  <div className="mb-3 h-5 w-32 rounded bg-[#edf4f9]" />
                  <div className="h-[360px] rounded-2xl bg-[#edf4f9]" />
                </div>
              ))}
            </div>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <CommunityCardsSkeleton count={3} />
            </div>
          </>
        ) : posts.length > 0 ? (
          <>
            {/* Mobile: horizontal swipe carousel */}
            <div
              ref={carouselRef}
              className="nefol-horizontal-carousel md:hidden"
              aria-label="Featured community posts"
              onScroll={updateActiveSlide}
            >
              {posts.map((post) => (
                <div key={String(post.id)} className="nefol-horizontal-carousel__slide">
                  <CommunityPostColumn post={post} />
                </div>
              ))}
            </div>

            {posts.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5 md:hidden" role="tablist" aria-label="Carousel slides">
                {posts.map((post, i) => (
                  <button
                    key={String(post.id)}
                    type="button"
                    role="tab"
                    aria-selected={i === activeSlide}
                    aria-label={`Show post ${i + 1} of ${posts.length}`}
                    onClick={() => scrollToSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === activeSlide ? 'w-6 bg-[#1B4965]' : 'w-1.5 bg-[#DCE6EE]'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Tablet/desktop: same grid as NEFOL Social home */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <CommunityPostColumn key={String(post.id)} post={post} />
              ))}
            </div>
          </>
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
