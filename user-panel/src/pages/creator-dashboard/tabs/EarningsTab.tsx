import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  DollarSign,
  Percent,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { getApiBase } from '../../../utils/apiBase'

export function EarningsTab() {
  const { user, isAuthenticated } = useAuth()
  const [appStatus, setAppStatus] = useState<{ status?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setLoading(false)
      return
    }
    let cancelled = false
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    fetch(`${getApiBase()}/api/affiliate/application-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setAppStatus(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.email])

  const statusLabel: Record<string, string> = {
    pending: 'Under Review',
    approved: 'Approved',
    rejected: 'Not Approved',
  }
  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <div className="pb-20">
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B4965] via-[#2d6688] to-[#4B97C9] p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Earnings</h2>
            <p className="mt-1 text-[13px] text-blue-200">Your affiliate earnings and referral program</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#4B97C9] border-t-transparent" />
        </div>
      ) : (
        <>
          {appStatus?.status ? (
            <div className="mb-6 rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f9]">
                    <Percent className="h-5 w-5 text-[#1B4965]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">Affiliate Application</p>
                    <p className="text-[11px] text-gray-500">
                      {appStatus.status === 'approved'
                        ? 'Your affiliate dashboard is ready'
                        : appStatus.status === 'pending'
                          ? 'Submitted — the team is reviewing your application'
                          : 'Your application was not approved at this time'}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusColor[appStatus.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}
                >
                  {statusLabel[appStatus.status] ?? appStatus.status}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: <CircleDollarSign className="h-5 w-5 text-emerald-600" />,
                bg: 'bg-emerald-50',
                title: 'Earn Commissions',
                desc: 'Get rewarded every time someone purchases through your referral link.',
              },
              {
                icon: <Users className="h-5 w-5 text-[#4B97C9]" />,
                bg: 'bg-[#edf4f9]',
                title: 'Track Referrals',
                desc: 'See exactly how many readers signed up through your link.',
              },
              {
                icon: <BarChart3 className="h-5 w-5 text-purple-600" />,
                bg: 'bg-purple-50',
                title: 'Performance Stats',
                desc: 'Clicks, conversions, and earnings — all in one place.',
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-[#1B4965]" />,
                bg: 'bg-[#edf4f9]',
                title: 'Tiered Rewards',
                desc: 'Unlock higher commission rates as your referrals grow.',
              },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-[#e8eef4] bg-white p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="#/user/collab?tab=revenue"
            className="flex w-full items-center justify-between rounded-2xl border border-[#d0e8f5] bg-[#f0f7fc] px-5 py-4 transition hover:border-[#4B97C9] hover:bg-[#e8f2f9]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4965]">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-[13px] font-semibold text-[#1B4965]">Open Earnings Dashboard</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#4B97C9]" />
          </a>
        </>
      )}
    </div>
  )
}
