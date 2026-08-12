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
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}

/** Keeps signed-in users away from the login and register screens. */
export function GuestRoute() {
  const { user, initialising } = useAppSelector((state) => state.auth)

  if (initialising) return <PageLoader label="Checking your session…" />
  if (user) return <Navigate to="/" replace />

  return <Outlet />
}
