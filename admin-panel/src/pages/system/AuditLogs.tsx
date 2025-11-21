import React, { useEffect, useState } from 'react'

type Log = { id: number; staff_id?: number; action?: string; details?: any; created_at: string }

export default function AuditLogs() {
  const getApiBase = () => {
    if ((import.meta as any).env.VITE_API_URL) return (import.meta as any).env.VITE_API_URL
    const host = (import.meta as any).env.VITE_BACKEND_HOST || (import.meta as any).env.VITE_API_HOST || 'localhost'
    const port = (import.meta as any).env.VITE_BACKEND_PORT || (import.meta as any).env.VITE_API_PORT || '4000'
    return `http://${host}:${port}`
  }
  const apiBase = getApiBase()
  const [logs, setLogs] = useState<Log[]>([])
  const [staffId, setStaffId] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (staffId) params.set('staff_id', staffId)
      if (action) params.set('action', action)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`${apiBase}/api/staff/activity?${params.toString()}`)
      const data = await res.json()
      setLogs(data?.data || data || [])
    } catch (_) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="metric-card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input" placeholder="Staff ID" value={staffId} onChange={e=>setStaffId(e.target.value)} />
          <input className="input" placeholder="Action contains" value={action} onChange={e=>setAction(e.target.value)} />
          <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
          <button className="btn-primary" onClick={load}>Apply Filters</button>
        </div>
      </div>
      <div className="metric-card">
        {loading ? 'Loading...' : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Staff</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2 pr-4">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{l.staff_id || '-'}</td>
                    <td className="py-2 pr-4">{l.action || '-'}</td>
                    <td className="py-2 pr-4">
                      <pre className="text-xs whitespace-pre-wrap">{l.details ? JSON.stringify(l.details) : '-'}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


