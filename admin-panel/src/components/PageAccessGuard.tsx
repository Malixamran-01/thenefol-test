import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface PageAccessGuardProps {
  children: React.ReactNode
}

/**
 * Component to protect routes based on page permissions
 * If user has pagePermissions assigned, only allow access to those pages
 * If no pagePermissions, allow all pages (super admin)
 */
export default function PageAccessGuard({ children }: PageAccessGuardProps) {
  const { user, hasPageAccess } = useAuth()
  const location = useLocation()

  // If no user, let ProtectedRoute handle it
  if (!user) {
    return <>{children}</>
  }

  // If user has pagePermissions assigned, check access
  const hasPagePerms = user.pagePermissions && user.pagePermissions.length > 0
  
  if (hasPagePerms) {
    // Limited admin - check if they have access to this page
    if (!hasPageAccess(location.pathname)) {
      // Redirect to dashboard if they don't have access
      return <Navigate to="/admin/dashboard" replace />
    }
  }
  
  // Super admin or has access - allow
  return <>{children}</>
}

