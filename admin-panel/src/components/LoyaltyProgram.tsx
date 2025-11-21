import React, { useState, useEffect } from 'react'
import { Edit, Plus } from 'lucide-react'
import apiService from '../services/api'

interface LoyaltyProgram {
  id: number
  name: string
  description: string
  points_per_rupee: number
  referral_bonus: number
  vip_threshold: number
  status: string
  created_at: string
}

// Removed mock tier and referral interfaces; admin config is database-driven

export default function LoyaltyProgram() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_per_rupee: 1,
    referral_bonus: 100,
    vip_threshold: 1000,
    status: 'active'
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const data = await apiService.getLoyaltyPrograms()
      setPrograms(data as LoyaltyProgram[])
    } catch (error) {
      console.error('Failed to fetch loyalty programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await apiService.updateLoyaltyProgram(editId, formData)
      } else {
        await apiService.createLoyaltyProgram(formData)
      }
      setShowForm(false)
      setEditId(null)
      setFormData({
        name: '',
        description: '',
        points_per_rupee: 1,
        referral_bonus: 100,
        vip_threshold: 1000,
        status: 'active'
      })
      fetchPrograms()
    } catch (error) {
      console.error('Failed to save loyalty program:', error)
    }
  }

  const onEdit = (p: LoyaltyProgram) => {
    setFormData({
      name: p.name,
      description: p.description || '',
      points_per_rupee: p.points_per_rupee ?? 1,
      referral_bonus: p.referral_bonus ?? 0,
      vip_threshold: p.vip_threshold ?? 0,
      status: p.status || 'active'
    })
    setEditId(p.id)
    setShowForm(true)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Loyalty Program</h1>
        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) setEditId(null) }}
          className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" /> {showForm ? 'Close' : 'Add Program'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Points per ₹ (rupee)</label>
              <input
                type="number"
                step="0.01"
                value={formData.points_per_rupee}
                onChange={e => setFormData({ ...formData, points_per_rupee: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Referral Bonus (points)</label>
              <input
                type="number"
                value={formData.referral_bonus}
                onChange={e => setFormData({ ...formData, referral_bonus: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">VIP Threshold (points)</label>
              <input
                type="number"
                value={formData.vip_threshold}
                onChange={e => setFormData({ ...formData, vip_threshold: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              {editId ? 'Update' : 'Create'} Program
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Configured Programs</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {loading ? (
            <div className="p-4 text-slate-600 dark:text-slate-300">Loading...</div>
          ) : programs.length === 0 ? (
            <div className="p-4 text-slate-600 dark:text-slate-300">No programs configured.</div>
          ) : (
            programs.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Points/₹: {p.points_per_rupee ?? 1} · Referral Bonus: {p.referral_bonus ?? 0} · VIP Threshold: {p.vip_threshold ?? 0} · Status: {p.status}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(p)}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
