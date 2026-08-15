import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchSellerOrders } from '@/features/seller/sellerSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { PlusIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateTime,
  orderStatusClasses,
  paymentStatusClasses,
} from '@/utils/orders'
import type { OrderStatus, PaymentStatus } from '@/types'

const STATUS_OPTIONS: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Order placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_OPTIONS: Array<{ value: PaymentStatus | ''; label: string }> = [
  { value: '', label: 'Any payment status' },
  { value: 'pending', label: 'Payment pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
]

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'customer', label: 'Customer orders' },
  { value: 'seller', label: 'Orders I created' },
]

export default function SellerOrders() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { orders, ordersPagination, ordersStatus } = useAppSelector((state) => state.seller)

  const [search, setSearch] = useState(searchParams.get('q') || '')

  const query = searchParams.get('q') || ''
  const status = (searchParams.get('status') as OrderStatus) || ''
  const paymentStatus = (searchParams.get('paymentStatus') as PaymentStatus) || ''
  const source = searchParams.get('source') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const page = Number(searchParams.get('page')) || 1

  useEffect(() => {
    dispatch(
      fetchSellerOrders({
        q: query || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        source: (source as 'customer' | 'seller') || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 15,
      })
    )
  }, [dispatch, query, status, paymentStatus, source, from, to, page])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Orders <span className="text-sm font-normal text-slate-500">({ordersPagination.total})</span>
        </h2>
        <Link to="/seller/orders/new" className="btn-primary gap-2">
          <PlusIcon className="h-4 w-4" />
          Create order
        </Link>
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
            placeholder="Search by order number or customer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-outline">Search</button>
        </form>

        <select
          className="input-field w-auto"
          value={status}
          onChange={(event) => updateParams({ status: event.target.value })}
          aria-label="Order status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          className="input-field w-auto"
          value={paymentStatus}
          onChange={(event) => updateParams({ paymentStatus: event.target.value })}
          aria-label="Payment status"
        >
          {PAYMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          className="input-field w-auto"
          value={source}
          onChange={(event) => updateParams({ source: event.target.value })}
          aria-label="Order source"
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          type="date"
          className="input-field w-auto"
          value={from}
          onChange={(event) => updateParams({ from: event.target.value })}
          aria-label="From date"
        />
        <input
          type="date"
          className="input-field w-auto"
          value={to}
          onChange={(event) => updateParams({ to: event.target.value })}
          aria-label="To date"
        />
      </div>

      {ordersStatus === 'loading' && orders.length === 0 ? (
        <PageLoader label="Loading orders…" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders containing your products will appear here, along with any you create yourself."
          action={
            <Link to="/seller/orders/new" className="btn-primary">
              Create an order
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/seller/orders/${order.id}`}
                      className="font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {order.orderNumber}
                    </Link>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${orderStatusClasses(order.status)}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${paymentStatusClasses(order.paymentStatus)}`}
                    >
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </span>
                    {order.orderSource === 'seller' ? (
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                        Created by me
                      </span>
                    ) : null}
                    {!order.isSoleSeller ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Shared order
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(order.placedAt)} · {order.customer?.name ?? order.shippingFullName} ·{' '}
                    {order.paymentMethodName}
                  </p>

                  <ul className="mt-2 text-sm text-slate-600">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.productName}
                        {item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Order Total</p>
                  <p className="text-lg font-bold text-slate-900">{formatPrice(order.total || order.sellerSubtotal)}</p>
                  <Link to={`/seller/orders/${order.id}`} className="btn-outline mt-2 text-xs">
                    Open Order
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={ordersPagination.page}
        totalPages={ordersPagination.totalPages}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />
    </div>
  )
}
