import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearCurrentOrder,
  fetchAdminOrder,
  updateOrderStatus,
  updatePaymentStatus,
} from '@/features/orders/orderSlice'
import { OrderTracker } from '@/components/order/OrderTracker'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateTime,
  orderStatusClasses,
  paymentStatusClasses,
} from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'
import type { OrderStatus, PaymentStatus } from '@/types'

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()

  const { current: order, detailStatus, error } = useAppSelector((state) => state.orders)

  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)

  useEffect(() => {
    if (id) dispatch(fetchAdminOrder(Number(id)))
    return () => {
      dispatch(clearCurrentOrder())
    }
  }, [dispatch, id])

  const handleStatus = async (status: OrderStatus) => {
    if (!order) return

    setSaving(true)
    setPendingStatus(status)
    const result = await dispatch(updateOrderStatus({ id: order.id, status, note: note.trim() || undefined }))
    setSaving(false)
    setPendingStatus(null)

    if (updateOrderStatus.fulfilled.match(result)) {
      notify.success(`Order marked as ${status}`)
      setNote('')
    } else {
      notifyApiError(result.payload, 'Could not update the order')
    }
  }

  const handlePaymentStatus = async (paymentStatus: PaymentStatus) => {
    if (!order) return

    const result = await dispatch(updatePaymentStatus({ id: order.id, paymentStatus }))
    if (updatePaymentStatus.fulfilled.match(result)) notify.success(`Payment marked as ${paymentStatus}`)
    else notifyApiError(result.payload, 'Could not update the payment status')
  }

  if (detailStatus === 'loading') return <PageLoader label="Loading order…" />

  if (detailStatus === 'failed' || !order) {
    return (
      <EmptyState
        title="Order not found"
        description={error ?? 'This order may have been removed.'}
        action={
          <Link to="/admin/orders" className="btn-primary">
            Back to orders
          </Link>
        }
      />
    )
  }

  const nextStatuses = order.allowedNextStatuses ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{order.orderNumber}</h2>
          <p className="text-sm text-slate-500">Placed on {formatDateTime(order.placedAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusClasses(order.status)}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusClasses(order.paymentStatus)}`}
          >
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </span>
          <Link to="/admin/orders" className="btn-outline text-xs">Back to list</Link>
        </div>
      </div>

      <section className="card p-5">
        <h3 className="mb-5 font-semibold text-slate-900">Tracking</h3>
        <OrderTracker order={order} />
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Update status</h3>

        {nextStatuses.length === 0 ? (
          <p className="text-sm text-slate-500">
            This order is {order.status} and can no longer change status.
          </p>
        ) : (
          <>
            <input
              className="input-field mb-3"
              placeholder="Optional note for this status change"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={status === 'cancelled' ? 'btn-danger' : 'btn-primary'}
                  onClick={() => handleStatus(status)}
                  disabled={saving}
                >
                  {saving && pendingStatus === status ? (
                    <Spinner className="h-4 w-4" />
                  ) : status === 'cancelled' ? (
                    'Cancel order'
                  ) : (
                    `Mark as ${ORDER_STATUS_LABELS[status].toLowerCase()}`
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Payment status</h4>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handlePaymentStatus(status)}
                disabled={order.paymentStatus === status}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  order.paymentStatus === status
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {PAYMENT_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Customer</h3>
          <p className="text-sm font-medium text-slate-800">
            {order.customer?.name ?? order.shippingFullName}
          </p>
          {order.customer ? (
            <>
              <p className="text-sm text-slate-500">{order.customer.email}</p>
              {order.customer.phone ? (
                <p className="text-sm text-slate-500">{order.customer.phone}</p>
              ) : null}
            </>
          ) : null}

          <h4 className="mb-1 mt-4 text-sm font-semibold text-slate-800">Delivery address</h4>
          <p className="text-sm leading-relaxed text-slate-600">
            {order.shippingFullName}
            <br />
            {order.shippingAddressLine1}
            {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''}
            {order.shippingLandmark ? `, ${order.shippingLandmark}` : ''}
            <br />
            {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
            <br />
            {order.shippingCountry}
            <br />
            Phone: {order.shippingPhone}
          </p>

          {order.customerNote ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Customer note: {order.customerNote}
            </p>
          ) : null}
        </section>

        <section className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Payment and totals</h3>

          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p className="font-medium text-slate-800">{order.paymentMethodName}</p>
            <p className="text-xs text-slate-500">Code: {order.paymentMethodCode}</p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Product total</dt>
              <dd className="font-medium text-slate-800">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.productDiscount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Product discount</dt>
                <dd className="font-medium text-emerald-600">− {formatPrice(order.productDiscount)}</dd>
              </div>
            ) : null}
            {order.couponDiscount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">Coupon ({order.couponCode})</dt>
                <dd className="font-medium text-emerald-600">− {formatPrice(order.couponDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery charge</dt>
              <dd className="font-medium text-slate-800">{formatPrice(order.deliveryCharge)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card overflow-hidden">
        <h3 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">
          Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
        </h3>

        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 px-5 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{item.productName}</p>
                <p className="text-xs text-slate-500">
                  {[item.brandName, item.variantLabel, item.sku].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              <div className="text-right text-sm">
                <p className="text-slate-500">
                  {formatPrice(item.unitPrice)} × {item.quantity}
                </p>
                <p className="font-semibold text-slate-900">{formatPrice(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {order.statusHistory && order.statusHistory.length > 0 ? (
        <section className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Status history</h3>
          <ul className="space-y-3">
            {order.statusHistory.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="font-medium text-slate-800">{ORDER_STATUS_LABELS[event.status]}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(event.createdAt)}
                    {event.changedBy ? ` · ${event.changedBy.name} (${event.changedBy.role})` : ''}
                  </p>
                  {event.note ? <p className="text-xs text-slate-500">{event.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
