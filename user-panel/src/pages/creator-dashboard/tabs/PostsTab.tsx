import React from 'react'
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit3,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  PenLine,
  Repeat2,
  Star,
} from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { fmtCompact, fmtDate, resolveImg, timeAgo } from '../utils/format'
import type { Draft, Post, SortKey } from '../types'

type Props = {
  drafts: Draft[]
  sortedPosts: Post[]
  postsToShow: Post[]
  sortKey: SortKey
  sortDir: 'desc' | 'asc'
  postFilter: 'all' | 'approved' | 'pending' | 'rejected'
  showAll: boolean
  onToggleSort: (k: SortKey) => void
  onPostFilter: (f: 'all' | 'approved' | 'pending' | 'rejected') => void
  onToggleShowAll: () => void
}

export function PostsTab({
  drafts,
  sortedPosts,
  postsToShow,
  sortKey,
  sortDir,
  postFilter,
  showAll,
  onToggleSort,
  onPostFilter,
  onToggleShowAll,
}: Props) {
  const fmt = fmtCompact

  return (
    <div className="space-y-10">
      {drafts.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Drafts</p>
              <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black text-gray-900">
                <FileText className="h-5 w-5 text-gray-400" /> Saved Drafts
              </h2>
            </div>
            <a
              href="#/user/blog/my-blogs"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]"
            >
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {drafts.map((d) => (
              <a
                key={d.id}
                href="#/user/blog/request"
                className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3.5 shadow-sm transition hover:border-[#cce0f0] hover:shadow"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e8eef4] bg-gray-50 transition group-hover:border-[#4B97C9]/30 group-hover:bg-[#edf4f9]">
                  <Edit3 className="h-4 w-4 text-gray-400 transition group-hover:text-[#4B97C9]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-gray-700 group-hover:text-[#1B4965]">
                    {d.title || 'Untitled'}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="h-3 w-3" /> {timeAgo(d.updated_at)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
                  Draft
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Performance</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black text-gray-900">
              <BarChart3 className="h-5 w-5 text-[#1B4965]" /> All Posts
              <span className="rounded-full bg-[#edf4f9] px-2.5 py-0.5 text-[11px] font-bold text-[#1B4965]">
                {sortedPosts.length}
              </span>
            </h2>
          </div>
          <div className="flex gap-1 rounded-2xl border border-[#e8eef4] bg-white p-1 shadow-sm">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onPostFilter(f)}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold capitalize transition-all ${
                  postFilter === f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {sortedPosts.length > 0 ? (
          <div className="mb-1 hidden grid-cols-[1fr_56px_56px_56px_56px_88px] items-center gap-2 px-4 sm:grid">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Post</span>
            {(
              [
                ['views_count', 'Views'],
                ['likes_count', 'Likes'],
                ['comments_count', 'Cmts'],
                ['reposts_count', 'Rpsts'],
                ['created_at', 'Date'],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onToggleSort(key)}
                className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1B4965]"
              >
                {label}
                {sortKey === key ? (
                  sortDir === 'desc' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d0e4f0] py-16 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-gray-200" />
            <p className="font-semibold text-gray-400">No posts found</p>
            <a
              href="#/user/blog/request"
              className="mt-3 rounded-full bg-[#1B4965] px-4 py-2 text-[12px] font-semibold text-white"
            >
              Write your first post
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {postsToShow.map((post) => {
                const img = resolveImg(post.cover_image)
                return (
                  <a
                    key={post.id}
                    href={`#/user/blog/${post.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3 shadow-sm transition hover:border-[#cce0f0] hover:shadow"
                  >
                    {img ? (
                      <img src={img} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#edf4f9] to-[#d0e4f0]">
                        <BookOpen className="h-4 w-4 text-[#4B97C9]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">
                          {post.title}
                        </p>
                        {post.featured ? (
                          <Star className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-4 text-[12px] text-gray-500 sm:flex">
                      <span className="flex w-12 items-center justify-end gap-1">
                        <Eye className="h-3.5 w-3.5 text-gray-300" />
                        {fmt(post.views_count)}
                      </span>
                      <span className="flex w-12 items-center justify-end gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-300" />
                        {fmt(post.likes_count)}
                      </span>
                      <span className="flex w-12 items-center justify-end gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-[#9bc5e0]" />
                        {fmt(post.comments_count)}
                      </span>
                      <span className="flex w-12 items-center justify-end gap-1">
                        <Repeat2 className="h-3.5 w-3.5 text-emerald-300" />
                        {fmt(post.reposts_count)}
                      </span>
                      <StatusBadge status={post.status} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:hidden">
                      <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                        <Heart className="h-3 w-3 text-rose-300" />
                        {fmt(post.likes_count)}
                      </span>
                      <StatusBadge status={post.status} />
                    </div>
                  </a>
                )
              })}
            </div>
            {sortedPosts.length > 8 ? (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-gray-400 transition hover:text-[#1B4965]"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" /> Show all {sortedPosts.length} posts
                  </>
                )}
              </button>
            ) : null}
          </>
        )}
      </section>

      <section>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              {
                href: '#/user/blog/request',
                icon: <PenLine className="h-5 w-5" />,
                label: 'Write Post',
                sub: 'Start a new draft',
                dark: true,
              },
              {
                href: '#/user/blog/explore',
                icon: <Compass className="h-5 w-5" />,
                label: 'Explore',
                sub: 'Find new readers',
                dark: false,
              },
              {
                href: '#/user/blog/activity',
                icon: <Bell className="h-5 w-5" />,
                label: 'Activity',
                sub: 'Notifications',
                dark: false,
              },
              {
                href: '#/user/author/me',
                icon: <Eye className="h-5 w-5" />,
                label: 'View Profile',
                sub: 'See your public page',
                dark: false,
              },
            ] as const
          ).map(({ href, icon, label, sub, dark }) => (
            <a
              key={label}
              href={href}
              className={`group flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                dark ? 'border-[#1B4965] bg-[#1B4965]' : 'border-[#e8eef4] bg-white hover:border-[#cce0f0]'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-white/20' : 'bg-[#edf4f9]'}`}
              >
                <span className={dark ? 'text-white' : 'text-[#1B4965]'}>{icon}</span>
              </div>
              <div>
                <p className={`text-[13px] font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                <p className={`text-[11px] ${dark ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
