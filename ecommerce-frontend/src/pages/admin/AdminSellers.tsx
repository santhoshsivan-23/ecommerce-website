import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchSellers, saveSeller, setSellerStatus } from '@/features/admin/adminSlice'
import {
  DEFAULT_RANGE,
  RangeFilter,
  isRangeReady,
  rangeParams,
  type RangeState,
} from '@/components/admin/RangeFilter'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { AdminSeller } from '@/types'

interface FormState {
  name: string
  email: string
  phone: string
  password: string
  isActive: boolean
}

const emptyForm: FormState = { name: '', email: '', phone: '', password: '', isActive: true }

const SORTS = [
  { value: 'sales', label: 'Highest sales' },
  { value: 'revenue', label: 'Highest revenue' },
  { value: 'orders', label: 'Most orders' },
  { value: 'products', label: 'Most products' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
]

export default function AdminSellers() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { sellers, sellerPagination, sellersStatus } = useAppSelector((state) => state.admin)

  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [editing, setEditing] = useState<AdminSeller | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const query = {
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    sort: searchParams.get('sort') || 'sales',
    page: Number(searchParams.get('page')) || 1,
  }

  useEffect(() => {
    if (!isRangeReady(range)) return

    dispatch(fetchSellers({ ...query, ...rangeParams(range) })).then((result) => {
      if (fetchSellers.rejected.match(result)) notifyApiError(result.payload)
    })
    // The query object is rebuilt each render, so depend on the raw search string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchParams, range])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (seller: AdminSeller) => {
    setEditing(seller)
    setForm({
      name: seller.name,
      email: seller.email,
      phone: seller.phone ?? '',
      // Left blank on purpose: saving the form must not reset their login.
      password: '',
      isActive: seller.isActive,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (!editing && form.password.length < 6) {
      next.password = 'Password must be at least 6 characters'
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setSaving(true)
    const result = await dispatch(
      saveSeller({
        id: editing?.id,
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        },
      })
    )
    setSaving(false)

    if (saveSeller.fulfilled.match(result)) {
      notify.success(result.payload.message)
      setShowForm(false)
      setEditing(null)
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the seller')
    }
  }

  const toggleStatus = async (seller: AdminSeller) => {
    const result = await dispatch(setSellerStatus({ id: seller.id, isActive: !seller.isActive }))
    if (setSellerStatus.fulfilled.match(result)) notify.success(result.payload.message)
    else notifyApiError(result.payload)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Sellers{' '}
          <span className="text-sm font-normal text-slate-500">({sellerPagination.total})</span>
        </h2>
        <button type="button" className="btn-primary gap-2" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add seller
        </button>
      </div>

      <RangeFilter value={range} onChange={setRange}>
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            updateParams({ q: search.trim() })
          }}
        >
          <label className="flex-1 text-sm text-slate-600">
            <span className="label">Search</span>
            <input
              className="input-field"
              placeholder="Seller name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="submit" className="btn-outline shrink-0 self-end">
            Search
          </button>
        </form>

        <label className="text-sm text-slate-600">
          <span className="label">Account</span>
          <select
            className="input-field w-auto"
            value={query.status}
            onChange={(event) => updateParams({ status: event.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Deactivated only</option>
          </select>
        </label>

        <label className="text-sm text-slate-600">
          <span className="label">Rank by</span>
          <select
            className="input-field w-auto"
            value={query.sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </RangeFilter>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Sales and revenue are credited from each seller&apos;s own order lines, so an order shared
        between two sellers is never counted twice. Deactivating a seller blocks their login; their
        products stay listed until you disable them.
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-5" noValidate>
          <h3 className="mb-4 font-semibold text-slate-800">
            {editing ? `Edit ${editing.name}` : 'New seller'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="seller-name">
                Name *
              </label>
              <input
                id="seller-name"
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Priya Traders"
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="seller-email">
                Email *
              </label>
              <input
                id="seller-email"
                type="email"
                className="input-field"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="seller@shop.com"
              />
              {errors.email ? <p className="field-error">{errors.email}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="seller-phone">
                Phone
              </label>
              <input
                id="seller-phone"
                className="input-field"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="9000000002"
              />
              {errors.phone ? <p className="field-error">{errors.phone}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="seller-password">
                {editing ? 'New password' : 'Password *'}
              </label>
              <input
                id="seller-password"
                type="password"
                className="input-field"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editing ? 'Leave blank to keep the current one' : 'At least 6 characters'}
              />
              {errors.password ? <p className="field-error">{errors.password}</p> : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="accent-brand-600"
              />
              Can sign in to the seller panel
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save seller'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {sellersStatus === 'loading' && sellers.length === 0 ? (
        <PageLoader label="Loading sellers…" />
      ) : sellers.length === 0 ? (
        <EmptyState
          title="No sellers found"
          description="Add your first seller, or clear the filters."
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Add seller
            </button>
          }
        />
      ) : (
        <div className={`card overflow-x-auto ${sellersStatus === 'loading' ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[940px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/sellers/${seller.id}`}
                      className="font-medium text-slate-800 hover:text-brand-600"
                    >
                      {seller.name}
                    </Link>
                    <p className="text-xs text-slate-400">{seller.email}</p>
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {seller.productCount}
                    <span className="ml-1 text-xs text-slate-400">({seller.activeProducts} live)</span>
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {seller.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                    {seller.pendingOrders}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {seller.completedOrders}
                  </td>

                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {formatPrice(seller.sales)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatPrice(seller.revenue)}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(seller)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                        seller.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Click to toggle"
                    >
                      {seller.isActive ? 'Active' : 'Deactivated'}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(seller)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        aria-label={`Edit ${seller.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/admin/sellers/${seller.id}`}
                        className="text-sm font-semibold text-brand-600 hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={sellerPagination.page}
        totalPages={sellerPagination.totalPages}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />
    </div>
  )
}
