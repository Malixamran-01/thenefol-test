import React, { lazy, Suspense } from 'react'
import { CREATOR_DASHBOARD_IMPL_STUB } from '../routeShellIsolation'

/**
 * Thin entry: keeps `CREATOR_DASHBOARD_IMPL_STUB` from loading `CreatorDashboardImpl` chunk at all.
 * `App.tsx` must lazy-import this file so the dashboard graph is not evaluated on initial app load.
 */
const CreatorDashboardImpl = lazy(() => import('./CreatorDashboardImpl'))

export default function CreatorDashboard() {
  if (CREATOR_DASHBOARD_IMPL_STUB) {
    return (
      <div
        className="p-6 text-center text-base text-slate-800"
        data-creator-dashboard-impl-stub
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        CreatorDashboard impl stub (step 1 — impl chunk not loaded)
      </div>
    )
  }
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading…</div>}>
      <CreatorDashboardImpl />
    </Suspense>
  )
}
