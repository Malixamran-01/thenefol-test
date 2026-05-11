import React from 'react'
import { BarChart3, Check, Copy, PenLine, Zap } from 'lucide-react'
import { AuthorVerifiedBadge } from '../../../components/AuthorVerifiedBadge'
import type { AuthorProfile } from '../types'

type Props = {
  author: AuthorProfile
  copied: boolean
  onCopyProfile: () => void
}

export function DashboardHeader({ author, copied, onCopyProfile }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-gray-900">
          Analytics
          {author.is_verified === true && String(author.status || 'active') === 'active' ? (
            <AuthorVerifiedBadge size="lg" className="translate-y-0.5" />
          ) : null}
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-400">Monitor your content performance</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopyProfile}
          className="flex items-center gap-1.5 rounded-full border border-[#d0e4f0] bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 shadow-sm transition hover:border-[#4B97C9] hover:text-[#1B4965]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Share Profile'}
        </button>
        <a
          href="#/user/blog/request"
          className="flex items-center gap-1.5 rounded-full bg-[#1B4965] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#163d57]"
        >
          <PenLine className="h-3.5 w-3.5" /> New Post
        </a>
      </div>
    </div>
  )
}

export function DashboardSignInPrompt() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4f9]">
        <BarChart3 className="h-8 w-8 text-[#1B4965]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">Sign in to view your dashboard</p>
        <p className="mt-1 text-sm text-gray-500">Track posts, followers, and engagement in one place.</p>
      </div>
      <a
        href="#/user/login"
        className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md"
      >
        Sign In
      </a>
    </div>
  )
}

export function DashboardAuthorOnboardingPrompt() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4f9]">
        <Zap className="h-8 w-8 text-[#4B97C9]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800">Become an Author</p>
        <p className="mt-1 text-sm text-gray-500">Set up your author profile to unlock your creator dashboard.</p>
      </div>
      <a
        href="#/user/author/onboarding"
        className="rounded-full bg-[#1B4965] px-6 py-2.5 text-sm font-semibold text-white shadow-md"
      >
        Get Started
      </a>
    </div>
  )
}
