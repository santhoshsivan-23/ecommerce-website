import { formatPrice } from '@/utils/format'
import type { CartSummary } from '@/types'

interface OrderSummaryCardProps {
  summary: CartSummary
  couponCode?: string | null
  title?: string
  children?: React.ReactNode
}

/**
 * The one place order money is rendered:
 * subtotal - discounts + delivery = total.
 */
export function OrderSummaryCard({
  summary,
  couponCode,
  title = 'Order summary',
  children,
}: OrderSummaryCardProps) {
  const amountToFreeDelivery = summary.freeDeliveryThreshold - summary.itemsTotal

  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">
            Product total {summary.itemCount > 0 ? `(${summary.itemCount} items)` : ''}
          </dt>
          <dd className="font-medium text-slate-800">{formatPrice(summary.subtotal)}</dd>
        </div>

        {summary.productDiscount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Product discount</dt>
            <dd className="font-medium text-emerald-600">
              − {formatPrice(summary.productDiscount)}
            </dd>
          </div>
        ) : null}

        {summary.couponDiscount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">
              Coupon discount {couponCode ? <span className="font-medium">({couponCode})</span> : null}
            </dt>
            <dd className="font-medium text-emerald-600">
              − {formatPrice(summary.couponDiscount)}
            </dd>
          </div>
        ) : null}

        <div className="flex justify-between">
          <dt className="text-slate-500">Delivery charge</dt>
          <dd className="font-medium text-slate-800">
            {summary.deliveryCharge === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              formatPrice(summary.deliveryCharge)
            )}
          </dd>
        </div>

        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base">
          <dt className="font-semibold text-slate-900">Total payable</dt>
          <dd className="font-bold text-slate-900">{formatPrice(summary.total)}</dd>
        </div>
      </dl>

      {summary.discount > 0 ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          You save {formatPrice(summary.discount)} on this order.
        </p>
      ) : null}

      {summary.deliveryCharge > 0 && amountToFreeDelivery > 0 ? (
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          Add {formatPrice(amountToFreeDelivery)} more for free delivery.
        </p>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
