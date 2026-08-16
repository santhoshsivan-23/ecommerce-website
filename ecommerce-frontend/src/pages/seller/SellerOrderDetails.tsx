import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearCurrentSellerOrder,
  fetchSellerOrder,
  fetchSellerStats,
  updateSellerOrderStatus,
} from '@/features/seller/sellerSlice'
import { OrderTracker } from '@/components/order/OrderTracker'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatPrice } from '@/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateTime,
  orderStatusClasses,
  paymentStatusClasses,
} from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'
import type { OrderStatus } from '@/types'
import { selectTaxSettings, computeTax } from '@/features/admin/taxSettingsSlice'

export default function SellerOrderDetails() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { currentOrder: order, currentOrderStatus } = useAppSelector((state) => state.seller)
  const taxSettings = useAppSelector(selectTaxSettings)

  const [updating, setUpdating] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (id) dispatch(fetchSellerOrder(Number(id)))
    return () => {
      dispatch(clearCurrentSellerOrder())
    }
  }, [dispatch, id])

  if (currentOrderStatus === 'loading') return <PageLoader label="Loading order…" />

  if (!order) {
    return (
      <EmptyState
        title="Order not available"
        description="This order either does not exist or contains none of your products."
        action={
          <Link to="/seller/orders" className="btn-primary">
            Back to orders
          </Link>
        }
      />
    )
  }

  const handleStatus = async (status: OrderStatus) => {
    setUpdating(status)
    const result = await dispatch(
      updateSellerOrderStatus({ id: order.id, status, note: note.trim() || undefined })
    )
    setUpdating(null)

    if (updateSellerOrderStatus.fulfilled.match(result)) {
      notify.success(`Order marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}`)
      setNote('')
      // Status changes move orders between dashboard buckets.
      dispatch(fetchSellerStats())
    } else {
      notifyApiError(result.payload, 'Could not update the order')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Placed {formatDateTime(order.placedAt)}
            {order.orderSource === 'seller' ? ' · created by you' : ' · from the storefront'}
          </p>
        </div>
        <Link to="/seller/orders" className="btn-outline">Back to orders</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded px-2.5 py-1 text-xs font-semibold ${orderStatusClasses(order.status)}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        <span
          className={`rounded px-2.5 py-1 text-xs font-semibold ${paymentStatusClasses(order.paymentStatus)}`}
        >
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        </span>
        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {order.paymentMethodName}
        </span>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-slate-900">Order tracking</h3>
        <OrderTracker order={order} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Update status</h3>

        {!order.isSoleSeller ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This order also contains another seller’s products, so only an admin can change its
            status. You can still see and fulfil your own items.
          </p>
        ) : order.allowedNextStatuses.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            A {ORDER_STATUS_LABELS[order.status].toLowerCase()} order can no longer change status.
          </p>
        ) : (
          <>
            <div className="mb-3">
              <label className="label" htmlFor="note">Note (optional)</label>
              <input
                id="note"
                className="input-field"
                value={note}
                placeholder="Handed to the courier"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {order.allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={status === 'cancelled' ? 'btn-danger' : 'btn-primary'}
                  onClick={() => handleStatus(status)}
                  disabled={updating !== null}
                >
                  {updating === status ? (
                    <Spinner className="h-4 w-4" label="Updating…" />
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
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <h3 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
            My items in this order
          </h3>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{item.productName}</p>
                    {item.variantLabel ? (
                      <p className="text-sm text-slate-500">{item.variantLabel}</p>
                    ) : null}
                    {item.sku ? <p className="text-xs text-slate-400">SKU: {item.sku}</p> : null}
                    <p className="mt-1 text-sm text-slate-500">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatPrice(item.lineTotal)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100">
            <h3 className="px-4 py-3 font-semibold text-slate-900">Payment Breakdown</h3>
            <dl className="space-y-1.5 px-4 pb-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium text-slate-800">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.productDiscount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Product Discount</dt>
                  <dd className="font-medium text-emerald-600">− {formatPrice(order.productDiscount)}</dd>
                </div>
              ) : null}
              {order.couponDiscount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd className="font-medium text-emerald-600">− {formatPrice(order.couponDiscount)}</dd>
                </div>
              ) : null}
              {(() => {
                const tax = computeTax(order.total, order.orderSource || 'seller', taxSettings)
                return tax > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Tax ({taxSettings.rate}%)</dt>
                    <dd className="font-medium text-slate-700">{formatPrice(tax)}</dd>
                  </div>
                ) : null
              })()}
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="font-medium text-slate-800">
                  {order.deliveryCharge === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    formatPrice(order.deliveryCharge)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
                <dt className="font-bold text-slate-900">Total</dt>
                <dd className="font-bold text-slate-900">{formatPrice(order.total)}</dd>
              </div>
              {!order.isSoleSeller ? (
                <p className="text-xs text-slate-400 pt-1">
                  Includes other sellers' items. Your items subtotal: {formatPrice(order.sellerSubtotal)}
                </p>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Customer</h3>
            <p className="font-medium text-slate-800">{order.customer?.name}</p>
            <p className="text-sm text-slate-500">{order.customer?.email}</p>
            {order.customer?.phone ? (
              <p className="text-sm text-slate-500">{order.customer.phone}</p>
            ) : null}
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Delivery address</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">{order.shippingFullName}</span>
              <br />
              {order.shippingAddressLine1}
              {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
              <br />
              {order.shippingCountry}
              <br />
              Phone: {order.shippingPhone}
            </p>
          </div>

          {order.customerNote ? (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold text-slate-900">Note</h3>
              <p className="text-sm text-slate-600">{order.customerNote}</p>
            </div>
          ) : null}

          {order.statusHistory && order.statusHistory.length > 0 ? (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Status history</h3>
              <ol className="space-y-2 text-sm">
                {order.statusHistory.map((event) => (
                  <li key={event.id} className="flex justify-between gap-3">
                    <span className="text-slate-700">
                      {ORDER_STATUS_LABELS[event.status]}
                      {event.note ? (
                        <span className="block text-xs text-slate-400">{event.note}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
