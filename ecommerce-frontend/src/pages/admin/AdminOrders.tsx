import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchAdminOrders } from '@/features/orders/orderSlice'
import { fetchPaymentMethods } from '@/features/payments/paymentSlice'
import { fetchSellers } from '@/features/admin/adminSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  orderStatusClasses,
  orderStatusLabel,
  paymentStatusClasses,
} from '@/utils/orders'
import type { OrderSource, OrderStatus, PaymentStatus } from '@/types'

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

const SOURCES: Array<{ value: OrderSource; label: string }> = [
  { value: 'customer', label: 'Customer order' },
  { value: 'seller', label: 'Seller order' },
]

export default function AdminOrders() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  const { adminOrders, adminPagination, adminStatus } = useAppSelector((state) => state.orders)
  const methods = useAppSelector((state) => state.payments.methods)
  const sellers = useAppSelector((state) => state.admin.sellers)

  const [search, setSearch] = useState(searchParams.get('q') || '')

  const query = {
    q: searchParams.get('q') || '',
    status: (searchParams.get('status') || '') as OrderStatus | '',
    paymentStatus: (searchParams.get('paymentStatus') || '') as PaymentStatus | '',
    paymentMethod: searchParams.get('paymentMethod') || '',
    source: (searchParams.get('source') || '') as OrderSource | '',
    // Set by the "Open in order manager" links on the seller and customer screens.
    sellerId: searchParams.get('sellerId') || '',
    customerId: searchParams.get('customerId') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    sort: (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'total_desc' | 'total_asc',
    page: Number(searchParams.get('page')) || 1,
  }

  useEffect(() => {
    if (methods.length === 0) dispatch(fetchPaymentMethods({ includeInactive: true }))
    if (sellers.length === 0) dispatch(fetchSellers({ limit: 100 }))
  }, [dispatch, methods.length, sellers.length])

  useEffect(() => {
    dispatch(fetchAdminOrders(query))
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

  const clearFilters = () => setSearchParams(new URLSearchParams())

  const activeFilters =
    (query.q ? 1 : 0) +
    (query.status ? 1 : 0) +
    (query.paymentStatus ? 1 : 0) +
    (query.paymentMethod ? 1 : 0) +
    (query.source ? 1 : 0) +
    (query.sellerId ? 1 : 0) +
    (query.customerId ? 1 : 0) +
    (query.from || query.to ? 1 : 0)

  // A customer id can arrive from their profile page, where no name is loaded here.
  const customerName = query.customerId
    ? (adminOrders[0]?.customer?.name ?? `#${query.customerId}`)
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Orders <span className="text-sm font-normal text-slate-500">({adminPagination.total})</span>
        </h2>
        {activeFilters > 0 ? (
          <button type="button" onClick={clearFilters} className="btn-outline text-xs">
            Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      {/* Arriving from a customer or seller screen scopes the whole list, which
          is easy to forget once you start changing the other filters. */}
      {query.customerId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          <span>
            Showing orders placed by{' '}
            <Link
              to={`/admin/customers/${query.customerId}`}
              className="font-semibold hover:underline"
            >
              {customerName}
            </Link>
          </span>
          <button
            type="button"
            className="ml-auto text-xs font-semibold hover:underline"
            onClick={() => updateParams({ customerId: undefined })}
          >
            Show every customer
          </button>
        </div>
      ) : null}

      <div className="card flex flex-col gap-3 p-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            updateParams({ q: search.trim() })
          }}
        >
          <input
            className="input-field"
            placeholder="Search by order number, customer name, email or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0">Search</button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Order status</span>
            <select
              className="input-field"
              value={query.status}
              onChange={(event) => updateParams({ status: event.target.value })}
            >
              <option value="">All</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Payment status</span>
            <select
              className="input-field"
              value={query.paymentStatus}
              onChange={(event) => updateParams({ paymentStatus: event.target.value })}
            >
              <option value="">All</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Payment method</span>
            <select
              className="input-field"
              value={query.paymentMethod}
              onChange={(event) => updateParams({ paymentMethod: event.target.value })}
            >
              <option value="">All</option>
              {methods.map((method) => (
                <option key={method.id} value={method.code}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Order source</span>
            <select
              className="input-field"
              value={query.source}
              onChange={(event) => updateParams({ source: event.target.value })}
            >
              <option value="">All sources</option>
              {SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Seller</span>
            <select
              className="input-field"
              value={query.sellerId}
              onChange={(event) => updateParams({ sellerId: event.target.value })}
            >
              <option value="">All sellers</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">From</span>
            <input
              type="date"
              className="input-field"
              value={query.from}
              onChange={(event) => updateParams({ from: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="label">To</span>
            <input
              type="date"
              className="input-field"
              value={query.to}
              onChange={(event) => updateParams({ to: event.target.value })}
            />
          </label>
        </div>

        {query.sellerId ? (
          <p className="text-xs text-slate-500">
            Only orders containing this seller&rsquo;s items are listed. The totals shown are the
            full order value, not the seller&rsquo;s share —{' '}
            <Link
              to={`/admin/sellers/${query.sellerId}`}
              className="font-semibold text-brand-600 hover:underline"
            >
              open the seller
            </Link>{' '}
            for their own figures.
          </p>
        ) : null}

        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          Sort by
          <select
            className="input-field w-auto"
            value={query.sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total_desc">Highest value</option>
            <option value="total_asc">Lowest value</option>
          </select>
        </label>
      </div>

      {adminStatus === 'loading' ? (
        <PageLoader label="Loading orders…" />
      ) : adminOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try clearing the filters or widening the date range."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {adminOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.placedAt)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-slate-700">{order.customer?.name ?? order.shippingFullName}</p>
                    <p className="text-xs text-slate-400">
                      {order.customer?.email ?? order.shippingPhone}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        order.orderSource === 'seller'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {order.orderSource}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-slate-700">{order.paymentMethodName}</p>
                    <span
                      className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${paymentStatusClasses(order.paymentStatus)}`}
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-800">
                    {formatPrice(order.total)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClasses(order.status)}`}
                    >
                      {orderStatusLabel(order.status, order.orderSource)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/orders/${order.id}`}
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
        page={adminPagination.page}
        totalPages={adminPagination.totalPages}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />
    </div>
  )
}
