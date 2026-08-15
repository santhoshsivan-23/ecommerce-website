import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteCoupon, fetchCoupons, saveCoupon } from '@/features/payments/paymentSlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import { formatDate } from '@/utils/orders'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { Coupon } from '@/types'

interface FormState {
  code: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: string
  minOrderValue: string
  maxDiscount: string
  expiresAt: string
  usageLimit: string
  isActive: boolean
  isPublic: boolean
}

const emptyForm: FormState = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minOrderValue: '0',
  maxDiscount: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
  isPublic: true,
}

/** Turns an ISO timestamp into the yyyy-mm-dd a date input expects. */
function toDateInput(value: string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export default function AdminCoupons() {
  const dispatch = useAppDispatch()
  const coupons = useAppSelector((state) => state.payments.coupons)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchCoupons()).finally(() => setLoading(false))
  }, [dispatch])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderValue: String(coupon.minOrderValue),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      expiresAt: toDateInput(coupon.expiresAt),
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      isActive: coupon.isActive,
      isPublic: coupon.isPublic ?? true,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const next: Record<string, string> = {}
    if (form.code.trim().length < 3) next.code = 'Coupon code must be at least 3 characters'
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      next.discountValue = 'Discount value must be greater than 0'
    }
    if (form.discountType === 'percent' && Number(form.discountValue) > 100) {
      next.discountValue = 'A percentage discount cannot exceed 100'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const result = await dispatch(
      saveCoupon({
        id: editingId ?? undefined,
        body: {
          code: form.code.trim().toUpperCase(),
          description: form.description.trim() || null,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minOrderValue: Number(form.minOrderValue) || 0,
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          isActive: form.isActive,
          isPublic: form.isPublic,
        },
      })
    )
    setSaving(false)

    if (saveCoupon.fulfilled.match(result)) {
      notify.success(editingId ? 'Coupon updated' : 'Coupon created')
      setShowForm(false)
      setEditingId(null)
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the coupon')
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    const result = await dispatch(deleteCoupon(coupon.id))
    if (deleteCoupon.fulfilled.match(result)) notify.success('Coupon deleted')
    else notifyApiError(result.payload)
  }

  if (loading) return <PageLoader label="Loading coupons…" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Coupons</h2>
        <button type="button" className="btn-primary gap-2" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add coupon
        </button>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Coupons come off the product total before delivery is added. The server revalidates the code
        when the order is placed, so an expired or over-used coupon cannot slip through.
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-5" noValidate>
          <h3 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit coupon' : 'New coupon'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="c-code">Code *</label>
              <input
                id="c-code"
                className="input-field uppercase"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="WELCOME10"
              />
              {errors.code ? <p className="field-error">{errors.code}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="c-type">Discount type</label>
              <select
                id="c-type"
                className="input-field"
                value={form.discountType}
                onChange={(event) =>
                  setForm({ ...form, discountType: event.target.value as 'percent' | 'fixed' })
                }
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="c-value">
                {form.discountType === 'percent' ? 'Percentage off *' : 'Amount off (₹) *'}
              </label>
              <input
                id="c-value"
                type="number"
                min="0"
                className="input-field"
                value={form.discountValue}
                onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
              />
              {errors.discountValue ? <p className="field-error">{errors.discountValue}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="c-min">Minimum order (₹)</label>
              <input
                id="c-min"
                type="number"
                min="0"
                className="input-field"
                value={form.minOrderValue}
                onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="c-max">Maximum discount (₹)</label>
              <input
                id="c-max"
                type="number"
                min="0"
                className="input-field"
                value={form.maxDiscount}
                onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
                placeholder="Caps a percentage coupon"
                disabled={form.discountType === 'fixed'}
              />
            </div>

            <div>
              <label className="label" htmlFor="c-expires">Expires on</label>
              <input
                id="c-expires"
                type="date"
                className="input-field"
                value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="c-limit">Usage limit</label>
              <input
                id="c-limit"
                type="number"
                min="0"
                className="input-field"
                value={form.usageLimit}
                onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
                placeholder="Unlimited"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="c-description">Description</label>
              <input
                id="c-description"
                className="input-field"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="10% off your order, up to ₹500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="accent-orange-600"
                />
                Active
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => setForm({ ...form, isPublic: event.target.checked })}
                  className="accent-orange-600"
                />
                Public Coupon (Show in Available Coupons list below Promo Code)
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save coupon'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Minimum order</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {coupons.map((coupon) => {
              const expired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false

              return (
                <tr key={coupon.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-slate-800">{coupon.code}</p>
                    {coupon.description ? (
                      <p className="text-xs text-slate-500">{coupon.description}</p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {coupon.discountType === 'percent'
                      ? `${coupon.discountValue}%${coupon.maxDiscount ? ` up to ${formatPrice(coupon.maxDiscount)}` : ''}`
                      : formatPrice(coupon.discountValue)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {coupon.minOrderValue > 0 ? formatPrice(coupon.minOrderValue) : '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        !coupon.isActive || expired
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {expired ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(coupon)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        aria-label={`Edit ${coupon.code}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${coupon.code}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
