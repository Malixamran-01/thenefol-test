import React, { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Redirects unauthenticated users to the login page, preserving the intended destination.
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const current = window.location.hash || '#/user/'
      if (!current.startsWith('#/user/login') && !current.startsWith('#/user/signup')) {
        sessionStorage.setItem('post_login_redirect', current)
      }
      window.location.hash = '#/user/login'
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>
    return null
  }

  return <>{children}</>
}
