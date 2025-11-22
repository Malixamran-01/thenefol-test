import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<{ ordersToday: number; revenue: number; newCustomers: number }>({ ordersToday: 0, revenue: 0, newCustomers: 0 })
  const [trend, setTrend] = useState<Array<{ date: string; orders: number; revenue: number }>>([])
  const apiBase = (import.meta as any).env.VITE_API_URL || `https://thenefol.com/api`

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, tRes] = await Promise.all([
          fetch(`${apiBase}/api/metrics`),
          fetch(`${apiBase}/api/metrics/trend`)
        ])
        const m = await mRes.json()
        const t = await tRes.json()
        setMetrics(m)
        setTrend(t)
      } catch (_) {}
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="mb-2 text-lg font-semibold">Dashboard</h2>
        <p className="text-white/80">Overview of metrics and quick links.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Orders Today" value={String(metrics.ordersToday)} />
        <Card title="Revenue" value={`₹${metrics.revenue.toFixed(2)}`} />
        <Card title="New Customers" value={String(metrics.newCustomers)} />
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 font-semibold">7-day Trend</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/70">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Orders</th>
                <th className="py-2 pr-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trend.map(r => (
                <tr key={r.date} className="border-b border-white/5">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 pr-4">{r.orders}</td>
                  <td className="py-2 pr-4">₹{r.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}


