import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { register } from '@/features/auth/authSlice'
import { fetchTaxSettings } from '@/features/admin/taxSettingsSlice'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'

export default function Register() {
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

    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address'
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) {
      next.phone = 'Enter a valid phone number'
    }
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters'
    else if (!/\d/.test(form.password)) next.password = 'Password must contain at least one number'
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const result = await dispatch(
      register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      })
    )

    if (register.fulfilled.match(result)) {
      dispatch(fetchTaxSettings())
      notify.success('Your account is ready. Happy shopping!')
      navigate('/', { replace: true })
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not create your account')
    }
  }

  const field = (
    id: keyof typeof form,
    label: string,
    type = 'text',
    placeholder = '',
    autoComplete?: string
  ) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="input-field"
        value={form[id]}
        onChange={(event) => setForm({ ...form, [id]: event.target.value })}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {errors[id] ? <p className="field-error">{errors[id]}</p> : null}
    </div>
  )

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">It takes less than a minute</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6" noValidate>
        {field('name', 'Full name', 'text', 'Riya Sharma', 'name')}
        {field('email', 'Email address', 'email', 'you@example.com', 'email')}
        {field('phone', 'Phone number (optional)', 'tel', '9876543210', 'tel')}
        {field('password', 'Password', 'password', 'At least 6 characters with a number', 'new-password')}
        {field('confirmPassword', 'Confirm password', 'password', 'Re-enter your password', 'new-password')}

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" label="Creating account…" /> : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
