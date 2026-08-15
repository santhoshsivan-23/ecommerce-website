import type { Order } from '@/types'
import { ORDER_FLOW, ORDER_STATUS_LABELS, formatDateTime } from '@/utils/orders'

interface OrderTrackerProps {
  order: Order
}

const SELLER_STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  delivered: 'Completed',
}

/**
 * Renders the order timeline based on order source:
 * Seller-created direct order: Order Placed → Completed
 * Customer storefront order: Order Placed → Confirmed → Processing → Shipped → Delivered
 */
export function OrderTracker({ order }: OrderTrackerProps) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="font-bold text-rose-700">Order Cancelled</p>
        <p className="mt-1 text-xs text-rose-600">
          {order.cancelReason || 'This order was cancelled.'}
        </p>
        <p className="mt-1 text-[11px] text-rose-500">{formatDateTime(order.cancelledAt)}</p>
      </div>
    )
  }

  const isSeller = order.orderSource === 'seller'
  const flow = isSeller ? ['pending', 'delivered'] : ORDER_FLOW
  const labels: Record<string, string> = isSeller ? SELLER_STATUS_LABELS : ORDER_STATUS_LABELS

  const currentIndex = isSeller
    ? order.status === 'delivered' ? 1 : 0
    : ORDER_FLOW.indexOf(order.status)

  const reachedAt = (status: string) => {
    if (status === 'pending') return order.placedAt || null
    if (status === 'delivered') return order.deliveredAt || order.statusHistory?.find((e) => e.status === 'delivered')?.createdAt || null
    return order.statusHistory?.find((event) => event.status === status)?.createdAt ?? null
  }

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {flow.map((status, index) => {
        const done = index <= currentIndex
        const isCurrent = index === currentIndex
        const timestamp = reachedAt(status)

        return (
          <li key={status} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-400'
                }`}
                aria-hidden="true"
              >
                {done ? '✓' : index + 1}
              </span>

              {index < flow.length - 1 ? (
                <span
                  className={`w-0.5 flex-1 sm:h-0.5 sm:w-full ${
                    index < currentIndex ? 'bg-orange-600' : 'bg-slate-200'
                  }`}
                />
              ) : null}
            </div>

            <div className="pb-6 sm:pb-0 sm:pr-4">
              <p
                className={`text-xs font-bold ${
                  isCurrent ? 'text-orange-600' : done ? 'text-zinc-900' : 'text-slate-400'
                }`}
              >
                {labels[status] || ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status}
              </p>
              {timestamp ? (
                <p className="text-[11px] text-slate-400 font-medium">{formatDateTime(timestamp)}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
