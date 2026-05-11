import React, { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { BanNotice } from './components/BanNotice'
import { DashboardTabBar } from './components/DashboardTabBar'
import {
  DashboardAuthorOnboardingPrompt,
  DashboardHeader,
  DashboardSignInPrompt,
} from './components/DashboardHeader'
import { useAuthorDashboard } from './hooks/useAuthorDashboard'
import { EarningsTab } from './tabs/EarningsTab'
import { GrowthTab } from './tabs/GrowthTab'
import { OverviewTab } from './tabs/OverviewTab'
import { PostsTab } from './tabs/PostsTab'
import { ProgramTab } from './tabs/ProgramTab'
import { padMonths } from './utils/format'
import type { ChartMetric, DashTab, SortKey } from './types'

export default function CreatorDashboardPage() {
  const { isAuthenticated } = useAuth()

  const { data, loading } = useAuthorDashboard(isAuthenticated)

  const [activeTab, setActiveTab] = useState<DashTab>('overview')
  const [sortKey, setSortKey] = useState<SortKey>('likes_count')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('likes')
  const [postFilter, setPostFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)

  const sortedPosts = useMemo(() => {
    if (!data) return []
    let list = [...data.posts]
    if (postFilter !== 'all') list = list.filter((p) => p.status === postFilter)
    list.sort((a, b) => {
      if (sortKey === 'created_at')
        return sortDir === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDir === 'desc'
        ? (b[sortKey] as number) - (a[sortKey] as number)
        : (a[sortKey] as number) - (b[sortKey] as number)
    })
    return list
  }, [data, sortKey, sortDir, postFilter])

  const topPosts = useMemo(
    () =>
      data
        ? [...data.posts]
            .filter((p) => p.status === 'approved')
            .sort(
              (a, b) =>
                b.likes_count +
                b.comments_count +
                b.views_count -
                (a.likes_count + a.comments_count + a.views_count)
            )
            .slice(0, 5)
        : [],
    [data]
  )

  const chartPoints = useMemo(() => {
    if (!data) return []
    if (chartMetric === 'likes')
      return padMonths(data.monthlyLikes, (d) => Number((d as { likes?: number }).likes ?? 0), 6)
    if (chartMetric === 'posts')
      return padMonths(data.monthlyPosts, (d) => Number((d as { post_count?: number }).post_count ?? 0), 6)
    return padMonths(data.monthlyFollowers, (d) => Number((d as { new_followers?: number }).new_followers ?? 0), 6)
  }, [data, chartMetric])

  const chartColor = chartMetric === 'likes' ? '#f43f5e' : chartMetric === 'posts' ? '#1B4965' : '#7c3aed'

  const approvedCount = useMemo(
    () => (data ? data.posts.filter((p) => p.status === 'approved').length : 0),
    [data]
  )
  const pendingCount = useMemo(
    () => (data ? data.posts.filter((p) => p.status === 'pending').length : 0),
    [data]
  )
  const postsToShow = showAll ? sortedPosts : sortedPosts.slice(0, 8)

  const toggleSort = useCallback((k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }, [sortKey])

  const copyLink = useCallback(() => {
    if (!data?.author) return
    const id = data.author.username ?? data.author.id
    const url = `${window.location.origin}/#/user/author/${id}`
    void (async () => {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        try {
          const ta = document.createElement('textarea')
          ta.value = url
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          /* ignore */
        }
      }
    })()
  }, [data?.author])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#4B97C9] border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <DashboardSignInPrompt />

  if (!data?.author) return <DashboardAuthorOnboardingPrompt />

  const { stats, drafts, recentActivity } = data

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">
      <DashboardHeader author={data.author} copied={copied} onCopyProfile={copyLink} />
      <BanNotice author={data.author} />
      <DashboardTabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <OverviewTab
          stats={stats}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          topPosts={topPosts}
          recentActivity={recentActivity}
        />
      ) : null}

      {activeTab === 'growth' ? (
        <GrowthTab
          chartMetric={chartMetric}
          onChartMetric={setChartMetric}
          chartPoints={chartPoints}
          chartColor={chartColor}
        />
      ) : null}

      {activeTab === 'posts' ? (
        <PostsTab
          drafts={drafts}
          sortedPosts={sortedPosts}
          postsToShow={postsToShow}
          sortKey={sortKey}
          sortDir={sortDir}
          postFilter={postFilter}
          showAll={showAll}
          onToggleSort={toggleSort}
          onPostFilter={setPostFilter}
          onToggleShowAll={() => setShowAll((s) => !s)}
        />
      ) : null}

      {activeTab === 'program' ? <ProgramTab /> : null}
      {activeTab === 'earnings' ? <EarningsTab /> : null}
    </div>
  )
}
