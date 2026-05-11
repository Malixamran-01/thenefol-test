import React from 'react'
import { TrendingUp } from 'lucide-react'
import { AreaChart } from '../components/AreaChart'
import type { ChartMetric } from '../types'

type Props = {
  chartMetric: ChartMetric
  onChartMetric: (m: ChartMetric) => void
  chartPoints: { month: string; value: number }[]
  chartColor: string
}

export function GrowthTab({ chartMetric, onChartMetric, chartPoints, chartColor }: Props) {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Growth</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-lg font-black text-gray-900">
              <TrendingUp className="h-5 w-5 text-[#1B4965]" /> Overview
              <span className="text-[12px] font-normal text-gray-400">— last 6 months</span>
            </h2>
          </div>
          <div className="flex gap-1 rounded-2xl border border-[#e8eef4] bg-white p-1 shadow-sm">
            {(
              [
                ['likes', 'Likes', '#f43f5e'],
                ['posts', 'Posts', '#1B4965'],
                ['followers', 'Followers', '#7c3aed'],
              ] as const
            ).map(([key, label, color]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChartMetric(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  chartMetric === key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 shadow-sm">
          <AreaChart points={chartPoints} color={chartColor} h={150} />
        </div>
      </section>
    </div>
  )
}
