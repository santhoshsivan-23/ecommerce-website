import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearCustomerDetail,
  fetchCustomerDetail,
  fetchCustomerOrders,
  setCustomerStatus,
} from '@/features/admin/adminSlice'
import { ChartCard } from '@/components/charts/ChartCard'
import { RankBars } from '@/components/charts/RankBars'
import { StatTile } from '@/components/charts/StatTile'
import { formatCount } from '@/components/charts/chartUtils'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  orderStatusClasses,
  paymentStatusClasses,
} from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'
import type { OrderStatus } from '@/types'

const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export default function AdminCustomerDetails() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { customerDetail, customerOrders, customerOrderPagination, detailStatus } = useAppSelector(
    (state) => state.admin
  )

  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!id) return

    dispatch(fetchCustomerDetail(Number(id))).then((result) => {
      if (fetchCustomerDetail.rejected.match(result)) notifyApiError(result.payload)
    })
    return () => {
      dispatch(clearCustomerDetail())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (!id) return
    dispatch(fetchCustomerOrders({ id: Number(id), page }))
  }, [dispatch, id, page])

  if (detailStatus === 'loading' && !customerDetail) return <PageLoader label="Loading customer…" />
  if (!customerDetail) {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-600">This customer could not be loaded.</p>
        <Link to="/admin/customers" className="mt-3 inline-block text-sm font-semibold text-brand-600">
          Back to customers
        </Link>
      </div>
    )
  }

  const { customer, ordersByStatus, purchaseHistory } = customerDetail

  const toggleStatus = async () => {
    const result = await dispatch(
      setCustomerStatus({ id: customer.id, isActive: !customer.isActive })
    )
    if (setCustomerStatus.fulfilled.match(result)) notify.success(result.payload.message)
    else notifyApiError(result.payload)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/customers" className="text-sm text-brand-600 hover:underline">
            ← Customers
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{customer.name}</h2>
          <p className="text-sm text-slate-500">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ''} · joined{' '}
            {formatDate(customer.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              customer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {customer.isActive ? 'Active' : 'Deactivated'}
          </span>
          <button type="button" onClick={toggleStatus} className="btn-outline text-xs">
            {customer.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Orders placed" value={formatCount(customer.orderCount)} />
        <StatTile label="Total spent" value={formatPrice(customer.totalSpent)} hint="Excluding cancelled orders" />
        <StatTile
          label="Cancelled"
          value={formatCount(customer.cancelledOrders)}
          tone={customer.cancelledOrders > 0 ? 'warning' : 'default'}
        />
        <StatTile label="Last order" value={formatDate(customer.lastOrderAt)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Order history by status"
          subtitle="Every order this customer has ever placed"
          table={{
            columns: ['Status', 'Orders'],
            rows: STATUS_ORDER.map((status) => [
              ORDER_STATUS_LABELS[status],
              formatCount(ordersByStatus[status] ?? 0),
            ]),
          }}
        >
          <RankBars
            rows={STATUS_ORDER.map((status) => ({
              label: ORDER_STATUS_LABELS[status],
              value: ordersByStatus[status] ?? 0,
            }))}
            formatValue={formatCount}
            emptyMessage="This customer has not ordered yet."
          />
        </ChartCard>

        <ChartCard
          title="What they buy"
          subtitle="Units bought per product, across all live orders"
          table={{
            columns: ['Product', 'Units', 'Spent', 'Last bought'],
            rows: purchaseHistory.map((row) => [
              row.productName,
              formatCount(row.quantity),
              formatPrice(row.spent),
              formatDate(row.lastBoughtAt),
            ]),
          }}
        >
          <RankBars
            rows={purchaseHistory.map((row) => ({
              label: row.productName,
              value: row.quantity,
              hint: formatPrice(row.spent),
            }))}
            formatValue={(value) => `${formatCount(value)} bought`}
            emptyMessage="Nothing purchased yet."
          />
        </ChartCard>
      </div>

      {customer.addresses && customer.addresses.length > 0 ? (
        <div className="card p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Saved addresses</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {customer.addresses.map((address) => (
              <div key={address.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">
                  {address.fullName}
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                    {address.label}
                  </span>
                  {address.isDefault ? (
                    <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-slate-600">
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                </p>
                <p className="text-slate-600">
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p className="mt-1 text-xs text-slate-400">{address.phone}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">
            Orders{' '}
            <span className="text-sm font-normal text-slate-500">
              ({customerOrderPagination.total})
            </span>
          </h3>
          <Link
            to={`/admin/orders?customerId=${customer.id}`}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Open in order manager
          </Link>
        </div>

        {customerOrders.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">This customer has not ordered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-medium text-slate-800 hover:text-brand-600"
                      >
                        {order.orderNumber}
                      </Link>
                      {order.orderSource === 'seller' ? (
                        <p className="text-xs text-slate-400">Raised by a seller</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(order.placedAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${paymentStatusClasses(order.paymentStatus)}`}
                      >
                        {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClasses(order.status)}`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={customerOrderPagination.page}
        totalPages={customerOrderPagination.totalPages}
        onChange={setPage}
      />
    </div>
  )
}
