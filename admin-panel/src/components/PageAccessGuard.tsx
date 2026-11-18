import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { canOpenAdminPage, firstAllowedAdminPage } from '../../../common/src/adminNav'

interface PageAccessGuardProps {
  children: React.ReactNode
}

/**
 * Route-level access, so a hidden sidebar page can't be opened by typing its URL.
 *
 * Staff with their own page list (Admin management) can open exactly those pages, as before.
 * Everyone else opens a page when their role grants its section (`nav:*`) or the page itself
 * (`nav:<section>:<page>`, see common/src/adminNav.ts). An empty page list means no pages.
 */
export default function PageAccessGuard({ children }: PageAccessGuardProps) {
  const { user, hasPageAccess, hasPermission } = useAuth()
  const location = useLocation()

  if (!user) {
    return <>{children}</>
  }

  if (user.isSuperAdmin || user.role === 'admin' || (user.roles?.includes('admin') ?? false)) {
    return <>{children}</>
  }

  const pp = user.pagePermissions
  if (pp !== null && pp !== undefined && pp.length === 0) {
    return <Navigate to="/loginasadmin/login?reason=no_pages" replace />
  }

  const hasPageList = pp !== null && pp !== undefined && pp.length > 0
  if (hasPageList) {
    if (hasPageAccess(location.pathname)) return <>{children}</>
    return <Navigate to="/loginasadmin/dashboard" replace />
  }

  if (canOpenAdminPage(hasPermission, location.pathname)) {
    return <>{children}</>
  }

  const fallback = firstAllowedAdminPage(hasPermission)
  if (fallback && fallback !== location.pathname) {
    return <Navigate to={fallback} replace />
  }

  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-lg font-semibold text-gray-900">No access to this page</h1>
      <p className="mt-2 text-sm text-gray-600">Ask an admin to give your role access to it in Team &amp; access → Roles &amp; permissions.</p>
    </div>
  )
}
