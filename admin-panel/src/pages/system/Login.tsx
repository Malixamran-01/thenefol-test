import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Role, useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [role, setRole] = useState<Role>('admin')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    // TODO integrate real backend auth; for now accept any input
    if (!email || !password) {
      setError('Email and password required')
      return
    }
    const success = await login(email, password)
    if (success) {
      const dest = location?.state?.from?.pathname || '/'
      navigate(dest, { replace: true })
    } else {
      setError('Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-primary mb-2">Nefol Admin</h1>
          <p className="text-gray-600">Sign in to your admin dashboard</p>
        </div>
        
        <form onSubmit={onSubmit} className="metric-card space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none" 
              placeholder="admin@nefol.com" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none" 
              placeholder="Enter your password" 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none" 
              value={role} 
              onChange={e=>setRole(e.target.value as Role)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          
          <button className="w-full btn-primary py-3">Sign In</button>
        </form>
      </div>
    </div>
  )
}
