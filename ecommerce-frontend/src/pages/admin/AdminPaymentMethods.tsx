import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  deletePaymentMethod,
  fetchPaymentMethods,
  savePaymentMethod,
  togglePaymentMethod,
} from '@/features/payments/paymentSlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { PaymentMethod } from '@/types'

interface FormState {
  name: string
  code: string
  description: string
  instructions: string
  settlesImmediately: boolean
  isActive: boolean
  sortOrder: string
}

const emptyForm: FormState = {
  name: '',
  code: '',
  description: '',
  instructions: '',
  settlesImmediately: true,
  isActive: true,
  sortOrder: '0',
}

export default function AdminPaymentMethods() {
  const dispatch = useAppDispatch()
  const methods = useAppSelector((state) => state.payments.methods)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchPaymentMethods({ includeInactive: true })).finally(() => setLoading(false))
  }, [dispatch])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (method: PaymentMethod) => {
    setEditingId(method.id)
    setForm({
      name: method.name,
      code: method.code,
      description: method.description ?? '',
      instructions: method.instructions ?? '',
      settlesImmediately: method.settlesImmediately,
      isActive: method.isActive,
      sortOrder: String(method.sortOrder),
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (form.name.trim().length < 2) {
      setErrors({ name: 'Payment method name is required' })
      return
    }

    setSaving(true)
    const result = await dispatch(
      savePaymentMethod({
        id: editingId ?? undefined,
        body: {
          name: form.name.trim(),
          code: form.code.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '_'),
          description: form.description.trim() || null,
          instructions: form.instructions.trim() || null,
          settlesImmediately: form.settlesImmediately,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder) || 0,
        },
      })
    )
    setSaving(false)

    if (savePaymentMethod.fulfilled.match(result)) {
      notify.success(editingId ? 'Payment method updated' : 'Payment method added')
      setShowForm(false)
      setEditingId(null)
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the payment method')
    }
  }

  const handleToggle = async (method: PaymentMethod) => {
    const result = await dispatch(
      togglePaymentMethod({ id: method.id, isActive: !method.isActive })
    )
    if (togglePaymentMethod.fulfilled.match(result)) notify.success(result.payload.isActive ? `${method.name} enabled` : `${method.name} disabled`)
    else notifyApiError(result.payload)
  }

  const handleDelete = async (method: PaymentMethod) => {
    const result = await dispatch(deletePaymentMethod(method.id))
    if (deletePaymentMethod.fulfilled.match(result)) notify.success('Payment method deleted')
    else notifyApiError(result.payload)
  }

  if (loading) return <PageLoader label="Loading payment methods…" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Payment methods</h2>
        <button type="button" className="btn-primary gap-2" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add method
        </button>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Customers only see methods that are enabled. Cash is permanent: it can never be disabled or
        deleted, so there is always at least one way to pay. There is no payment gateway in this
        phase, so a method marked <span className="font-medium">paid on placing</span> records the
        order as paid, while cash stays pending until delivery.
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-5" noValidate>
          <h3 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit payment method' : 'New payment method'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pm-name">Name *</label>
              <input
                id="pm-name"
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Google Pay"
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="pm-code">Code</label>
              <input
                id="pm-code"
                className="input-field"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="gpay"
                disabled={Boolean(editingId && methods.find((m) => m.id === editingId)?.isPermanent)}
              />
              <p className="mt-1 text-xs text-slate-400">Stored on every order that uses it.</p>
              {errors.code ? <p className="field-error">{errors.code}</p> : null}
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="pm-description">Description</label>
              <input
                id="pm-description"
                className="input-field"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Pay instantly with Google Pay"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="pm-instructions">Checkout instructions</label>
              <input
                id="pm-instructions"
                className="input-field"
                value={form.instructions}
                onChange={(event) => setForm({ ...form, instructions: event.target.value })}
                placeholder="Shown under the option at checkout"
              />
            </div>

            <div>
              <label className="label" htmlFor="pm-sort">Sort order</label>
              <input
                id="pm-sort"
                type="number"
                className="input-field"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.settlesImmediately}
                  onChange={(event) => setForm({ ...form, settlesImmediately: event.target.checked })}
                  className="accent-brand-600"
                />
                Mark orders as paid on placement
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="accent-brand-600"
                />
                Available to customers
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save method'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Payment recorded as</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {methods.map((method) => (
              <tr key={method.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{method.name}</p>
                  {method.description ? (
                    <p className="text-xs text-slate-500">{method.description}</p>
                  ) : null}
                  {method.isPermanent ? (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      Permanent
                    </span>
                  ) : null}
                </td>

                <td className="px-4 py-3 font-mono text-xs text-slate-500">{method.code}</td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      method.settlesImmediately
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {method.settlesImmediately ? 'Paid' : 'Pending'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(method)}
                    disabled={method.isPermanent}
                    title={
                      method.isPermanent
                        ? 'Cash is always available'
                        : 'Click to toggle availability'
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                      method.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } ${method.isPermanent ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {method.isActive ? 'Enabled' : 'Disabled'}
                  </button>
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(method)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                      aria-label={`Edit ${method.name}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(method)}
                      disabled={method.isPermanent}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Delete ${method.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
