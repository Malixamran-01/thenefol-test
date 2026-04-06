import React, { useState, useEffect, useRef } from 'react'
import { User, ChevronDown } from 'lucide-react'
import { AuthorVerifiedBadge } from './AuthorVerifiedBadge'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../contexts/AuthContext'
import { blogActivityAPI } from '../services/api'
import { setFollowStatus } from '../store/followSlice'
import type { RootState } from '../store'

interface BlogCardAuthorProps {
  authorId: string | number | null | undefined
  authorUniqueUserId?: string | null
  authorName: string
  authorProfileImage?: string | null
  /** From API when author has active profile + admin verified flag */
  authorVerified?: boolean
}

export function BlogCardAuthor({
  authorId,
  authorUniqueUserId,
  authorName,
  authorProfileImage,
  authorVerified,
}: BlogCardAuthorProps) {
  const { user, isAuthenticated } = useAuth()
  const dispatch = useDispatch()
  const [showUnfollowMenu, setShowUnfollowMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const effectiveAuthorId = (authorId != null ? String(authorId) : null) || authorUniqueUserId || null
  const reduxFollowKey = (authorId != null ? String(authorId) : null) || authorUniqueUserId || null
  const isOwnProfile = Boolean(
    isAuthenticated &&
    user?.id != null &&
    effectiveAuthorId &&
    (String(user.id) === String(authorId) || String(user.unique_user_id) === String(authorUniqueUserId))
  )

  const isFollowingFromRedux = reduxFollowKey
    ? useSelector((s: RootState) => s.follow.byAuthorId[reduxFollowKey])
    : null
  const [isFollowingLocal, setIsFollowingLocal] = useState<boolean | null>(isFollowingFromRedux)
  const isFollowing = isFollowingFromRedux ?? isFollowingLocal ?? false

  const linkAuthorId = (authorId != null ? String(authorId) : null) || authorUniqueUserId || null
  const authorProfileUrl = linkAuthorId ? `#/user/author/${linkAuthorId}` : null

  const handleAuthorClick = () => {
    if (!authorProfileUrl) return
    sessionStorage.setItem('blog_author_profile', JSON.stringify({
      id: authorId ?? effectiveAuthorId,
      name: authorName
    }))
    window.location.hash = authorProfileUrl
  }

  useEffect(() => {
    if (!effectiveAuthorId || !isAuthenticated || isOwnProfile) {
      setHasProfile(null)
      return
    }
    let cancelled = false
    blogActivityAPI.getAuthorStats(effectiveAuthorId)
      .then((stats) => {
        if (!cancelled) {
          setHasProfile(true)
          if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: stats.isFollowing ?? false }))
        }
      })
      .catch(() => {
        if (!cancelled) setHasProfile(false)
      })
    return () => { cancelled = true }
  }, [effectiveAuthorId, isAuthenticated, isOwnProfile, reduxFollowKey, dispatch])

  useEffect(() => {
    setIsFollowingLocal(isFollowingFromRedux)
  }, [isFollowingFromRedux])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUnfollowMenu(false)
      }
    }
    if (showUnfollowMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUnfollowMenu])

  const handleFollowClick = async () => {
    if (!effectiveAuthorId || !isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await blogActivityAPI.followAuthor(effectiveAuthorId)
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: true }))
    } catch {
      // Maybe author has no profile
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollowClick = async () => {
    if (!effectiveAuthorId || !isAuthenticated || loading) return
    setLoading(true)
    setShowUnfollowMenu(false)
    try {
      await blogActivityAPI.unfollowAuthor(effectiveAuthorId)
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: false }))
    } catch {
      // Fallback
      if (reduxFollowKey) dispatch(setFollowStatus({ authorId: reduxFollowKey, isFollowing: false }))
    } finally {
      setLoading(false)
    }
  }

  const canShowFollow = !isOwnProfile && (hasProfile === true || hasProfile === null)

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={handleAuthorClick}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-gray-200">
          {authorProfileImage ? (
            <img
              src={authorProfileImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-gray-600" />
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#1B4965' }}>
          {authorName || 'Anonymous'}
          {authorVerified ? <AuthorVerifiedBadge /> : null}
        </span>
      </button>

      {canShowFollow && (
        <div className="relative" ref={menuRef}>
          {isFollowing ? (
            <>
              <button
                type="button"
                onClick={() => setShowUnfollowMenu((s) => !s)}
                disabled={loading}
                className="flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: '#1B4965',
                  color: 'white'
                }}
              >
                Followed
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showUnfollowMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleUnfollowClick}
                    disabled={loading}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Unfollow
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleFollowClick}
              disabled={loading}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: '#1B4965',
                color: 'white'
              }}
            >
              {loading ? '...' : 'Follow'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
