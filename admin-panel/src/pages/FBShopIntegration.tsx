import React, { useEffect, useMemo, useState } from 'react'

export default function FBShopIntegration() {
  const [config, setConfig] = useState({ page_id: '', access_token: '' })
  const [syncStats, setSyncStats] = useState<any | null>(null)
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [mapping, setMapping] = useState<{ [k: string]: string }>({ brand: 'Nefol', condition: 'new', availability: 'in stock' })
  const [lastRun, setLastRun] = useState<any>(null)
  const apiBase = (import.meta as any).env.VITE_API_URL || ''
  const headers = useMemo(()=>({ 'Content-Type': 'application/json' }), [])

  const saveConfig = async () => {
    const resp = await fetch('/api/fb-shop/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(config)
    })
    const data = await resp.json()
    if (data.success || data.data?.success) alert('Configuration saved')
  }

  const loadErrors = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/facebook/sync-errors')
      const data = await res.json()
      setErrors(data?.data || data || [])
    } finally { setLoading(false) }
  }

  const loadMapping = async () => {
    try {
      const res = await fetch('/api/facebook/field-mapping')
      const data = await res.json()
      const map = data?.data || data || {}
      setMapping((prev)=>({ ...prev, ...map }))
    } catch {}
  }

  const loadLastRun = async () => {
    try {
      const res = await fetch('/api/facebook/sync/last')
      const data = await res.json()
      setLastRun(data)
    } catch {}
  }

  useEffect(()=>{ loadErrors(); loadMapping(); loadLastRun() }, [])

  useEffect(()=>{
    let t: any
    const poll = async () => {
      if (!jobId) return
      const res = await fetch(`/api/facebook/sync/status/${jobId}`)
      const data = await res.json()
      setSyncStats(data?.data || data)
      if ((data?.data || data)?.running) {
        t = setTimeout(poll, 500)
      }
    }
    poll()
    return ()=> t && clearTimeout(t)
  }, [jobId])

  const startProducts = async () => {
    setSyncStats(null)
    setJobId(null)
    const res = await fetch('/api/facebook/sync-products', { method: 'POST', headers })
    const data = await res.json()
    const id = (data?.data || data)?.jobId
    setJobId(id)
  }

  const startStockPrice = async () => {
    setSyncStats(null)
    setJobId(null)
    const res = await fetch('/api/facebook/sync-stock-price', { method: 'POST', headers, body: JSON.stringify({}) })
    const data = await res.json()
    const id = (data?.data || data)?.jobId
    setJobId(id)
  }

  const clearErrors = async () => {
    await fetch('/api/facebook/sync-errors/clear', { method: 'POST' })
    await loadErrors()
  }

  const saveMapping = async () => {
    const res = await fetch('/api/facebook/field-mapping', { method: 'POST', headers, body: JSON.stringify(mapping) })
    const data = await res.json()
    if (!res.ok) return alert(data?.error || 'Failed to save mapping')
    alert('Mapping saved')
  }

  return (
    <div className="p-6 space-y-6">
      {lastRun && (
        <div className="mb-4 rounded p-3 bg-slate-100 text-sm text-gray-700">
          <b>Last auto-sync:</b> {lastRun.lastRun ? new Date(lastRun.lastRun).toLocaleString() : 'Never'}
          {lastRun.result && lastRun.result.error && (
            <span className="ml-3 text-red-700">Error: {lastRun.result.error}</span>
          )}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold mb-4">Facebook/Instagram Shop Integration</h1>
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">
            <strong>Note:</strong> Background sync with progress and a CSV feed are ready. Replace stubs with Graph API calls when credentials are finalized.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white rounded border">
            <h2 className="font-semibold mb-3">Configuration</h2>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Page ID</label>
              <input type="text" value={config.page_id} onChange={(e)=>setConfig({ ...config, page_id: e.target.value })} className="border p-2 rounded w-full" placeholder="Facebook Page ID" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input type="text" value={config.access_token} onChange={(e)=>setConfig({ ...config, access_token: e.target.value })} className="border p-2 rounded w-full" placeholder="Long-lived access token" />
            </div>
            <button onClick={saveConfig} className="px-4 py-2 bg-blue-600 text-white rounded">Save Configuration</button>

            <div className="mt-4 text-sm">
              <div>Catalog Feed URL:</div>
              <a className="text-blue-600 underline" href={`${apiBase}/api/facebook/catalog.csv`} target="_blank" rel="noreferrer">{apiBase || window.location.origin}/api/facebook/catalog.csv</a>
            </div>
          </div>

          <div className="p-4 bg-white rounded border">
            <h2 className="font-semibold mb-3">Sync Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={startProducts} className="px-4 py-2 bg-slate-900 text-white rounded">Sync All Products</button>
              <button onClick={startStockPrice} className="px-4 py-2 bg-indigo-600 text-white rounded">Sync Stock & Price</button>
            </div>
            {syncStats && (
              <div className="mt-4 p-3 bg-slate-50 rounded text-sm">
                <div className="mb-2">Job: {syncStats.id} ({syncStats.type})</div>
                <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                  <div className="bg-green-600 h-3" style={{ width: `${Math.min(100, Math.floor(((syncStats.success + syncStats.failed) / Math.max(1, syncStats.total)) * 100))}%` }} />
                </div>
                <div className="mt-2">{syncStats.success + syncStats.failed}/{syncStats.total} processed • Success: {syncStats.success} • Failed: {syncStats.failed} {syncStats.running ? '(running...)' : '(done)'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded border">
        <h2 className="font-semibold mb-3">Field Mapping</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Brand</label>
            <input className="input" value={mapping.brand || ''} onChange={e=>setMapping({ ...mapping, brand: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Condition</label>
            <input className="input" value={mapping.condition || ''} onChange={e=>setMapping({ ...mapping, condition: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Availability</label>
            <input className="input" value={mapping.availability || ''} onChange={e=>setMapping({ ...mapping, availability: e.target.value })} />
          </div>
        </div>
        <button onClick={saveMapping} className="mt-3 px-4 py-2 bg-slate-900 text-white rounded">Save Mapping</button>
      </div>

      <div className="p-4 bg-white rounded border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Sync Errors</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadErrors} className="px-3 py-1 border rounded">Refresh</button>
            <button onClick={clearErrors} className="px-3 py-1 bg-red-600 text-white rounded">Clear</button>
          </div>
        </div>
        {loading ? 'Loading...' : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Product ID</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Message</th>
                  <th className="py-2 pr-4">Payload</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e: any) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2 pr-4">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{e.product_id || '-'}</td>
                    <td className="py-2 pr-4">{e.code || '-'}</td>
                    <td className="py-2 pr-4">{e.message || '-'}</td>
                    <td className="py-2 pr-4"><pre className="whitespace-pre-wrap text-xs">{e.payload ? JSON.stringify(e.payload) : '-'}</pre></td>
                  </tr>
                ))}
                {errors.length === 0 && (
                  <tr><td className="py-2 pr-4" colSpan={5}>No errors</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

