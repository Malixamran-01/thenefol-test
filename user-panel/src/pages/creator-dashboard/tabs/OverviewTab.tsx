import React from 'react'
import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  UserPlus,
} from 'lucide-react'
import { ACTIVITY_META } from '../activityMeta'
import { fmtCompact, fmtDate, resolveImg, timeAgo } from '../utils/format'
import type { Activity, Post, Stats } from '../types'

type Props = {
  stats: Stats
  approvedCount: number
  pendingCount: number
  topPosts: Post[]
  recentActivity: Activity[]
}

export function OverviewTab({ stats, approvedCount, pendingCount, topPosts, recentActivity }: Props) {
  const fmt = fmtCompact

  return (
    <div className="space-y-10">
      <section>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Overview</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#1B4965] to-[#2a6f9e] p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">Total Likes</p>
              <p className="mt-1 text-5xl font-black text-white">{fmt(stats.likes)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-blue-300">
                <Heart className="h-3.5 w-3.5" /> across all published posts
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Heart className="h-7 w-7 text-rose-300" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
              <UserPlus className="h-4 w-4 text-purple-600" strokeWidth={1.75} />
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Followers</p>
              <p className="text-3xl font-black text-gray-900">{fmt(stats.followers)}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
              <Eye className="h-4 w-4 text-sky-500" strokeWidth={1.75} />
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Profile Views</p>
              <p className="text-3xl font-black text-gray-900">{fmt(stats.profileViews)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Blog Reads',
              value: stats.reads,
              icon: <BookOpen className="h-4 w-4 text-emerald-600" />,
              bg: 'bg-emerald-50',
            },
            {
              label: 'Total Views',
              value: stats.views,
              icon: <Eye className="h-4 w-4 text-amber-500" />,
              bg: 'bg-amber-50',
            },
            {
              label: 'Comments',
              value: stats.comments,
              icon: <MessageCircle className="h-4 w-4 text-[#4B97C9]" />,
              bg: 'bg-[#edf4f9]',
            },
            {
              label: 'Published',
              value: approvedCount,
              icon: <CheckCircle2 className="h-4 w-4 text-orange-500" />,
              bg: 'bg-orange-50',
              sub: pendingCount > 0 ? `${pendingCount} pending` : undefined,
            },
          ].map(({ label, value, icon, bg, sub }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-sm"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-xl font-black text-gray-900">{fmt(value)}</p>
                {sub ? <p className="text-[10px] text-amber-500">{sub}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Best Performing</p>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900">
            <Flame className="h-5 w-5 text-orange-500" /> Top Posts
          </h2>
          {topPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FileText className="mb-2 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No published posts yet</p>
              <a href="#/user/blog/request" className="mt-3 text-[12px] font-semibold text-[#4B97C9] hover:underline">
                Write your first post →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {topPosts.map((post, i) => {
                const img = resolveImg(post.cover_image)
                const ranks = [
                  'bg-amber-400 text-white',
                  'bg-slate-300 text-slate-700',
                  'bg-orange-300 text-white',
                  'bg-gray-100 text-gray-500',
                  'bg-gray-100 text-gray-500',
                ]
                return (
                  <a
                    key={post.id}
                    href={`#/user/blog/${post.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-[#f0f4f7] bg-white px-4 py-3 shadow-sm transition hover:border-[#cce0f0] hover:shadow"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ranks[i]}`}
                    >
                      {i + 1}
                    </span>
                    {img ? (
                      <img src={img} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-[#edf4f9]">
                        <BookOpen className="h-4 w-4 text-[#4B97C9]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-gray-800 group-hover:text-[#1B4965]">
                        {post.title}
                      </p>
                      <p className="text-[11px] text-gray-400">{fmtDate(post.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-400" />
                        {fmt(post.likes_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-[#4B97C9]" />
                        {fmt(post.comments_count)}
                      </span>
                      <span className="hidden items-center gap-1 sm:flex">
                        <Eye className="h-3 w-3 text-gray-300" />
                        {fmt(post.views_count)}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Latest</p>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
              <Bell className="h-5 w-5 text-[#4B97C9]" /> Activity
            </h2>
            <a
              href="#/user/blog/activity"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-[#4B97C9] hover:text-[#1B4965]"
            >
              All <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Bell className="mb-2 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 8).map((a) => {
                const meta = ACTIVITY_META[a.type]
                if (!meta) return null
                const src = resolveImg(a.actor_avatar)
                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                      a.is_read ? 'border border-[#f0f4f7] bg-white' : 'border border-[#cce0f0] bg-[#f0f7fd]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {src ? (
                        <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce8f0] text-[10px] font-bold text-[#1B4965]">
                          {(a.actor_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white ${meta.dot}`}
                      >
                        {meta.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] leading-snug text-gray-700">
                        <span className="font-semibold">{a.actor_name || 'Someone'}</span>{' '}
                        <span className="text-gray-500">{meta.label(a)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
