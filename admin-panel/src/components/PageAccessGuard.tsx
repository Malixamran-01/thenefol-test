import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface PageAccessGuardProps {
  children: React.ReactNode
}

/**
 * Route-level access: unrestricted (null / undefined pagePermissions), allowlisted paths,
 * or explicit empty list (no pages — signed-in users are redirected away).
 */
export default function PageAccessGuard({ children }: PageAccessGuardProps) {
  const { user, hasPageAccess } = useAuth()
  const location = useLocation()

  if (!user) {
    return <>{children}</>
  }

  if (user.isSuperAdmin || user.role === 'admin' || (user.roles?.includes('admin') ?? false)) {
    return <>{children}</>
  }

  const pp = user.pagePermissions
  if (pp !== null && pp !== undefined && pp.length === 0) {
    return <Navigate to="/admin/login?reason=no_pages" replace />
  }

  if (pp !== null && pp !== undefined && pp.length > 0 && !hasPageAccess(location.pathname)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}

