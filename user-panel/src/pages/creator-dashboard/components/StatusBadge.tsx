import React from 'react'

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }
  const labels: Record<string, string> = { approved: 'Published', pending: 'Pending', rejected: 'Rejected' }
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}
    >
      {labels[status] ?? status}
    </span>
  )
}
