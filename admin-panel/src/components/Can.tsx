import React from 'react'
import { useAuth } from '../contexts/AuthContext'

type CanProps = {
  permission?: string
  anyOf?: string[]
  role?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function Can({ permission, anyOf, role, children, fallback = null }: CanProps) {
  const { hasPermission, hasRole } = useAuth()

  let allowed = true
  if (role) allowed = allowed && hasRole(role)
  if (permission) allowed = allowed && hasPermission(permission)
  if (Array.isArray(anyOf) && anyOf.length > 0) {
    allowed = allowed && anyOf.some(p => hasPermission(p))
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}


