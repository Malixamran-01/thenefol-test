import React from 'react'
import {
  Clapperboard,
  DollarSign,
  FileText,
  LayoutDashboard,
  TrendingUp,
} from 'lucide-react'
import type { DashTab } from '../types'

const TABS: { key: DashTab; icon: React.ReactNode; label: string; short?: string }[] = [
  { key: 'overview', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Overview' },
  { key: 'posts', icon: <FileText className="h-4 w-4" />, label: 'Posts' },
  { key: 'growth', icon: <TrendingUp className="h-4 w-4" />, label: 'Growth' },
  { key: 'program', icon: <Clapperboard className="h-4 w-4" />, label: 'Program', short: 'Program' },
  { key: 'earnings', icon: <DollarSign className="h-4 w-4" />, label: 'Earnings', short: 'Earn' },
]

type Props = {
  active: DashTab
  onChange: (t: DashTab) => void
}

export function DashboardTabBar({ active, onChange }: Props) {
  return (
    <div className="mb-8 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map(({ key, icon, label, short }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors sm:px-4 ${
            active === key
              ? 'border-[#1B4965] text-[#1B4965]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{short ?? label}</span>
        </button>
      ))}
    </div>
  )
}
