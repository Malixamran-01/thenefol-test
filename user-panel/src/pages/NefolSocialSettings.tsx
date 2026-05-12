import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Heart,
  Landmark,
  Shield,
} from 'lucide-react'
import PayoutMethodSettings from '../components/PayoutMethodSettings'
import {
  getCreatorProgramSidebarEnabled,
  getSocialInterests,
  NEFOL_SOCIAL_SETTINGS_CHANGE,
  setCreatorProgramSidebarEnabled,
  setSocialInterests,
  SOCIAL_INTEREST_OPTIONS,
} from '../utils/nefolSocialSettings'
import { NEFOL_HASH_ROUTE_CHANGE } from '../utils/hashRouteEvents'

type SettingsView = 'list' | 'creator-program' | 'interests' | 'payout'

function parseViewFromHash(): SettingsView {
  const raw = window.location.hash || ''
  const queryPart = raw.includes('?') ? raw.split('?')[1] : ''
  const q = new URLSearchParams(queryPart)
  const v = q.get('view')
  if (v === 'creator-program') return 'creator-program'
  if (v === 'interests') return 'interests'
  if (v === 'payout') return 'payout'
  return 'list'
}

function SettingsListRow({
  icon,
  title,
  subtitle,
  onClick,
  href,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  href?: string
}) {
  const className =
    'w-full rounded-2xl border border-[#e8eef4] bg-white shadow-sm px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4 text-left transition-colors hover:border-[#d6eaf8] hover:bg-[#fafcfd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B97C9] focus-visible:ring-offset-2'

  const inner = (
    <>
      <div
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-[#d6eaf8] bg-[#f0f8fd] text-[#4B97C9]"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[#1B4965]">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
    </>
  )

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

export default function NefolSocialSettings() {
  const [view, setView] = useState<SettingsView>(parseViewFromHash)
  const [creatorProgramInSidebar, setCreatorProgramInSidebar] = useState(() =>
    getCreatorProgramSidebarEnabled()
  )
  const [interests, setInterestsState] = useState<string[]>(() => getSocialInterests())

  useEffect(() => {
    const sync = () => {
      setCreatorProgramInSidebar(getCreatorProgramSidebarEnabled())
      setInterestsState(getSocialInterests())
    }
    window.addEventListener('storage', sync)
    window.addEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    }
  }, [])

  useEffect(() => {
    const onRoute = () => {
      setView((prev) => {
        const next = parseViewFromHash()
        return prev === next ? prev : next
      })
    }
    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, onRoute)
  }, [])

  const goSettingsHome = () => {
    window.location.hash = '#/user/blog/settings'
  }

  const toggleCreatorProgram = () => {
    const next = !creatorProgramInSidebar
    setCreatorProgramInSidebar(next)
    setCreatorProgramSidebarEnabled(next)
  }

  const toggleInterest = (id: string) => {
    const next = interests.includes(id) ? interests.filter((x) => x !== id) : [...interests, id]
    setInterestsState(next)
    setSocialInterests(next)
  }

  if (view === 'creator-program') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <button
          type="button"
          onClick={goSettingsHome}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#1B4965] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>

        <header className="mb-8">
          <h1
            className="text-2xl sm:text-3xl font-light tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-heading-family)', color: '#1B4965' }}
          >
            Creator Program
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-light tracking-wide">
            Show or hide the Creator Program link in the NEFOL Social side panel.
          </p>
        </header>

        <section
          className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm overflow-hidden"
          aria-labelledby="creator-program-sidebar-heading"
        >
          <div className="px-5 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-4 min-w-0">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-[#d6eaf8] bg-[#f0f8fd]"
                aria-hidden
              >
                <Clapperboard className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
              </div>
              <div className="min-w-0">
                <h2 id="creator-program-sidebar-heading" className="text-base font-semibold text-[#1B4965]">
                  Show in side panel
                </h2>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                  When enabled, <strong className="font-medium text-gray-800">Creator Program</strong> appears in the
                  side panel so you can open Collab, Affiliate, and Revenue.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={creatorProgramInSidebar}
              aria-label="Show Creator Program in side panel"
              onClick={toggleCreatorProgram}
              className={`relative flex-shrink-0 inline-flex h-8 w-[52px] items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B97C9] focus-visible:ring-offset-2 ${
                creatorProgramInSidebar ? 'bg-[#1B4965]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                  creatorProgramInSidebar ? 'translate-x-[26px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (view === 'payout') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <button
          type="button"
          onClick={goSettingsHome}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#1B4965] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>

        <header className="mb-6">
          <h1
            className="text-2xl sm:text-3xl font-light tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-heading-family)', color: '#1B4965' }}
          >
            Payout method
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-light tracking-wide leading-relaxed">
            Bank account or UPI where we send money when you redeem Nefol coins (affiliate earnings, referrals, and blog
            rewards). Same details are used for withdrawal requests.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm p-5 sm:p-6">
          <PayoutMethodSettings />
        </section>
      </div>
    )
  }

  if (view === 'interests') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <button
          type="button"
          onClick={goSettingsHome}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#1B4965] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>

        <header className="mb-6">
          <h1
            className="text-2xl sm:text-3xl font-light tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-heading-family)', color: '#1B4965' }}
          >
            Manage interests
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-light tracking-wide leading-relaxed">
            Choose topics you care about. We use this to tune what we may highlight in NEFOL Social over time.
          </p>
        </header>

        <section
          className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm p-5 sm:p-6"
          aria-label="Content interests"
        >
          <div className="flex flex-wrap gap-2">
            {SOCIAL_INTEREST_OPTIONS.map((opt) => {
              const on = interests.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleInterest(opt.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                    on
                      ? 'border-[#1B4965] bg-[#1B4965] text-white'
                      : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="mt-5 text-xs text-gray-400 leading-relaxed">
            Saved on this device only. Sign in across devices may sync more preferences in the future.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
      <header className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-light tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-heading-family)', color: '#1B4965' }}
        >
          Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-light tracking-wide">
          NEFOL Social preferences, interests, and links to your account tools.
        </p>
      </header>

      <nav aria-label="Settings sections" className="flex flex-col gap-3">
        <SettingsListRow
          icon={<Clapperboard className="h-5 w-5" strokeWidth={1.75} />}
          title="Creator Program"
          subtitle="Show the program in the side panel"
          onClick={() => {
            window.location.hash = '#/user/blog/settings?view=creator-program'
          }}
        />
        <SettingsListRow
          icon={<Heart className="h-5 w-5" strokeWidth={1.75} />}
          title="Manage interests"
          subtitle="Topics and content you want to see more of"
          onClick={() => {
            window.location.hash = '#/user/blog/settings?view=interests'
          }}
        />
        <SettingsListRow
          icon={<Landmark className="h-5 w-5" strokeWidth={1.75} />}
          title="Payout method"
          subtitle="Bank or UPI for affiliate and coin redemptions"
          onClick={() => {
            window.location.hash = '#/user/blog/settings?view=payout'
          }}
        />
        <SettingsListRow
          icon={<CreditCard className="h-5 w-5" strokeWidth={1.75} />}
          title="Payment methods"
          subtitle="Saved cards for shopping on NEFOL"
          href="#/user/payment-methods"
        />
        <SettingsListRow
          icon={<Shield className="h-5 w-5" strokeWidth={1.75} />}
          title="Privacy & safety"
          subtitle="Password, data, and security"
          href="#/user/privacy-security"
        />
        <SettingsListRow
          icon={<Bell className="h-5 w-5" strokeWidth={1.75} />}
          title="Notifications"
          subtitle="Alerts, email, and push preferences"
          href="#/user/notifications"
        />
      </nav>
    </div>
  )
}
