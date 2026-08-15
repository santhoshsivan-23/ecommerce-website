import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { sellerLogin } from '@/features/auth/authSlice'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'

interface LocationState {
  from?: string
}

export default function SellerLogin() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAppSelector((state) => state.auth.status)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const redirectTo = (location.state as LocationState | null)?.from || '/seller'
  const isSubmitting = status === 'loading'

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.email.trim()) next.email = 'Email address or mobile number is required'
    if (!form.password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const result = await dispatch(sellerLogin({ email: form.email.trim(), password: form.password }))
    if (sellerLogin.fulfilled.match(result)) {
      notify.success(`Welcome back, ${result.payload.user.name}`)
      navigate(redirectTo.startsWith('/seller') ? redirectTo : '/seller', { replace: true })
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not log in to Seller portal')
    }
  }

  const fillDemo = () => {
    setForm({ email: 'seller@shop.com', password: 'Seller@123' })
    setErrors({})
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
          Worker / Staff Portal
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Seller Portal Login
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Access your assigned inventory, orders, and customer operations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-8 shadow-xl border border-slate-100" noValidate>
        <div>
          <label className="label" htmlFor="email">Email Address or Mobile Number</label>
          <input
            id="email"
            type="text"
            className="input-field"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="seller@shop.com or 9876543210"
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
            placeholder="Your worker password"
          />
          {errors.password ? <p className="field-error">{errors.password}</p> : null}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-md hover:shadow-amber-500/25 transition-all mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner className="h-5 w-5 text-white" label="Signing in as Seller…" /> : 'Log in to Seller Portal'}
        </button>

        <div className="rounded-lg bg-amber-50/80 p-3 text-xs text-amber-800 border border-amber-200/60 mt-1">
          <p className="font-medium">Note for Employees:</p>
          <p className="mt-0.5 text-amber-700">
            Seller worker accounts cannot be created publicly. Contact your Business Admin to obtain or reactivate your account credentials.
          </p>
        </div>

        <div className="flex justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Link to="/admin/login" className="hover:text-slate-600 underline">Admin Login</Link>
          <span>•</span>
          <Link to="/login" className="hover:text-slate-600 underline">Customer Login</Link>
        </div>
      </form>

      <div className="card p-4 border border-amber-100 bg-amber-50/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Demo Seller Account
            </p>
            <p className="text-xs text-amber-700">seller@shop.com / Seller@123</p>
          </div>
          <button type="button" className="btn-outline text-xs bg-white border-amber-200 text-amber-700 hover:bg-amber-50" onClick={fillDemo}>
            Fill Seller Credentials
          </button>
        </div>
      </div>
    </div>
  )
}
