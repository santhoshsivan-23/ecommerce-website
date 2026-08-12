import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchSellerStats } from '@/features/seller/sellerSlice'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import { notifyApiError } from '@/utils/notify'
import type { StatsRange } from '@/types'

const RANGES: Array<{ value: StatsRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

export default function SellerDashboard() {
  const dispatch = useAppDispatch()
  const { stats, statsStatus } = useAppSelector((state) => state.seller)

  const [range, setRange] = useState<StatsRange>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    // A custom range only makes sense once at least one bound is chosen.
    if (range === 'custom' && !from && !to) return

    dispatch(fetchSellerStats(range === 'custom' ? { from, to } : { range })).then((result) => {
      if (fetchSellerStats.rejected.match(result)) notifyApiError(result.payload)
    })
  }, [dispatch, range, from, to])

  if (statsStatus === 'loading' && !stats) return <PageLoader label="Loading your dashboard…" />
  if (!stats) return <PageLoader label="Loading your dashboard…" />

  const cards = [
    { label: 'Total products', value: stats.products.total, to: '/seller/products' },
    { label: 'Active products', value: stats.products.active, to: '/seller/products' },
    { label: 'Total orders', value: stats.orders.total, to: '/seller/orders' },
    { label: 'Pending orders', value: stats.orders.pending, to: '/seller/orders?status=pending' },
    { label: 'Completed orders', value: stats.orders.completed, to: '/seller/orders?status=delivered' },
    { label: 'Units sold', value: stats.sales.unitsSold, to: '/seller/orders' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm text-slate-600">
          <span className="label">Date range</span>
          <select
            className="input-field w-auto"
            value={range}
            onChange={(event) => setRange(event.target.value as StatsRange)}
          >
            {RANGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {range === 'custom' ? (
          <>
            <label className="text-sm text-slate-600">
              <span className="label">From</span>
              <input
                type="date"
                className="input-field w-auto"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="label">To</span>
              <input
                type="date"
                className="input-field w-auto"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </>
        ) : null}

        <Link to="/seller/orders/new" className="btn-primary ml-auto">
          Create order
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card bg-brand-600 p-5 text-white">
          <p className="text-sm text-brand-100">Total revenue</p>
          <p className="mt-1 text-3xl font-bold">{formatPrice(stats.sales.revenue)}</p>
          <p className="mt-1 text-xs text-brand-100">
            Your own product lines only, excluding cancelled orders
          </p>
        </div>

        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="card p-5 transition-shadow hover:shadow-md">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Out of stock</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stats.products.outOfStock}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Low stock (≤{stats.lowStockThreshold})</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.products.lowStock}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Cancelled orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{stats.orders.cancelled}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Low stock products</h2>
          <Link to="/seller/inventory" className="text-sm font-semibold text-brand-600 hover:underline">
            Manage inventory
          </Link>
        </div>

        {stats.lowStockProducts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Everything is comfortably stocked.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                  {!product.isActive ? (
                    <span className="text-xs text-slate-400">Disabled</span>
                  ) : null}
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
  )
}
