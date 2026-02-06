import React from 'react'
import { X, Calendar, User, ThumbsUp, MessageCircle } from 'lucide-react'

interface BlogPreviewProps {
  title: string
  excerpt: string
  content: string
  authorName: string
  authorEmail: string
  coverImage: File | null
  detailImage: File | null
  categories: string[]
  onClose: () => void
}

export default function BlogPreview({
  title,
  excerpt,
  content,
  authorName,
  authorEmail,
  coverImage,
  detailImage,
  categories,
  onClose
}: BlogPreviewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const processContentImages = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent
    
    // Convert blob URLs to visible format (they'll work in preview since they're in the same session)
    return htmlContent
  }

  const estimateReadingTime = (text: string) => {
    const wordsPerMinute = 200
    const words = text.split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }

  const readingTime = estimateReadingTime(content || '')

  return (
    <>
      <style>{`
        .blog-preview-content {
          line-height: 1.85;
          font-size: 1.0625rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        }
        .blog-preview-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .blog-preview-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
        .blog-preview-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .blog-preview-content h4 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        .blog-preview-content p { margin: 0.5em 0; }
        .blog-preview-content ul { list-style: disc; margin-left: 2em; padding-left: 0.5em; }
        .blog-preview-content ol { list-style: decimal; margin-left: 2em; padding-left: 0.5em; }
        .blog-preview-content li { margin: 0.25em 0; padding-left: 0.25em; }
        .blog-preview-content a { color: #4B97C9; text-decoration: underline; }
        .blog-preview-content img { max-width: 100%; height: auto; margin: 10px auto; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; display: block; }
        .blog-preview-content img:hover { border-color: #4B97C9; }
        .blog-preview-content div[contenteditable="false"] { text-align: center; margin: 20px 0; display: block; width: 100%; }
        .blog-preview-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
      `}</style>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="sticky top-4 right-4 float-right p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10"
            aria-label="Close preview"
          >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Preview Badge */}
        <div className="sticky top-4 left-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-lg z-10">
          Preview Mode
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10">
          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category, index) => (
                <span
                  key={index}
                  className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#1B4965' }}>
            {title || 'Untitled Blog Post'}
          </h1>

          {/* Author & Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-6">
            <button className="inline-flex items-center gap-2 hover:text-blue-600 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                <User className="h-5 w-5 text-gray-600" />
              </span>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">{authorName || 'Anonymous'}</div>
                <div className="text-xs text-gray-500">{authorEmail || 'No email'}</div>
              </div>
            </button>
            <span className="text-gray-400">•</span>
            <div className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(new Date())}
            </div>
            <span className="text-gray-400">•</span>
            <div>{readingTime}</div>
          </div>

          {/* Detail Image (appears below title) */}
          {detailImage && (
            <div className="mt-8 overflow-hidden rounded-2xl bg-gray-100">
              <div className="aspect-video w-full">
                <img
                  src={URL.createObjectURL(detailImage)}
                  alt={title || 'Blog detail image'}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Excerpt */}
          {excerpt && (
            <p className="mt-8 text-lg sm:text-xl leading-relaxed text-gray-700">
              {excerpt}
            </p>
          )}

          {/* Content */}
          <div
            className="blog-preview-content prose prose-lg max-w-none mt-10 text-gray-800"
          >
            {content ? (
              content.includes('<') && content.includes('>') ? (
                <div dangerouslySetInnerHTML={{ __html: processContentImages(content) }} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {content.split('\n').map((paragraph, index) =>
                    paragraph.trim() ? <p key={index}>{paragraph}</p> : null
                  )}
                </div>
              )
            ) : (
              <p style={{ color: '#9DB4C0' }}>No content yet. Start writing to see your preview!</p>
            )}
          </div>

          {/* Mock Likes & Comments Section */}
          <div className="mt-10 pt-10 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <button className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700">
                <ThumbsUp className="w-4 h-4" />
                Like
              </button>
              <span className="text-sm text-gray-600">0 likes</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                0
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Comments will appear here once your blog is published.
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}