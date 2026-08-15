import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchMyOrders } from '@/features/orders/orderSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { BoxIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import {
  PAYMENT_STATUS_LABELS,
  formatDate,
  orderStatusClasses,
  orderStatusLabel,
  paymentStatusClasses,
} from '@/utils/orders'
import type { OrderStatus } from '@/types'

const STATUS_FILTERS: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function Orders() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  const { myOrders, myPagination, listStatus } = useAppSelector((state) => state.orders)

  const status = searchParams.get('status') || ''
  const page = Number(searchParams.get('page')) || 1

  useEffect(() => {
    dispatch(fetchMyOrders({ status: status || undefined, page }))
  }, [dispatch, status, page])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  if (listStatus === 'loading' && myOrders.length === 0) {
    return <PageLoader label="Loading your orders…" />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          {myPagination.total} order{myPagination.total === 1 ? '' : 's'} placed
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            onClick={() => updateParams({ status: filter.value })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === filter.value
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {myOrders.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="h-12 w-12" />}
          title={status ? `No ${status} orders` : 'You have not ordered yet'}
          description="Once you place an order it will show up here with its live status."
          action={
            <Link to="/products" className="btn-primary">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {myOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.orderNumber}`}
              className="card block p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">Placed on {formatDate(order.placedAt)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClasses(order.status)}`}
                  >
                    {orderStatusLabel(order.status, order.orderSource)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClasses(order.paymentStatus)}`}
                  >
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {order.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                ))}
                {order.items.length > 4 ? (
                  <span className="text-xs text-slate-500">+{order.items.length - 4} more</span>
                ) : null}

                <div className="ml-auto flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-slate-500">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) ·{' '}
                      {order.paymentMethodName}
                    </p>
                    <p className="font-semibold text-slate-900">{formatPrice(order.total)}</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </Link>
          ))}

          <Pagination
            page={myPagination.page}
            totalPages={myPagination.totalPages}
            onChange={(nextPage) => updateParams({ page: nextPage }, true)}
          />
        </div>
      )}
    </div>
  )
}
