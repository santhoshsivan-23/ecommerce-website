import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  deleteAddress,
  fetchAddresses,
  saveAddress,
  setDefaultAddress,
} from '@/features/address/addressSlice'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { Address, AddressLabel } from '@/types'

interface FormState {
  label: AddressLabel
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

const emptyForm: FormState = {
  label: 'home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
}

function toForm(address: Address): FormState {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    landmark: address.landmark ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  }
}

export default function Addresses() {
  const dispatch = useAppDispatch()
  const { items, status } = useAppSelector((state) => state.address)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchAddresses())
  }, [dispatch])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (address: Address) => {
    setEditingId(address.id)
    setForm(toForm(address))
    setErrors({})
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setErrors({})
  }

  /** Mirrors the server-side rules so mistakes surface before the request. */
  const validate = () => {
    const next: Record<string, string> = {}
    if (form.fullName.trim().length < 2) next.fullName = 'Full name is required'
    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number'
    if (form.addressLine1.trim().length < 3) next.addressLine1 = 'Address line 1 is required'
    if (!form.city.trim()) next.city = 'City is required'
    if (!form.state.trim()) next.state = 'State is required'
    if (!/^[0-9A-Za-z\s-]{4,12}$/.test(form.postalCode.trim())) {
      next.postalCode = 'Enter a valid postal code'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    const result = await dispatch(
      saveAddress({
        id: editingId ?? undefined,
        body: {
          ...form,
          addressLine2: form.addressLine2 || undefined,
          landmark: form.landmark || undefined,
        },
      })
    )
    setSaving(false)

    if (saveAddress.fulfilled.match(result)) {
      notify.success(editingId ? 'Address updated' : 'Address added')
      closeForm()
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the address')
    }
  }

  const handleDelete = async (address: Address) => {
    const result = await dispatch(deleteAddress(address.id))
    if (deleteAddress.fulfilled.match(result)) notify.success('Address deleted')
    else notifyApiError(result.payload)
  }

  const handleSetDefault = async (address: Address) => {
    const result = await dispatch(setDefaultAddress(address.id))
    if (setDefaultAddress.fulfilled.match(result)) notify.success('Default address updated')
    else notifyApiError(result.payload)
  }

  const field = (
    id: keyof FormState,
    label: string,
    placeholder = '',
    required = true
  ) => (
    <div>
      <label className="label" htmlFor={id}>
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <input
        id={id}
        type="text"
        className="input-field"
        value={form[id] as string}
        placeholder={placeholder}
        onChange={(event) => setForm({ ...form, [id]: event.target.value })}
      />
      {errors[id] ? <p className="field-error">{errors[id]}</p> : null}
    </div>
  )

  if (status === 'loading' && items.length === 0) return <PageLoader label="Loading addresses…" />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My addresses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage where your orders get delivered
          </p>
        </div>
        <button type="button" className="btn-primary gap-2" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add address
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card mb-6 p-5" noValidate>
          <h2 className="mb-4 font-semibold text-slate-900">
            {editingId ? 'Edit address' : 'New address'}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('fullName', 'Full name', 'Riya Sharma')}
            {field('phone', 'Phone number', '9876543210')}

            <div className="sm:col-span-2">{field('addressLine1', 'Address line 1', 'House / flat, street')}</div>
            <div className="sm:col-span-2">
              {field('addressLine2', 'Address line 2', 'Area, locality (optional)', false)}
            </div>

            {field('landmark', 'Landmark', 'Near the city library (optional)', false)}
            {field('city', 'City', 'Chennai')}
            {field('state', 'State', 'Tamil Nadu')}
            {field('postalCode', 'Postal code', '600040')}
            {field('country', 'Country', 'India')}

            <div>
              <label className="label" htmlFor="label">Address type</label>
              <select
                id="label"
                className="input-field"
                value={form.label}
                onChange={(event) => setForm({ ...form, label: event.target.value as AddressLabel })}
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
              className="accent-brand-600"
            />
            Use this as my default delivery address
          </label>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save address'}
            </button>
            <button type="button" className="btn-outline" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {items.length === 0 && !showForm ? (
        <EmptyState
          title="No addresses saved"
          description="Add a delivery address so you can complete an order."
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Add your first address
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((address) => (
            <div
              key={address.id}
              className={`card p-4 ${address.isDefault ? 'border-brand-300 ring-1 ring-brand-100' : ''}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {address.label}
                </span>
                {address.isDefault ? (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="font-semibold text-slate-800">{address.fullName}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                {address.landmark ? `, ${address.landmark}` : ''}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
              </p>
              <p className="mt-1 text-sm text-slate-500">Phone: {address.phone}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-outline gap-1 text-xs" onClick={() => openEdit(address)}>
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </button>

                {!address.isDefault ? (
                  <button
                    type="button"
                    className="btn-outline text-xs"
                    onClick={() => handleSetDefault(address)}
                  >
                    Set as default
                  </button>
                ) : null}

                <button
                  type="button"
                  className="btn-outline gap-1 text-xs text-rose-600"
                  onClick={() => handleDelete(address)}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
