import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchAdminDashboard } from '@/features/admin/adminSlice'
import {
  DEFAULT_RANGE,
  RangeFilter,
  isRangeReady,
  rangeParams,
  type RangeState,
} from '@/components/admin/RangeFilter'
import { ChartCard } from '@/components/charts/ChartCard'
import { RankBars } from '@/components/charts/RankBars'
import { ShareBar } from '@/components/charts/ShareBar'
import { StatTile } from '@/components/charts/StatTile'
import { SERIES_COLORS, formatCount } from '@/components/charts/chartUtils'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import { ORDER_STATUS_LABELS, formatDate, orderStatusClasses } from '@/utils/orders'
import { notifyApiError } from '@/utils/notify'
import type { OrderStatus } from '@/types'

const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export default function AdminDashboard() {
  const dispatch = useAppDispatch()
  const { dashboard, dashboardStatus } = useAppSelector((state) => state.admin)
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)

  useEffect(() => {
    if (!isRangeReady(range)) return

    dispatch(fetchAdminDashboard(rangeParams(range))).then((result) => {
      if (fetchAdminDashboard.rejected.match(result)) notifyApiError(result.payload)
    })
  }, [dispatch, range])

  if (!dashboard) return <PageLoader label="Loading the dashboard…" />

  const loading = dashboardStatus === 'loading'
  const { customers, sellers, products, orders, sales, bySource, byPaymentMethod } = dashboard

  const customerOrders = bySource.customer?.count ?? 0
  const sellerOrders = bySource.seller?.count ?? 0

  return (
    <div className="flex flex-col gap-6">
      <RangeFilter value={range} onChange={setRange} />

      {/* The one number the console leads with. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="viz-root card bg-brand-600 p-5 text-white sm:col-span-2">
          <p className="text-sm text-brand-100">Total sales</p>
          <p className="mt-1 text-4xl font-bold">{formatPrice(sales.totalSales)}</p>
          <p className="mt-2 text-xs text-brand-100">
            Every order placed in this period except cancellations. Of that,{' '}
            <span className="font-semibold text-white">{formatPrice(sales.revenue)}</span> has been
            settled as revenue.
          </p>
        </div>

        <StatTile
          label="Total orders"
          value={formatCount(orders.total)}
          hint={`${formatCount(orders.pending)} still to fulfil`}
          to="/admin/orders"
        />
        <StatTile
          label="Average order value"
          value={formatPrice(sales.averageOrderValue)}
          hint={`${formatCount(sales.unitsSold)} units sold`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total customers"
          value={formatCount(customers.total)}
          hint={`${formatCount(customers.active)} active · ${formatCount(customers.joinedInRange)} joined this period`}
          to="/admin/customers"
        />
        <StatTile
          label="Total sellers"
          value={formatCount(sellers.total)}
          hint={`${formatCount(sellers.active)} active · ${formatCount(sellers.inactive)} deactivated`}
          to="/admin/sellers"
        />
        <StatTile
          label="Total products"
          value={formatCount(products.total)}
          hint={`${formatCount(products.disabled)} disabled`}
          to="/admin/products"
        />
        <StatTile
          label="Inventory value"
          value={formatPrice(products.inventoryValue)}
          hint="Selling price × units on hand"
          to="/admin/inventory"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Pending orders"
          value={formatCount(orders.pending)}
          to="/admin/orders?status=pending"
        />
        <StatTile
          label="Completed orders"
          value={formatCount(orders.completed)}
          to="/admin/orders?status=delivered"
        />
        <StatTile
          label="Cancelled orders"
          value={formatCount(orders.cancelled)}
          tone={orders.cancelled > 0 ? 'warning' : 'default'}
          to="/admin/orders?status=cancelled"
        />
        <StatTile
          label="Needs stock attention"
          value={formatCount(products.outOfStock + products.lowStock)}
          hint={`${formatCount(products.outOfStock)} out of stock · ${formatCount(products.lowStock)} low`}
          tone={products.outOfStock > 0 ? 'danger' : 'default'}
          to="/admin/inventory?stockLevel=low"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Orders by status"
          subtitle="Where every order in this period currently sits"
          loading={loading}
          table={{
            columns: ['Status', 'Orders'],
            rows: STATUS_ORDER.map((status) => [
              ORDER_STATUS_LABELS[status],
              formatCount(orders.byStatus[status] ?? 0),
            ]),
          }}
        >
          <RankBars
            rows={STATUS_ORDER.map((status) => ({
              label: ORDER_STATUS_LABELS[status],
              value: orders.byStatus[status] ?? 0,
            }))}
            formatValue={formatCount}
            emptyMessage="No orders in this period."
          />
        </ChartCard>

        <ChartCard
          title="Where orders come from"
          subtitle="Storefront checkouts against orders a seller raised directly"
          legend={[
            { label: 'Customer orders', color: SERIES_COLORS[0], shape: 'rect' },
            { label: 'Seller orders', color: SERIES_COLORS[1], shape: 'rect' },
          ]}
          loading={loading}
          table={{
            columns: ['Source', 'Orders', 'Sales'],
            rows: [
              ['Customer orders', formatCount(customerOrders), formatPrice(bySource.customer?.value ?? 0)],
              ['Seller orders', formatCount(sellerOrders), formatPrice(bySource.seller?.value ?? 0)],
            ],
          }}
          action={
            <Link
              to="/admin/reports?tab=source"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Full report
            </Link>
          }
        >
          <ShareBar
            segments={[
              { label: 'Customer orders', value: customerOrders, color: SERIES_COLORS[0] },
              { label: 'Seller orders', value: sellerOrders, color: SERIES_COLORS[1] },
            ]}
            formatValue={formatCount}
          />
        </ChartCard>

        <ChartCard
          title="Orders by payment method"
          subtitle="Cash is always available; the rest are admin controlled"
          loading={loading}
          table={{
            columns: ['Method', 'Orders', 'Sales'],
            rows: byPaymentMethod.map((method) => [
              method.name,
              formatCount(method.count),
              formatPrice(method.value),
            ]),
          }}
          action={
            <Link
              to="/admin/reports?tab=payments"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Full report
            </Link>
          }
        >
          <RankBars
            rows={byPaymentMethod.map((method) => ({
              label: method.name,
              value: method.count,
              hint: formatPrice(method.value),
            }))}
            formatValue={formatCount}
            emptyMessage="No payments in this period."
          />
        </ChartCard>

        <ChartCard
          title="Best sellers"
          subtitle="Units sold in this period, across every seller"
          loading={loading}
          table={{
            columns: ['Product', 'Seller', 'Units', 'Revenue'],
            rows: dashboard.topProducts.map((product) => [
              product.name,
              product.seller?.name ?? 'Unassigned',
              formatCount(product.unitsSold),
              formatPrice(product.revenue),
            ]),
          }}
          action={
            <Link
              to="/admin/reports?tab=products"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Full report
            </Link>
          }
        >
          <RankBars
            rows={dashboard.topProducts.map((product) => ({
              label: product.name,
              value: product.unitsSold,
              hint: product.seller?.name ?? 'Unassigned',
            }))}
            formatValue={(value) => `${formatCount(value)} sold`}
            emptyMessage="Nothing sold in this period yet."
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Recent orders</h3>
            <Link to="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">
              All orders
            </Link>
          </div>

          {dashboard.recentOrders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No orders in this period.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {order.customer?.name ?? order.shippingFullName} · {formatDate(order.placedAt)}
                      {order.orderSource === 'seller' ? ' · seller order' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-slate-800">
                      {formatPrice(order.total)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${orderStatusClasses(order.status)}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Needs attention</h3>
            <Link
              to="/admin/inventory"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Inventory
            </Link>
          </div>

          {dashboard.lowStockProducts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">Everything is comfortably stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.lowStockProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {product.seller?.name ?? 'Unassigned'}
                      {!product.isActive ? ' · disabled' : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                      product.stock <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {product.stock <= 0 ? 'Out of stock' : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
