import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center" role="status">
      <span className="text-brand-deep/60">Loading…</span>
    </div>
  )
}

/** Only signed-in users get through; everyone else goes to /login. */
export function RequireAuth() {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (recovering) return <Navigate to="/reset-password" replace />
  return <Outlet />
}

/** Login/sign-up screens: signed-in users are sent to the app instead. */
export function PublicOnly() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }
  return <Outlet />
}
