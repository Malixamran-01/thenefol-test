import React, { useEffect, useState } from 'react'
import { ArrowLeft, User } from 'lucide-react'

interface AuthorProfileData {
  id: string | number
  name: string
  email?: string
}

export default function AuthorProfile() {
  const [author, setAuthor] = useState<AuthorProfileData | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('blog_author_profile')
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthorProfileData
        setAuthor(parsed)
        return
      } catch {
        setAuthor(null)
      }
    }
  }, [])

  const handleBack = () => {
    window.location.hash = '#/user/blog'
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-10">
        <button
          onClick={handleBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#1B4965' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-semibold">
              {author?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {author?.name || 'Author'}
              </h1>
              {author?.email && (
                <p className="text-sm text-gray-600">{author.email}</p>
              )}
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>
              This is the author profile linked from the blog post. You can expand
              this page later with bio, posts, and social links.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
