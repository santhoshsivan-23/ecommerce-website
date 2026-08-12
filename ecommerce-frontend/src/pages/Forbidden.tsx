import { Link } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

export default function Forbidden() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-rose-500">403</p>
      <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
      <p className="text-sm text-slate-500">
        {user
          ? `Your ${user.role} account does not have permission to open this page.`
          : 'You need to log in to view this page.'}
      </p>
      <div className="flex gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        {!user ? <Link to="/login" className="btn-outline">Log in</Link> : null}
      </div>
    </div>
  )
}
