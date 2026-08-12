import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { changePassword, updateProfile } from '@/features/auth/authSlice'
import { Spinner } from '@/components/ui/Spinner'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'

export default function Profile() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone ?? '' })
  }, [user])

  if (!user) return null

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const errors: Record<string, string> = {}
    if (profileForm.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
    if (profileForm.phone && !/^[0-9+\-\s()]{7,20}$/.test(profileForm.phone)) {
      errors.phone = 'Enter a valid phone number'
    }
    setProfileErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingProfile(true)
    const result = await dispatch(
      updateProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim() })
    )
    setSavingProfile(false)

    if (updateProfile.fulfilled.match(result)) notify.success('Profile updated')
    else {
      setProfileErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not update your profile')
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const errors: Record<string, string> = {}
    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required'
    if (passwordForm.newPassword.length < 6) errors.newPassword = 'Must be at least 6 characters'
    else if (!/\d/.test(passwordForm.newPassword)) errors.newPassword = 'Must contain at least one number'
    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingPassword(true)
    const result = await dispatch(
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
    )
    setSavingPassword(false)

    if (changePassword.fulfilled.match(result)) {
      notify.success('Password changed')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      setPasswordErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not change your password')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your account details</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                {user.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input
                id="name"
                className="input-field"
                value={profileForm.name}
                onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
              />
              {profileErrors.name ? <p className="field-error">{profileErrors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                className="input-field"
                value={profileForm.phone}
                placeholder="9876543210"
                onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
              />
              {profileErrors.phone ? <p className="field-error">{profileErrors.phone}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" className="input-field" value={user.email} disabled />
              <p className="mt-1 text-xs text-slate-400">Email cannot be changed</p>
            </div>

            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Change password</h2>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" noValidate>
              <div>
                <label className="label" htmlFor="currentPassword">Current password</label>
                <input
                  id="currentPassword"
                  type="password"
                  className="input-field"
                  value={passwordForm.currentPassword}
                  autoComplete="current-password"
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                  }
                />
                {passwordErrors.currentPassword ? (
                  <p className="field-error">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>

              <div>
                <label className="label" htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  className="input-field"
                  value={passwordForm.newPassword}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                  }
                />
                {passwordErrors.newPassword ? (
                  <p className="field-error">{passwordErrors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label className="label" htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  value={passwordForm.confirmPassword}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                  }
                />
                {passwordErrors.confirmPassword ? (
                  <p className="field-error">{passwordErrors.confirmPassword}</p>
                ) : null}
              </div>

              <button type="submit" className="btn-primary" disabled={savingPassword}>
                {savingPassword ? <Spinner className="h-4 w-4" label="Updating…" /> : 'Change password'}
              </button>
            </form>
          </div>

          {user.role === 'customer' ? (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-slate-900">Quick links</h2>
              <div className="flex flex-wrap gap-2">
                <Link to="/addresses" className="btn-outline text-sm">My addresses</Link>
                <Link to="/wishlist" className="btn-outline text-sm">My wishlist</Link>
                <Link to="/cart" className="btn-outline text-sm">My cart</Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
