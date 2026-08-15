import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { adminLogin } from '@/features/auth/authSlice'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'

interface LocationState {
  from?: string
}

export default function AdminLogin() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector((state) => state.auth.status)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const redirectTo = (location.state as LocationState | null)?.from || '/admin'
  const isSubmitting = status === 'loading'

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.email.trim()) next.email = 'Email address is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const result = await dispatch(adminLogin(form))
    if (adminLogin.fulfilled.match(result)) {
      notify.success(`Welcome back, Admin ${result.payload.user.name}`)
      navigate(redirectTo.startsWith('/admin') ? redirectTo : '/admin', { replace: true })
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not log in to Admin console')
    }
  }

  const fillDemo = () => {
    setForm({ email: 'admin@shop.com', password: 'Admin@123' })
    setErrors({})
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
          Business Owner Portal
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Admin Portal Login
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Access full control over products, inventory, orders, analytics & sellers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-8 shadow-xl border border-slate-100" noValidate>
        <div>
          <label className="label" htmlFor="email">Admin Email Address</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
            placeholder="admin@shop.com"
          />
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="current-password"
            placeholder="Your admin password"
          />
          {errors.password ? <p className="field-error">{errors.password}</p> : null}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-indigo-500/25 transition-all mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner className="h-5 w-5 text-white" label="Signing in as Admin…" /> : 'Log in to Admin Console'}
        </button>

        <div className="mt-2 flex flex-col items-center gap-2 text-xs text-slate-500">
          <p>
            Need to setup a business account?{' '}
            <Link to="/admin/register" className="font-semibold text-indigo-600 hover:underline">
              Register Admin Account
            </Link>
          </p>
          <div className="flex gap-4 pt-2 text-slate-400">
            <Link to="/seller/login" className="hover:text-slate-600 underline">Seller / Worker Login</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-slate-600 underline">Customer Login</Link>
          </div>
        </div>
      </form>

      <div className="card p-4 border border-indigo-100 bg-indigo-50/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Demo Admin Account
            </p>
            <p className="text-xs text-indigo-700">admin@shop.com / Admin@123</p>
          </div>
          <button type="button" className="btn-outline text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={fillDemo}>
            Fill Admin Credentials
          </button>
        </div>
      </div>
    </div>
  )
}
