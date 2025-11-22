import React, { useState, useEffect } from 'react'

interface Warehouse {
  id: number
  name: string
  address: any
  is_active: boolean
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: {} })

  const fetchWarehouses = async () => {
    const resp = await fetch('/api/warehouses')
    const data = await resp.json()
    if (data.success) setWarehouses(data.data)
  }

  const createWarehouse = async () => {
    const resp = await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWarehouse)
    })
    const data = await resp.json()
    if (data.success) {
      alert('Warehouse created')
      setNewWarehouse({ name: '', address: {} })
      fetchWarehouses()
    }
  }

  useEffect(() => {
    fetchWarehouses()
  }, [])

  return (
    <div className="p-6 space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div>
        <h1 
          className="text-3xl font-light mb-2 tracking-[0.15em]" 
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
            letterSpacing: '0.15em'
          }}
        >
          Warehouse Management
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Manage your warehouse locations and inventory
        </p>
      </div>
      
      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>Add Warehouse</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newWarehouse.name}
            onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
            placeholder="Warehouse name"
            className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)] flex-1"
            style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
          />
          <button onClick={createWarehouse} className="btn-primary">
            Create Warehouse
          </button>
        </div>
      </div>

      <div className="metric-card">
        <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}>All Warehouses</h2>
        {warehouses.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No warehouses</p>
        ) : (
          <div className="space-y-3">
            {warehouses.map(w => (
              <div key={w.id} className="border p-4 rounded-xl transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}><strong>{w.name}</strong></p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{w.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

