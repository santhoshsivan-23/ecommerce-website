import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">
        The page you were looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        <Link to="/products" className="btn-outline">Browse products</Link>
      </div>
    </div>
  )
}
