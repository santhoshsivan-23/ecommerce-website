import type { Order } from '@/types'
import { ORDER_FLOW, ORDER_STATUS_LABELS, formatDateTime } from '@/utils/orders'

interface OrderTrackerProps {
  order: Order
}

/** Order placed → Confirmed → Processing → Shipped → Delivered. */
export function OrderTracker({ order }: OrderTrackerProps) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="font-semibold text-rose-700">Order cancelled</p>
        <p className="mt-1 text-sm text-rose-600">
          {order.cancelReason || 'This order was cancelled.'}
        </p>
        <p className="mt-1 text-xs text-rose-500">{formatDateTime(order.cancelledAt)}</p>
      </div>
    )
  }

  const currentIndex = ORDER_FLOW.indexOf(order.status)

  // The timeline reads its timestamps from the recorded history.
  const reachedAt = (status: string) =>
    order.statusHistory?.find((event) => event.status === status)?.createdAt ?? null

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {ORDER_FLOW.map((status, index) => {
        const done = index <= currentIndex
        const isCurrent = index === currentIndex
        const timestamp = reachedAt(status)

        return (
          <li key={status} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-400'
                }`}
                aria-hidden="true"
              >
                {done ? '✓' : index + 1}
              </span>

              {index < ORDER_FLOW.length - 1 ? (
                <span
                  className={`w-0.5 flex-1 sm:h-0.5 sm:w-full ${
                    index < currentIndex ? 'bg-brand-600' : 'bg-slate-200'
                  }`}
                />
              ) : null}
            </div>

            <div className="pb-6 sm:pb-0 sm:pr-4">
              <p
                className={`text-sm font-medium ${
                  isCurrent ? 'text-brand-700' : done ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {ORDER_STATUS_LABELS[status]}
              </p>
              {timestamp ? (
                <p className="text-xs text-slate-400">{formatDateTime(timestamp)}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
