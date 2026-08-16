import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { cancelOrder, clearCurrentOrder, fetchOrder } from '@/features/orders/orderSlice'
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
import { selectTaxSettings, computeTax } from '@/features/admin/taxSettingsSlice'

export default function OrderDetails() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()

  const { current: order, detailStatus, error } = useAppSelector((state) => state.orders)
  const taxSettings = useAppSelector(selectTaxSettings)

  const [cancelling, setCancelling] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')

  const justPlaced = searchParams.get('placed') === '1'

  useEffect(() => {
    if (orderNumber) dispatch(fetchOrder(orderNumber))
    return () => {
      dispatch(clearCurrentOrder())
    }
  }, [dispatch, orderNumber])

  const handleCancel = async () => {
    if (!order) return

    setCancelling(true)
    const result = await dispatch(cancelOrder({ id: order.id, reason: reason.trim() || undefined }))
    setCancelling(false)
    setShowCancel(false)

    if (cancelOrder.fulfilled.match(result)) notify.success('Order cancelled')
    else notifyApiError(result.payload, 'Could not cancel this order')
  }

  if (detailStatus === 'loading') return <PageLoader label="Loading order…" />

  if (detailStatus === 'failed' || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Order not found"
          description={error ?? 'This order does not exist or does not belong to your account.'}
          action={
            <Link to="/orders" className="btn-primary">
              Back to my orders
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/orders" className="hover:text-brand-600">My orders</Link>
        <span>/</span>
        <span className="text-slate-800">{order.orderNumber}</span>
      </nav>

      {justPlaced ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="font-semibold text-emerald-800">Thank you, your order is confirmed</p>
          <p className="mt-1 text-sm text-emerald-700">
            We have received order {order.orderNumber}. You can track its progress on this page.
          </p>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">Placed on {formatDateTime(order.placedAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <section className="card mb-6 p-5">
        <h2 className="mb-5 font-semibold text-slate-900">Order tracking</h2>
        <OrderTracker order={order} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">
              Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>

            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col">
                    {item.brandName ? (
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {item.brandName}
                      </span>
                    ) : null}

                    {item.productSlug ? (
                      <Link
                        to={`/product/${item.productSlug}`}
                        className="text-sm font-medium text-slate-800 hover:text-brand-600"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{item.productName}</span>
                    )}

                    {item.variantLabel ? (
                      <span className="text-xs text-slate-500">{item.variantLabel}</span>
                    ) : null}

                    <span className="mt-auto text-xs text-slate-500">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                      {item.originalPrice > item.unitPrice ? (
                        <span className="ml-1 line-through">{formatPrice(item.originalPrice)}</span>
                      ) : null}
                    </span>
                  </div>

                  <div className="text-right text-sm font-semibold text-slate-900">
                    {formatPrice(item.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {order.statusHistory && order.statusHistory.length > 0 ? (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-slate-900">Status history</h2>
              <ul className="space-y-3">
                {order.statusHistory.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div>
                      <p className="font-medium text-slate-800">
                        {ORDER_STATUS_LABELS[event.status]}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
                      {event.note ? <p className="text-xs text-slate-500">{event.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Payment</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Product total</dt>
                <dd className="font-medium text-slate-800">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.productDiscount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Product discount</dt>
                  <dd className="font-medium text-emerald-600">
                    − {formatPrice(order.productDiscount)}
                  </dd>
                </div>
              ) : null}
              {order.couponDiscount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Coupon ({order.couponCode})</dt>
                  <dd className="font-medium text-emerald-600">
                    − {formatPrice(order.couponDiscount)}
                  </dd>
                </div>
              ) : null}
              {(() => {
                const tax = computeTax(order.total, order.orderSource, taxSettings)
                return tax > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Tax ({taxSettings.rate}%)</dt>
                    <dd className="font-medium text-slate-700">{formatPrice(tax)}</dd>
                  </div>
                ) : null
              })()}
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery charge</dt>
                <dd className="font-medium text-slate-800">
                  {order.deliveryCharge === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    formatPrice(order.deliveryCharge)
                  )}
                </dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-slate-900">{formatPrice(order.total)}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="text-slate-500">
                Paid with <span className="font-medium text-slate-800">{order.paymentMethodName}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Status: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 font-semibold text-slate-900">Delivery address</h2>
            <p className="text-sm font-medium text-slate-800">{order.shippingFullName}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {order.shippingAddressLine1}
              {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''}
              {order.shippingLandmark ? `, ${order.shippingLandmark}` : ''}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
              <br />
              {order.shippingCountry}
            </p>
            <p className="mt-1 text-sm text-slate-500">Phone: {order.shippingPhone}</p>

            {order.customerNote ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Note: {order.customerNote}
              </p>
            ) : null}
          </section>

          {order.canBeCancelledByCustomer ? (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold text-slate-900">Need to change something?</h2>
              <p className="mb-3 text-sm text-slate-500">
                You can cancel while the order is still being prepared.
              </p>

              {showCancel ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-danger flex-1"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? <Spinner className="h-4 w-4" /> : 'Confirm cancellation'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowCancel(false)}
                    >
                      Keep order
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-outline w-full text-rose-600"
                  onClick={() => setShowCancel(true)}
                >
                  Cancel this order
                </button>
              )}
            </section>
          ) : null}

          <Link to="/products" className="btn-outline w-full">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
