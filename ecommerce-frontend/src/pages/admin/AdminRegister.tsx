import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { adminRegister } from '@/features/auth/authSlice'
import { fetchTaxSettings } from '@/features/admin/taxSettingsSlice'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'

export default function AdminRegister() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const status = useAppSelector((state) => state.auth.status)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isSubmitting = status === 'loading'

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Full name is required'
    else if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters'

    if (!form.email.trim()) next.email = 'Email address is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'

    if (!form.password) next.password = 'Password is required'
    else if (form.password.length < 6) next.password = 'Password must be at least 6 characters'
    else if (!/\d/.test(form.password)) next.password = 'Password must contain at least one number'

    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const result = await dispatch(
      adminRegister({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      })
    )

    if (adminRegister.fulfilled.match(result)) {
      dispatch(fetchTaxSettings())
      notify.success('Business Owner account created successfully! Welcome to your Admin Console.')
      navigate('/admin', { replace: true })
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not create Admin account')
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-500/30">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0V7m0 4h4" />
          </svg>
        </div>
        <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700">
          Business Owner Registration
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Register Admin Account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Create the primary owner account with full business control and management access.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5 p-8 shadow-xl border border-slate-100" noValidate>
        <div>
          <label className="label" htmlFor="name">Owner Full Name</label>
          <input
            id="name"
            type="text"
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Vikramaditya Roy"
            autoComplete="name"
          />
          {errors.name ? <p className="field-error">{errors.name}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="email">Business Email Address</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@yourbusiness.com"
            autoComplete="email"
          />
          {errors.email ? <p className="field-error">{errors.email}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="phone">Phone Number (Optional)</label>
          <input
            id="phone"
            type="tel"
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
          {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Admin Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password ? <p className="field-error">{errors.password}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input-field"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword}</p> : null}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md hover:shadow-orange-500/25 transition-all mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner className="h-5 w-5 text-white" label="Registering Admin Account…" /> : 'Register Business Owner Account'}
        </button>

        <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          Already have an Admin account?{' '}
          <Link to="/admin/login" className="font-semibold text-orange-600 hover:underline">
            Log in to Admin Console
          </Link>
        </div>
      </form>
    </div>
  )
}
