import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  HelpCircle,
  ShieldOff,
} from 'lucide-react'
import {
  getCreatorProgramSidebarEnabled,
  NEFOL_SOCIAL_SETTINGS_CHANGE,
  setCreatorProgramSidebarEnabled,
} from '../utils/nefolSocialSettings'

type SettingsView = 'list' | 'creator-program'

function parseViewFromHash(): SettingsView {
  const raw = window.location.hash || ''
  const queryPart = raw.includes('?') ? raw.split('?')[1] : ''
  const q = new URLSearchParams(queryPart)
  return q.get('view') === 'creator-program' ? 'creator-program' : 'list'
}

export default function NefolSocialSettings() {
  const [view, setView] = useState<SettingsView>(parseViewFromHash)
  const [creatorProgramInSidebar, setCreatorProgramInSidebar] = useState(() =>
    getCreatorProgramSidebarEnabled()
  )
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)

  const syncFromStorage = useCallback(() => {
    setCreatorProgramInSidebar(getCreatorProgramSidebarEnabled())
  }, [])

  useEffect(() => {
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, syncFromStorage as EventListener)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, syncFromStorage as EventListener)
    }
  }, [syncFromStorage])

  useEffect(() => {
    const onHash = () => setView(parseViewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goList = () => {
    window.location.hash = '#/user/blog/settings'
  }

  const goCreatorProgram = () => {
    window.location.hash = '#/user/blog/settings?view=creator-program'
  }

  const optIn = () => {
    setCreatorProgramInSidebar(true)
    setCreatorProgramSidebarEnabled(true)
  }

  const optOutMenu = () => {
    setCreatorProgramInSidebar(false)
    setCreatorProgramSidebarEnabled(false)
  }

  if (view === 'creator-program') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <button
          type="button"
          onClick={goList}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#1B4965] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>

        <header className="mb-8 flex gap-4 items-start">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border border-[#d6eaf8] bg-[#f0f8fd]"
            aria-hidden
          >
            <Clapperboard className="h-6 w-6" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
          </div>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-light tracking-[0.06em]"
              style={{ fontFamily: 'var(--font-heading-family)', color: '#1B4965' }}
            >
              Creator Program
            </h1>
            <p className="mt-2 text-sm text-gray-500 font-light tracking-wide leading-relaxed">
              Collab, Affiliate, and Revenue — opt in here to show the program in your side panel, then open it when
              you are ready.
            </p>
          </div>
        </header>

        {/* Primary opt-in / status */}
        <section className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-5 sm:px-6 py-6 sm:py-8">
            {!creatorProgramInSidebar ? (
              <>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  The Creator Program is <strong className="text-gray-800">hidden from your menu</strong> until you
                  turn it on. You can change this anytime.
                </p>
                <button
                  type="button"
                  onClick={optIn}
                  className="w-full sm:w-auto min-w-[220px] rounded-xl bg-[#1B4965] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#163d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B97C9] focus-visible:ring-offset-2"
                >
                  Turn on Creator Program in the menu
                </button>
                <p className="mt-3 text-xs text-gray-400">This only controls the side panel link — it does not enroll you automatically.</p>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 mb-5">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden />
                  <p className="text-sm text-emerald-900">
                    <strong className="font-semibold">Creator Program is on</strong> in your side panel. Use the menu or
                    the button below to open it.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <a
                    href="#/user/collab"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4965] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#163d54]"
                  >
                    Open Creator Program
                    <ExternalLink className="h-4 w-4 opacity-90" />
                  </a>
                  <button
                    type="button"
                    onClick={optOutMenu}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Stop showing in the menu
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* More options */}
        <section aria-labelledby="creator-more-heading">
          <h2 id="creator-more-heading" className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            More options
          </h2>
          <div className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm divide-y divide-[#eef2f7] overflow-hidden">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/user/collab'
              }}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80"
            >
              <span className="text-sm font-medium text-gray-800">Review program &amp; terms</span>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setLeaveModalOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <ShieldOff className="h-4 w-4 text-gray-400" />
                Stop participating / leave the program
              </span>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>

            <a
              href="#/user/faq"
              className="flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <HelpCircle className="h-4 w-4 text-gray-400" />
                Help &amp; FAQ
              </span>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            Ideas we may add later: email updates about milestones, pausing your application, or linking payout
            preferences — tell us what you need in support.
          </p>
        </section>

        {leaveModalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-dialog-title"
            onClick={() => setLeaveModalOpen(false)}
          >
            <div
              className="max-w-md w-full rounded-2xl bg-white shadow-xl border border-gray-100 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="leave-dialog-title" className="text-lg font-semibold text-[#1B4965]">
                Leave or stop participating?
              </h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Hiding the menu link does not cancel an existing application or partnership. To withdraw an application,
                pause collab activity, or close affiliate access, please contact NEFOL support with your registered
                email so we can help safely.
              </p>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                You can also use <strong className="font-medium text-gray-800">Stop showing in the menu</strong> above
                if you only want to tidy your sidebar.
              </p>
              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                >
                  Close
                </button>
                <a
                  href="#/user/contact"
                  onClick={() => setLeaveModalOpen(false)}
                  className="inline-flex justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#1B4965] hover:bg-[#163d54]"
                >
                  Contact support
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── Settings home (list) ── */
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
          Manage NEFOL Social — start with Creator Program below.
        </p>
      </header>

      <nav aria-label="Settings sections">
        <button
          type="button"
          onClick={goCreatorProgram}
          className="w-full rounded-2xl border border-[#e8eef4] bg-white shadow-sm px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4 text-left transition-colors hover:border-[#d6eaf8] hover:bg-[#fafcfd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B97C9] focus-visible:ring-offset-2"
        >
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-[#d6eaf8] bg-[#f0f8fd]"
            aria-hidden
          >
            <Clapperboard className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-[#1B4965]">Creator Program</p>
            <p className="mt-0.5 text-sm text-gray-500">
              Opt in to the menu, open Collab &amp; Affiliate, or hide the shortcut
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
        </button>
      </nav>
    </div>
  )
}
