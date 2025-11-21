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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Warehouse Management</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Add Warehouse</h2>
        <input
          type="text"
          value={newWarehouse.name}
          onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
          placeholder="Warehouse name"
          className="border p-2 rounded mr-2"
        />
        <button onClick={createWarehouse} className="px-4 py-2 bg-blue-500 text-white rounded">
          Create Warehouse
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">All Warehouses</h2>
        {warehouses.length === 0 ? (
          <p className="text-gray-500">No warehouses</p>
        ) : (
          <div className="space-y-2">
            {warehouses.map(w => (
              <div key={w.id} className="border p-3 rounded">
                <p><strong>{w.name}</strong></p>
                <p className="text-sm text-gray-500">{w.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

