import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchAnalytics } from '@/features/reports/reportSlice'
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
import { ORDER_STATUS_LABELS } from '@/utils/orders'
import { notifyApiError } from '@/utils/notify'
import type { ReportGroupBy } from '@/types'

const GROUPS: Array<{ value: ReportGroupBy; label: string }> = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

export default function AdminAnalytics() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { analytics, analyticsStatus } = useAppSelector((state) => state.reports)

  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const groupBy = (searchParams.get('groupBy') || 'day') as ReportGroupBy

  useEffect(() => {
    if (!isRangeReady(range)) return

    dispatch(fetchAnalytics({ ...rangeParams(range), groupBy })).then((result) => {
      if (fetchAnalytics.rejected.match(result)) notifyApiError(result.payload)
    })
  }, [dispatch, range, groupBy])

  if (!analytics) return <PageLoader label="Loading analytics…" />

  const loading = analyticsStatus === 'loading'
  const label = (period: string) => formatPeriod(period, analytics.groupBy)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Business analytics</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trends across sales, orders, growth and payment behaviour. Every chart on this page
          reports the same slice as the filter above it.
        </p>
      </div>

      <RangeFilter value={range} onChange={setRange}>
        <label className="text-sm text-slate-600">
          <span className="label">Group by</span>
          <select
            className="input-field w-auto"
            value={groupBy}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams)
              next.set('groupBy', event.target.value)
              setSearchParams(next)
            }}
          >
            {GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
      </RangeFilter>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Sales"
          value={formatPrice(analytics.totals.sales)}
          trend={analytics.salesTrend.map((row) => row.sales)}
        />
        <StatTile
          label="Revenue settled"
          value={formatPrice(analytics.totals.revenue)}
          trend={analytics.salesTrend.map((row) => row.revenue)}
        />
        <StatTile
          label="Orders"
          value={formatCount(analytics.totals.orders)}
          trend={analytics.orderTrend.map((row) => row.orders)}
        />
        <StatTile
          label="Units sold"
          value={formatCount(analytics.totals.units)}
          trend={analytics.salesTrend.map((row) => row.units)}
        />
      </div>

      <ChartCard
        title="Sales trend"
        subtitle="Business written against what has actually been settled"
        legend={[
          { label: 'Sales', color: SERIES_COLORS[0] },
          { label: 'Revenue settled', color: SERIES_COLORS[1] },
        ]}
        loading={loading}
        table={{
          columns: ['Period', 'Sales', 'Revenue', 'Orders', 'Units'],
          rows: analytics.salesTrend.map((row) => [
            label(row.period),
            formatPrice(row.sales),
            formatPrice(row.revenue),
            formatCount(row.orders),
            formatCount(row.units),
          ]),
        }}
      >
        <TrendChart
          labels={analytics.salesTrend.map((row) => label(row.period))}
          series={[
            {
              label: 'Sales',
              color: SERIES_COLORS[0],
              values: analytics.salesTrend.map((row) => row.sales),
            },
            {
              label: 'Revenue settled',
              color: SERIES_COLORS[1],
              values: analytics.salesTrend.map((row) => row.revenue),
            },
          ]}
          formatValue={formatPrice}
          formatTick={compactPrice}
          height={260}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Order trend"
          subtitle="Orders placed each period"
          loading={loading}
          table={{
            columns: ['Period', 'Orders'],
            rows: analytics.orderTrend.map((row) => [label(row.period), formatCount(row.orders)]),
          }}
        >
          <ColumnChart
            labels={analytics.orderTrend.map((row) => label(row.period))}
            values={analytics.orderTrend.map((row) => row.orders)}
            formatValue={formatCount}
          />
        </ChartCard>

        <ChartCard
          title="Order status distribution"
          subtitle="Where the orders in this period ended up"
          loading={loading}
          table={{
            columns: ['Status', 'Orders'],
            rows: analytics.statusDistribution.map((row) => [
              ORDER_STATUS_LABELS[row.status],
              formatCount(row.count),
            ]),
          }}
        >
          <RankBars
            rows={analytics.statusDistribution.map((row) => ({
              label: ORDER_STATUS_LABELS[row.status],
              value: row.count,
            }))}
            formatValue={formatCount}
            emptyMessage="No orders in this period."
          />
        </ChartCard>

        {/* Customers and sellers grow on wildly different scales, so they get their
            own charts rather than a second y-axis. */}
        <ChartCard
          title="Customer growth"
          subtitle="Running total of customer accounts"
          loading={loading}
          table={{
            columns: ['Period', 'Joined', 'Total'],
            rows: analytics.customerGrowth.map((row) => [
              label(row.period),
              formatCount(row.joined),
              formatCount(row.total),
            ]),
          }}
        >
          <TrendChart
            labels={analytics.customerGrowth.map((row) => label(row.period))}
            series={[
              {
                label: 'Customers',
                color: SERIES_COLORS[0],
                values: analytics.customerGrowth.map((row) => row.total),
              },
            ]}
            formatValue={formatCount}
            emptyMessage="No customers signed up in this period."
          />
        </ChartCard>

        <ChartCard
          title="Seller growth"
          subtitle="Running total of seller accounts"
          loading={loading}
          table={{
            columns: ['Period', 'Joined', 'Total'],
            rows: analytics.sellerGrowth.map((row) => [
              label(row.period),
              formatCount(row.joined),
              formatCount(row.total),
            ]),
          }}
        >
          <TrendChart
            labels={analytics.sellerGrowth.map((row) => label(row.period))}
            series={[
              {
                label: 'Sellers',
                color: SERIES_COLORS[0],
                values: analytics.sellerGrowth.map((row) => row.total),
              },
            ]}
            formatValue={formatCount}
            emptyMessage="No sellers signed up in this period."
          />
        </ChartCard>

        <ChartCard
          title="Payment method usage"
          subtitle="Orders placed with each method"
          loading={loading}
          table={{
            columns: ['Method', 'Orders', 'Sales'],
            rows: analytics.paymentUsage.map((row) => [
              row.name,
              formatCount(row.orderCount),
              formatPrice(row.sales),
            ]),
          }}
        >
          <RankBars
            rows={analytics.paymentUsage.map((row) => ({
              label: row.name,
              value: row.orderCount,
              hint: formatPrice(row.sales),
            }))}
            formatValue={(value) => `${formatCount(value)} orders`}
            emptyMessage="No payments in this period."
          />
        </ChartCard>

        <ChartCard
          title="Order source"
          subtitle="Storefront checkouts against seller-raised orders"
          legend={[
            { label: 'Customer orders', color: SERIES_COLORS[0], shape: 'rect' },
            { label: 'Seller orders', color: SERIES_COLORS[1], shape: 'rect' },
          ]}
          loading={loading}
          table={{
            columns: ['Source', 'Orders', 'Share', 'Sales'],
            rows: analytics.orderSources.map((row) => [
              row.source === 'customer' ? 'Customer orders' : 'Seller orders',
              formatCount(row.orderCount),
              `${row.share}%`,
              formatPrice(row.sales),
            ]),
          }}
        >
          <ShareBar
            segments={analytics.orderSources.map((row, index) => ({
              label: row.source === 'customer' ? 'Customer orders' : 'Seller orders',
              value: row.orderCount,
              color: SERIES_COLORS[index] ?? SERIES_COLORS[0],
            }))}
            formatValue={(value) => `${formatCount(value)} orders`}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Product performance"
        subtitle="Top products by units sold in this period"
        loading={loading}
        table={{
          columns: ['Product', 'Seller', 'Units', 'Revenue'],
          rows: analytics.topProducts.map((product) => [
            product.name,
            product.seller?.name ?? 'Unassigned',
            formatCount(product.unitsSold),
            formatPrice(product.revenue),
          ]),
        }}
      >
        <RankBars
          rows={analytics.topProducts.map((product) => ({
            label: product.name,
            value: product.unitsSold,
            hint: formatPrice(product.revenue),
          }))}
          formatValue={(value) => `${formatCount(value)} sold`}
          emptyMessage="Nothing sold in this period."
        />
      </ChartCard>
    </div>
  )
}
