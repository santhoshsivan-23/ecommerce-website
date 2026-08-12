import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchSellers } from '@/features/admin/adminSlice'
import {
  fetchOrderSourceReport,
  fetchPaymentReport,
  fetchProductReport,
  fetchSalesReport,
  fetchSellerReport,
} from '@/features/reports/reportSlice'
import {
  DEFAULT_RANGE,
  RangeFilter,
  isRangeReady,
  rangeParams,
  type RangeState,
} from '@/components/admin/RangeFilter'
import { ChartCard } from '@/components/charts/ChartCard'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { RankBars } from '@/components/charts/RankBars'
import { ShareBar } from '@/components/charts/ShareBar'
import { StatTile } from '@/components/charts/StatTile'
import { TrendChart } from '@/components/charts/TrendChart'
import {
  SERIES_COLORS,
  compactPrice,
  formatCount,
  formatPeriod,
} from '@/components/charts/chartUtils'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import { PAYMENT_STATUS_LABELS } from '@/utils/orders'
import { notifyApiError } from '@/utils/notify'
import type { ApiFailure, PaymentStatus, ReportGroupBy } from '@/types'

type Tab = 'sales' | 'products' | 'sellers' | 'payments' | 'source'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'sales', label: 'Sales' },
  { value: 'products', label: 'Products' },
  { value: 'sellers', label: 'Sellers' },
  { value: 'payments', label: 'Payments' },
  { value: 'source', label: 'Order source' },
]

const GROUPS: Array<{ value: ReportGroupBy; label: string }> = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending', 'refunded', 'failed']

export default function AdminReports() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  const { sales, products, sellers: sellerReport, payments, orderSource, status } = useAppSelector(
    (state) => state.reports
  )
  const sellers = useAppSelector((state) => state.admin.sellers)

  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)

  const tab = (searchParams.get('tab') || 'sales') as Tab
  const groupBy = (searchParams.get('groupBy') || 'day') as ReportGroupBy
  const sellerId = searchParams.get('sellerId') || ''

  useEffect(() => {
    if (sellers.length === 0) dispatch(fetchSellers({ limit: 100 }))
  }, [dispatch, sellers.length])

  useEffect(() => {
    if (!isRangeReady(range)) return

    const query = { ...rangeParams(range), sellerId: sellerId || undefined }

    // Each branch dispatches its own thunk: one shared `dispatch(...)` over a
    // union of thunk actions is not something the store's types can resolve.
    const load = () => {
      switch (tab) {
        case 'products':
          return dispatch(fetchProductReport(query))
        case 'sellers':
          return dispatch(fetchSellerReport(query))
        case 'payments':
          return dispatch(fetchPaymentReport(query))
        case 'source':
          return dispatch(fetchOrderSourceReport(query))
        default:
          return dispatch(fetchSalesReport({ ...query, groupBy }))
      }
    }

    load().then((result) => {
      if (result.meta.requestStatus === 'rejected') {
        notifyApiError((result as { payload?: ApiFailure }).payload)
      }
    })
  }, [dispatch, tab, groupBy, sellerId, range])

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  const loading = status === 'loading'
  const sellerName = sellers.find((seller) => String(seller.id) === sellerId)?.name

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Reports</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-600">Sales</span> is every order placed except
          cancellations. <span className="font-medium text-slate-600">Revenue</span> is the part
          that has actually been settled — cash counts only once it is collected on delivery.
        </p>
      </div>

      <RangeFilter value={range} onChange={setRange}>
        {tab === 'sales' ? (
          <label className="text-sm text-slate-600">
            <span className="label">Group by</span>
            <select
              className="input-field w-auto"
              value={groupBy}
              onChange={(event) => updateParams({ groupBy: event.target.value })}
            >
              {GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {tab !== 'sellers' && tab !== 'source' ? (
          <label className="text-sm text-slate-600">
            <span className="label">Seller</span>
            <select
              className="input-field w-auto"
              value={sellerId}
              onChange={(event) => updateParams({ sellerId: event.target.value })}
            >
              <option value="">All sellers</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </RangeFilter>

      <nav className="flex flex-wrap gap-2" aria-label="Report type">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => updateParams({ tab: entry.value })}
            aria-current={tab === entry.value ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === entry.value
                ? 'bg-brand-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {sellerName && tab !== 'sellers' && tab !== 'source' ? (
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-800">
          Scoped to {sellerName}. Figures come from their own order lines only.
        </p>
      ) : null}

      {/* ------------------------------- Sales ------------------------------- */}
      {tab === 'sales' ? (
        !sales ? (
          <PageLoader label="Loading sales…" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Sales" value={formatPrice(sales.totals.sales)} />
              <StatTile label="Revenue settled" value={formatPrice(sales.totals.revenue)} />
              <StatTile label="Orders" value={formatCount(sales.totals.orders)} />
              <StatTile
                label="Average order value"
                value={formatPrice(sales.totals.averageOrderValue)}
                hint={`${formatCount(sales.totals.units)} units sold`}
              />
            </div>

            <ChartCard
              title="Sales over time"
              subtitle={`${GROUPS.find((group) => group.value === sales.groupBy)?.label} totals`}
              legend={[
                { label: 'Sales', color: SERIES_COLORS[0] },
                { label: 'Revenue settled', color: SERIES_COLORS[1] },
              ]}
              loading={loading}
              table={{
                columns: ['Period', 'Orders', 'Units', 'Sales', 'Revenue'],
                rows: sales.rows.map((row) => [
                  formatPeriod(row.period, sales.groupBy),
                  formatCount(row.orders),
                  formatCount(row.units),
                  formatPrice(row.sales),
                  formatPrice(row.revenue),
                ]),
              }}
            >
              <TrendChart
                labels={sales.rows.map((row) => formatPeriod(row.period, sales.groupBy))}
                series={[
                  {
                    label: 'Sales',
                    color: SERIES_COLORS[0],
                    values: sales.rows.map((row) => row.sales),
                  },
                  {
                    label: 'Revenue settled',
                    color: SERIES_COLORS[1],
                    values: sales.rows.map((row) => row.revenue),
                  },
                ]}
                formatValue={formatPrice}
                formatTick={compactPrice}
              />
            </ChartCard>

            <ChartCard
              title="Orders over time"
              subtitle="How many orders each period brought in"
              loading={loading}
              table={{
                columns: ['Period', 'Orders'],
                rows: sales.rows.map((row) => [
                  formatPeriod(row.period, sales.groupBy),
                  formatCount(row.orders),
                ]),
              }}
            >
              <ColumnChart
                labels={sales.rows.map((row) => formatPeriod(row.period, sales.groupBy))}
                values={sales.rows.map((row) => row.orders)}
                formatValue={formatCount}
              />
            </ChartCard>
          </div>
        )
      ) : null}

      {/* ------------------------------ Products ----------------------------- */}
      {tab === 'products' ? (
        !products ? (
          <PageLoader label="Loading products…" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile
                label="Units sold (top products)"
                value={formatCount(products.totals.unitsSold)}
              />
              <StatTile
                label="Revenue (top products)"
                value={formatPrice(products.totals.revenue)}
              />
            </div>

            <ChartCard
              title="Best-selling products"
              subtitle="Ranked by units sold in this period"
              loading={loading}
              table={{
                columns: ['Product', 'Seller', 'Qty sold', 'Revenue', 'Stock'],
                rows: products.bestSelling.map((product) => [
                  product.name,
                  product.seller?.name ?? 'Unassigned',
                  formatCount(product.unitsSold),
                  formatPrice(product.revenue),
                  formatCount(product.stock),
                ]),
              }}
            >
              <RankBars
                rows={products.bestSelling.map((product) => ({
                  label: product.name,
                  value: product.unitsSold,
                  hint: formatPrice(product.revenue),
                }))}
                formatValue={(value) => `${formatCount(value)} sold`}
                emptyMessage="Nothing sold in this period."
              />
            </ChartCard>

            <div className="card overflow-x-auto">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-900">Low-selling products</h3>
                <p className="text-xs text-slate-500">
                  The slowest movers, including anything that sold nothing at all — these are the
                  ones tying up stock.
                </p>
              </div>
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3 text-right">Qty sold</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.lowSelling.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="font-medium text-slate-800 hover:text-brand-600"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-slate-400">{product.category?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.seller?.name ?? 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {product.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatPrice(product.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {product.stock}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {product.isActive ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {/* ------------------------------- Sellers ----------------------------- */}
      {tab === 'sellers' ? (
        !sellerReport ? (
          <PageLoader label="Loading sellers…" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Sellers" value={formatCount(sellerReport.totals.sellers)} />
              <StatTile label="Orders" value={formatCount(sellerReport.totals.orders)} />
              <StatTile label="Sales" value={formatPrice(sellerReport.totals.sales)} />
              <StatTile label="Revenue settled" value={formatPrice(sellerReport.totals.revenue)} />
            </div>

            <ChartCard
              title="Seller performance"
              subtitle="Sales credited from each seller's own order lines"
              loading={loading}
              table={{
                columns: ['Seller', 'Orders', 'Units', 'Sales', 'Revenue'],
                rows: sellerReport.sellers.map((seller) => [
                  seller.name,
                  formatCount(seller.orderCount),
                  formatCount(seller.unitsSold),
                  formatPrice(seller.sales),
                  formatPrice(seller.revenue),
                ]),
              }}
            >
              <RankBars
                rows={sellerReport.sellers.map((seller) => ({
                  label: seller.name,
                  value: seller.sales,
                  hint: `${formatCount(seller.orderCount)} orders`,
                }))}
                formatValue={formatPrice}
                emptyMessage="No seller activity in this period."
              />
            </ChartCard>

            <div className="card overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-right">Completed</th>
                    <th className="px-4 py-3 text-right">Products sold</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerReport.sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/sellers/${seller.id}`}
                          className="font-medium text-slate-800 hover:text-brand-600"
                        >
                          {seller.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {seller.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                        {seller.pendingOrders}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {seller.completedOrders}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {seller.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                        {formatPrice(seller.sales)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatPrice(seller.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {/* ------------------------------ Payments ----------------------------- */}
      {tab === 'payments' ? (
        !payments ? (
          <PageLoader label="Loading payments…" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Orders" value={formatCount(payments.totals.orders)} />
              <StatTile label="Sales" value={formatPrice(payments.totals.sales)} />
              <StatTile label="Revenue settled" value={formatPrice(payments.totals.revenue)} />
              <StatTile
                label="Awaiting payment"
                value={formatCount(payments.byStatus.pending ?? 0)}
                tone={(payments.byStatus.pending ?? 0) > 0 ? 'warning' : 'default'}
              />
            </div>

            <ChartCard
              title="Orders by payment method"
              subtitle="How customers and sellers chose to pay"
              loading={loading}
              table={{
                columns: ['Method', 'Orders', 'Sales', 'Revenue', 'Paid', 'Pending'],
                rows: payments.methods.map((method) => [
                  method.name,
                  formatCount(method.orderCount),
                  formatPrice(method.sales),
                  formatPrice(method.revenue),
                  formatCount(method.paidCount),
                  formatCount(method.pendingCount),
                ]),
              }}
            >
              <RankBars
                rows={payments.methods.map((method) => ({
                  label: method.name,
                  value: method.orderCount,
                  hint: formatPrice(method.sales),
                }))}
                formatValue={(value) => `${formatCount(value)} orders`}
                emptyMessage="No payments in this period."
              />
            </ChartCard>

            <div className="card p-4">
              <h3 className="mb-3 font-semibold text-slate-900">Payment status</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                {PAYMENT_STATUSES.map((paymentStatus) => (
                  <div key={paymentStatus} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">{PAYMENT_STATUS_LABELS[paymentStatus]}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                      {formatCount(payments.byStatus[paymentStatus] ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : null}

      {/* ---------------------------- Order source --------------------------- */}
      {tab === 'source' ? (
        !orderSource ? (
          <PageLoader label="Loading order sources…" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Total orders" value={formatCount(orderSource.totals.orders)} />
              {orderSource.sources.map((source) => (
                <StatTile
                  key={source.source}
                  label={source.source === 'customer' ? 'Customer orders' : 'Seller orders'}
                  value={formatCount(source.orderCount)}
                  hint={`${source.share}% of orders · ${formatPrice(source.sales)}`}
                />
              ))}
            </div>

            <ChartCard
              title="How orders are being generated"
              subtitle="Sellers can raise orders directly, so the split matters"
              legend={[
                { label: 'Customer orders', color: SERIES_COLORS[0], shape: 'rect' },
                { label: 'Seller orders', color: SERIES_COLORS[1], shape: 'rect' },
              ]}
              loading={loading}
              table={{
                columns: ['Source', 'Orders', 'Share', 'Sales', 'Cancelled'],
                rows: orderSource.sources.map((source) => [
                  source.source === 'customer' ? 'Customer orders' : 'Seller orders',
                  formatCount(source.orderCount),
                  `${source.share}%`,
                  formatPrice(source.sales),
                  formatCount(source.cancelledCount),
                ]),
              }}
            >
              <ShareBar
                segments={orderSource.sources.map((source, index) => ({
                  label: source.source === 'customer' ? 'Customer orders' : 'Seller orders',
                  value: source.orderCount,
                  color: SERIES_COLORS[index] ?? SERIES_COLORS[0],
                }))}
                formatValue={(value) => `${formatCount(value)} orders`}
              />
            </ChartCard>

            <ChartCard
              title="Seller-raised orders by seller"
              subtitle="Who is creating orders directly"
              loading={loading}
              table={{
                columns: ['Seller', 'Orders', 'Sales'],
                rows: orderSource.byCreator.map((creator) => [
                  creator.name,
                  formatCount(creator.orderCount),
                  formatPrice(creator.sales),
                ]),
              }}
            >
              <RankBars
                rows={orderSource.byCreator.map((creator) => ({
                  label: creator.name,
                  value: creator.orderCount,
                  hint: formatPrice(creator.sales),
                }))}
                formatValue={(value) => `${formatCount(value)} orders`}
                emptyMessage="No seller raised an order in this period."
              />
            </ChartCard>
          </div>
        )
      ) : null}
    </div>
  )
}
