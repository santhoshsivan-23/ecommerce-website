import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { PageLoader } from '@/components/ui/Spinner'
import type { Role } from '@/types'

interface ProtectedRouteProps {
  /** Roles allowed through. Omit to allow any signed-in user. */
  roles?: Role[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, initialising } = useAppSelector((state) => state.auth)
  const location = useLocation()

  // Wait for the stored token to be verified before deciding to redirect.
  if (initialising) return <PageLoader label="Checking your session…" />

  if (!user) {
    const loginTarget = roles?.includes('admin')
      ? '/admin/login'
      : roles?.includes('seller')
        ? '/seller/login'
        : '/login'
    return <Navigate to={loginTarget} state={{ from: location.pathname + location.search }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}

/** Keeps signed-in users away from public customer login/register screens. */
export function GuestRoute() {
  const { user, initialising } = useAppSelector((state) => state.auth)

  if (initialising) return <PageLoader label="Checking your session…" />
  if (user) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}

/** Dedicated guest route for Admin auth pages (/admin/login, /admin/register). */
export function AdminGuestRoute() {
  const { user, initialising } = useAppSelector((state) => state.auth)

  if (initialising) return <PageLoader label="Checking your session…" />
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/'} replace />
  }

  return <Outlet />
}

/** Dedicated guest route for Seller auth pages (/seller/login). */
export function SellerGuestRoute() {
  const { user, initialising } = useAppSelector((state) => state.auth)

  if (initialising) return <PageLoader label="Checking your session…" />
  if (user) {
    return <Navigate to={user.role === 'seller' ? '/seller' : user.role === 'admin' ? '/admin' : '/'} replace />
  }

  return <Outlet />
}
