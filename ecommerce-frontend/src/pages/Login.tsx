import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { login } from '@/features/auth/authSlice'
import { fetchTaxSettings } from '@/features/admin/taxSettingsSlice'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'

interface LocationState {
  from?: string
}

export default function Login() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector((state) => state.auth.status)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const redirectTo = (location.state as LocationState | null)?.from || '/'
  const isSubmitting = status === 'loading'

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const result = await dispatch(login(form))
    if (login.fulfilled.match(result)) {
      // Call Settings API immediately after login, get latest tax rate, and store in local storage
      dispatch(fetchTaxSettings())
      notify.success(`Welcome back, ${result.payload.user.name}`)
      // Staff land in their own workspace; customers return to where they came from.
      const role = result.payload.user.role
      const home = role === 'admin' ? '/admin' : role === 'seller' ? '/seller' : redirectTo
      navigate(redirectTo === '/' ? home : redirectTo, { replace: true })
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not log you in')
    }
  }

  const fillDemo = (email: string, password: string) => {
    setForm({ email, password })
    setErrors({})
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to continue shopping</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6" noValidate>
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
            placeholder="you@example.com"
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
            placeholder="Your password"
          />
          {errors.password ? <p className="field-error">{errors.password}</p> : null}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" label="Logging in…" /> : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Create a customer account
          </Link>
        </p>

        <div className="flex justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Link to="/admin/login" className="hover:text-slate-600 underline">Admin Login</Link>
          <span>•</span>
          <Link to="/seller/login" className="hover:text-slate-600 underline">Seller / Worker Login</Link>
        </div>
      </form>

      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Demo Customer Account
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-600 font-mono">customer@shop.com / Customer@123</span>
          <button type="button" className="btn-outline text-xs" onClick={() => fillDemo('customer@shop.com', 'Customer@123')}>
            Fill Customer Demo
          </button>
        </div>
      </div>
    </div>
  )
}
