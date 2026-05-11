import React, { useEffect, useState } from 'react'
import {
  ChevronRight,
  Clapperboard,
  Eye,
  Heart,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { getApiBase } from '../../../utils/apiBase'

const VIEWS_GOAL = 10000
const LIKES_GOAL = 500

export function ProgramTab() {
  const { user, isAuthenticated } = useAuth()
  const [collabStatus, setCollabStatus] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`${getApiBase()}/api/collab/status?email=${encodeURIComponent(user.email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setCollabStatus(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.email])

  const views = Number(collabStatus?.totalViews ?? 0)
  const likes = Number(collabStatus?.totalLikes ?? 0)
  const viewsPct = Math.min(100, Math.round((views / VIEWS_GOAL) * 100))
  const likesPct = Math.min(100, Math.round((likes / LIKES_GOAL) * 100))
  const isApproved = collabStatus?.status === 'approved'
  const isApplied = !!collabStatus?.status
  const affiliateUnlocked = collabStatus?.affiliateUnlocked

  const level = affiliateUnlocked ? 'Partner' : isApproved ? 'Creator' : 'Explorer'
  const levelColor = affiliateUnlocked
    ? 'text-[#1B4965] bg-[#edf4f9]'
    : isApproved
      ? 'text-emerald-700 bg-emerald-50'
      : 'text-gray-500 bg-gray-100'

  return (
    <div className="pb-20">
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4965] via-[#2563a0] to-[#4B97C9] p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
              <Trophy className="h-3 w-3" /> {level}
            </div>
            <h2 className="text-xl font-black text-white">Creator Program</h2>
            <p className="mt-1 text-[13px] text-blue-200">
              {affiliateUnlocked
                ? "You've unlocked affiliate earnings. Visit Earnings to manage it."
                : isApproved
                  ? "You're approved! Hit 10K views & 500 likes on eligible reels to unlock affiliate."
                  : 'Complete your application to start your creator journey.'}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Clapperboard className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#4B97C9] border-t-transparent" />
        </div>
      ) : (
        <>
          {isApproved && !affiliateUnlocked ? (
            <div className="mb-6 rounded-2xl border border-[#d0e8f5] bg-white p-5 shadow-sm">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Affiliate Progress</p>
              <div className="space-y-4">
                {[
                  {
                    label: 'Views',
                    val: views,
                    goal: VIEWS_GOAL,
                    pct: viewsPct,
                    icon: <Eye className="h-4 w-4 text-[#4B97C9]" />,
                  },
                  {
                    label: 'Likes',
                    val: likes,
                    goal: LIKES_GOAL,
                    pct: likesPct,
                    icon: <Heart className="h-4 w-4 text-rose-400" />,
                  },
                ].map(({ label, val, goal, pct, icon }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                        {icon}
                        {label}
                      </span>
                      <span className="text-[12px] text-gray-500">
                        {val.toLocaleString()} / {goal.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4B97C9] to-[#1B4965] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-gray-400">{pct}% complete</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-6 rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f9]">
                  <ShieldCheck className="h-5 w-5 text-[#1B4965]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">
                    {affiliateUnlocked
                      ? 'Affiliate Unlocked'
                      : isApproved
                        ? 'Collab Approved'
                        : isApplied
                          ? 'Application Pending'
                          : 'Not Applied Yet'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {affiliateUnlocked
                      ? 'Check the Earnings tab to activate your dashboard'
                      : isApproved
                        ? 'Hit milestones above to unlock affiliate earnings'
                        : isApplied
                          ? 'Your application is under review by the team'
                          : 'Apply now to join the Creator Program'}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${levelColor}`}
              >
                {level}
              </span>
            </div>
          </div>

          <a
            href="#/user/collab"
            className="flex w-full items-center justify-between rounded-2xl border border-[#d0e8f5] bg-[#f0f7fc] px-5 py-4 transition hover:border-[#4B97C9] hover:bg-[#e8f2f9]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4965]">
                <Clapperboard className="h-4 w-4 text-white" />
              </div>
              <span className="text-[13px] font-semibold text-[#1B4965]">
                {isApplied ? 'View Creator Program' : 'Apply for Creator Program'}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#4B97C9]" />
          </a>
        </>
      )}
    </div>
  )
}
