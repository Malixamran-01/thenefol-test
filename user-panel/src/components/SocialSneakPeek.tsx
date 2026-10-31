import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { blogActivityAPI } from '../services/api'
import { getApiBase } from '../utils/apiBase'
import { BlogCardAuthor } from './BlogCardAuthor'
import { plainTextCardPreview, type BlogPostCardPost } from './BlogPostCard'
import {
  getCarouselActiveIndex,
  scrollCarouselToIndex,
} from '../utils/carouselScroll'

interface SneakPost extends BlogPostCardPost {
  author_name?: string | null
  author_is_verified?: boolean
  author_id?: number | string | null
  author_unique_user_id?: string | null
  author_photo?: string | null
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
    author_photo:
      post.author_photo && post.author_photo.startsWith('/uploads/')
        ? `${apiBase}${post.author_photo}`
        : post.author_photo,
  }
}

const GRID_COLUMNS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }

/** Adapts to its own width: a 16:9 text-and-photo banner when alone, a stacked card beside others. */
function CommunityStoryCard({ post }: { post: SneakPost }) {
  const coverImage = post.cover_image || post.images?.[0] || '/IMAGES/default-blog.jpg'
  const title = plainTextCardPreview(post.title)
  const excerpt = plainTextCardPreview(post.excerpt)

  return (
    <article className="nefol-story group">
      <div className="nefol-story__card">
        <img src={coverImage} alt="" aria-hidden="true" className="nefol-story__backdrop img-fill" loading="lazy" />
        <div className="nefol-story__media">
          <img src={coverImage} alt="" className="img-fill" loading="lazy" />
        </div>
        {post.featured && <span className="nefol-story__badge">Featured</span>}

        <div className="nefol-story__body">
          <h3 className="nefol-story__title">
            <a href={`#/user/blog/${post.id}`} className="nefol-story__link">{title}</a>
          </h3>
          {excerpt && <p className="nefol-story__excerpt">{excerpt}</p>}

          <div className="nefol-story__footer">
            <div className="nefol-story__author">
              <BlogCardAuthor
                authorId={post.author_id}
                authorUniqueUserId={post.author_unique_user_id}
                authorName={post.author_name ?? 'NEFOL Community'}
                authorProfileImage={post.author_photo ?? null}
                authorVerified={post.author_is_verified === true}
                showFollowButton={false}
                onDark
              />
            </div>
            <span className="nefol-story__read" aria-hidden="true">
              Read story
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </article>
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
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.06em] text-[color:var(--nf-heading)]"
            style={{ fontFamily: 'var(--font-heading-family, inherit)' }}
          >
            Community
          </h2>
          <p className="mt-2 max-w-lg mx-auto text-sm sm:text-base text-gray-500">
            Featured stories from our users.
          </p>
        </div>

        {loading ? (
          <div className="nefol-stories h-[360px] animate-pulse rounded-[1.25rem] bg-[#edf4f9] md:aspect-video md:h-auto" />
        ) : posts.length > 0 ? (
          <>
            {/* Mobile, several posts: horizontal swipe carousel */}
            {posts.length > 1 && (
              <>
                <div
                  ref={carouselRef}
                  className="nefol-horizontal-carousel md:hidden"
                  aria-label="Featured community posts"
                  onScroll={updateActiveSlide}
                >
                  {posts.map((post) => (
                    <div key={String(post.id)} className="nefol-horizontal-carousel__slide">
                      <CommunityStoryCard post={post} />
                    </div>
                  ))}
                </div>

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
                        i === activeSlide ? 'w-6 bg-[color:var(--nf-heading)]' : 'w-1.5 bg-[#DCE6EE]'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Tablet/desktop, or a single post at any width */}
            <div className={`${posts.length > 1 ? 'hidden md:grid' : 'grid'} nefol-stories gap-6 lg:gap-8 ${GRID_COLUMNS[posts.length]}`}>
              {posts.map((post) => (
                <CommunityStoryCard key={String(post.id)} post={post} />
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
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--nf-heading)] px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[color:var(--nf-heading-hover)] hover:shadow-lg"
          >
            View more
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  )
}
