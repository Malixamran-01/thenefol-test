import React, { useEffect, useState } from 'react'
import { Clapperboard } from 'lucide-react'
import {
  getCreatorProgramSidebarEnabled,
  NEFOL_SOCIAL_SETTINGS_CHANGE,
  setCreatorProgramSidebarEnabled,
} from '../utils/nefolSocialSettings'

export default function NefolSocialSettings() {
  const [creatorProgramInSidebar, setCreatorProgramInSidebar] = useState(() =>
    getCreatorProgramSidebarEnabled()
  )

  useEffect(() => {
    const sync = () => setCreatorProgramInSidebar(getCreatorProgramSidebarEnabled())
    window.addEventListener('storage', sync)
    window.addEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    }
  }, [])

  const toggleCreatorProgram = () => {
    const next = !creatorProgramInSidebar
    setCreatorProgramInSidebar(next)
    setCreatorProgramSidebarEnabled(next)
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
          Control what appears in your NEFOL Social side panel.
        </p>
      </header>

      <section
        className="rounded-2xl border border-[#e8eef4] bg-white shadow-sm overflow-hidden"
        aria-labelledby="creator-program-settings-heading"
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
              <h2 id="creator-program-settings-heading" className="text-base font-semibold text-[#1B4965]">
                Creator Program
              </h2>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                When enabled, <strong className="font-medium text-gray-800">Creator Program</strong> appears in the
                side panel so you can open Collab, Affiliate, and Revenue. It stays hidden until you turn this on.
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
