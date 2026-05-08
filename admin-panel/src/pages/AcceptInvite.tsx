import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '../utils/apiUrl'

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const apiBase = getApiBaseUrl()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Invitation link is missing a token.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/staff/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: form.name, password: form.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Something went wrong')
        return
      }
      navigate('/admin/login?invited=1')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">Set up your staff account</h1>
        {!token && (
          <p className="text-sm text-red-600 text-center">This invite link is invalid. Request a new invitation.</p>
        )}
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Your name"
            value={form.name}
            required
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Password (min 8 characters)"
            value={form.password}
            required
            minLength={8}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Confirm password"
            value={form.confirm}
            required
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Setting up…' : 'Accept & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
