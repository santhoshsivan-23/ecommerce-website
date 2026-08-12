import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchCustomers, setCustomerStatus } from '@/features/admin/adminSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import { formatDate } from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'
import type { AdminCustomer } from '@/types'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'orders_desc', label: 'Most orders' },
  { value: 'spend_desc', label: 'Highest spend' },
]

export default function AdminCustomers() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { customers, customerPagination, customersStatus } = useAppSelector((state) => state.admin)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [confirmDeactivate, setConfirmDeactivate] = useState<AdminCustomer | null>(null)

  const query = {
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page')) || 1,
  }

  useEffect(() => {
    dispatch(fetchCustomers(query)).then((result) => {
      if (fetchCustomers.rejected.match(result)) notifyApiError(result.payload)
    })
    // The query object is rebuilt each render, so depend on the raw search string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchParams])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  const toggleStatus = async (customer: AdminCustomer) => {
    const result = await dispatch(
      setCustomerStatus({ id: customer.id, isActive: !customer.isActive })
    )
    setConfirmDeactivate(null)

    if (setCustomerStatus.fulfilled.match(result)) notify.success(result.payload.message)
    else notifyApiError(result.payload)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Customers{' '}
          <span className="text-sm font-normal text-slate-500">({customerPagination.total})</span>
        </h2>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            updateParams({ q: search.trim() })
          }}
        >
          <input
            className="input-field"
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0">
            Search
          </button>
        </form>

        <select
          className="input-field w-auto"
          value={query.status}
          onChange={(event) => updateParams({ status: event.target.value })}
          aria-label="Account status"
        >
          <option value="">All accounts</option>
          <option value="active">Active only</option>
          <option value="inactive">Deactivated only</option>
        </select>

        <select
          className="input-field w-auto"
          value={query.sort}
          onChange={(event) => updateParams({ sort: event.target.value })}
          aria-label="Sort customers"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {customersStatus === 'loading' && customers.length === 0 ? (
        <PageLoader label="Loading customers…" />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Try a different search, or clear the account filter."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3">Last order</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/customers/${customer.id}`}
                      className="font-medium text-slate-800 hover:text-brand-600"
                    >
                      {customer.name}
                    </Link>
                    <p className="text-xs text-slate-400">{customer.email}</p>
                  </td>

                  <td className="px-4 py-3 text-slate-600">{formatDate(customer.createdAt)}</td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {customer.orderCount}
                    {customer.cancelledOrders > 0 ? (
                      <span className="ml-1 text-xs text-slate-400">
                        ({customer.cancelledOrders} cancelled)
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {formatPrice(customer.totalSpent)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">{formatDate(customer.lastOrderAt)}</td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        customer.isActive ? setConfirmDeactivate(customer) : toggleStatus(customer)
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                        customer.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Click to toggle"
                    >
                      {customer.isActive ? 'Active' : 'Deactivated'}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/customers/${customer.id}`}
                      className="text-sm font-semibold text-brand-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={customerPagination.page}
        totalPages={customerPagination.totalPages}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />

      {confirmDeactivate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-slate-900">Deactivate this customer?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirmDeactivate.name} will be signed out and cannot log in again until you
              reactivate the account. Their past orders stay exactly as they are.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setConfirmDeactivate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => toggleStatus(confirmDeactivate)}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
