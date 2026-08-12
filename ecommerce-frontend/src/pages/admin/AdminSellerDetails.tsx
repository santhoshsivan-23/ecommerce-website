import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearSellerDetail,
  fetchSellerDetail,
  fetchSellerOrdersForAdmin,
  setSellerStatus,
} from '@/features/admin/adminSlice'
import { fetchProducts } from '@/features/products/productSlice'
import {
  DEFAULT_RANGE,
  RangeFilter,
  isRangeReady,
  rangeParams,
  type RangeState,
} from '@/components/admin/RangeFilter'
import { ChartCard } from '@/components/charts/ChartCard'
import { RankBars } from '@/components/charts/RankBars'
import { StatTile } from '@/components/charts/StatTile'
import { formatCount } from '@/components/charts/chartUtils'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { formatPrice, resolveStock } from '@/utils/format'
import { ORDER_STATUS_LABELS, formatDate, orderStatusClasses } from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'

export default function AdminSellerDetails() {
  const { id } = useParams<{ id: string }>()
  const sellerId = Number(id)

  const dispatch = useAppDispatch()
  const { sellerDetail, sellerOrders, sellerOrderPagination, detailStatus } = useAppSelector(
    (state) => state.admin
  )
  const products = useAppSelector((state) => state.products)

  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [orderPage, setOrderPage] = useState(1)

  useEffect(() => {
    return () => {
      dispatch(clearSellerDetail())
    }
  }, [dispatch])

  useEffect(() => {
    if (!sellerId || !isRangeReady(range)) return

    dispatch(fetchSellerDetail({ id: sellerId, ...rangeParams(range) })).then((result) => {
      if (fetchSellerDetail.rejected.match(result)) notifyApiError(result.payload)
    })
  }, [dispatch, sellerId, range])

  useEffect(() => {
    if (!sellerId || !isRangeReady(range)) return
    dispatch(fetchSellerOrdersForAdmin({ id: sellerId, page: orderPage, ...rangeParams(range) }))
  }, [dispatch, sellerId, orderPage, range])

  // Reuses the catalogue endpoint, scoped to this seller, so the admin sees the
  // same listings the seller does — including the ones they have disabled.
  useEffect(() => {
    if (!sellerId) return
    dispatch(fetchProducts({ sellerId, includeInactive: true, limit: 8, sort: 'newest' }))
  }, [dispatch, sellerId])

  if (detailStatus === 'loading' && !sellerDetail) return <PageLoader label="Loading seller…" />

  if (!sellerDetail || !sellerDetail.seller) {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-600">This seller could not be loaded.</p>
        <Link to="/admin/sellers" className="mt-3 inline-block text-sm font-semibold text-brand-600">
          Back to sellers
        </Link>
      </div>
    )
  }

  const { seller, topProducts, recentOrders, byCategory } = sellerDetail

  const toggleStatus = async () => {
    const result = await dispatch(setSellerStatus({ id: seller.id, isActive: !seller.isActive }))
    if (setSellerStatus.fulfilled.match(result)) notify.success(result.payload.message)
    else notifyApiError(result.payload)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/sellers" className="text-sm text-brand-600 hover:underline">
            ← Sellers
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{seller.name}</h2>
          <p className="text-sm text-slate-500">
            {seller.email}
            {seller.phone ? ` · ${seller.phone}` : ''} · joined {formatDate(seller.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              seller.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {seller.isActive ? 'Active' : 'Deactivated'}
          </span>
          <button type="button" onClick={toggleStatus} className="btn-outline text-xs">
            {seller.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      <RangeFilter value={range} onChange={setRange} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Sales"
          value={formatPrice(seller.sales)}
          hint="This seller's own order lines"
        />
        <StatTile
          label="Revenue"
          value={formatPrice(seller.revenue)}
          hint="Settled payments only"
        />
        <StatTile label="Orders" value={formatCount(seller.orderCount)} />
        <StatTile label="Units sold" value={formatCount(seller.unitsSold)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Products"
          value={formatCount(seller.productCount)}
          hint={`${formatCount(seller.activeProducts)} live`}
          to={`/admin/products?sellerId=${seller.id}`}
        />
        <StatTile
          label="Pending orders"
          value={formatCount(seller.pendingOrders)}
          tone={seller.pendingOrders > 0 ? 'warning' : 'default'}
        />
        <StatTile label="Completed orders" value={formatCount(seller.completedOrders)} />
        <StatTile
          label="Cancelled orders"
          value={formatCount(seller.cancelledOrders)}
          tone={seller.cancelledOrders > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Best sellers"
          subtitle="Units sold in this period"
          table={{
            columns: ['Product', 'Units', 'Revenue', 'Stock'],
            rows: topProducts.map((product) => [
              product.name,
              formatCount(product.unitsSold),
              formatPrice(product.revenue),
              formatCount(product.stock),
            ]),
          }}
        >
          <RankBars
            rows={topProducts.map((product) => ({
              label: product.name,
              value: product.unitsSold,
              hint: formatPrice(product.revenue),
            }))}
            formatValue={(value) => `${formatCount(value)} sold`}
            emptyMessage="Nothing sold in this period."
          />
        </ChartCard>

        <ChartCard
          title="Catalogue by category"
          subtitle="Where this seller's listings sit"
          table={{
            columns: ['Category', 'Products'],
            rows: byCategory.map((row) => [row.category.name, formatCount(row.count)]),
          }}
        >
          <RankBars
            rows={byCategory.map((row) => ({ label: row.category.name, value: row.count }))}
            formatValue={(value) => `${formatCount(value)} products`}
            emptyMessage="No products listed yet."
          />
        </ChartCard>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Products</h3>
          <Link
            to={`/admin/products?sellerId=${seller.id}`}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Manage all {seller.productCount}
          </Link>
        </div>

        {products.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">This seller has no products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.items.map((product) => {
                  const stock = resolveStock(product)
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="font-medium text-slate-800 hover:text-brand-600"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {formatPrice(product.discountPrice ?? product.price)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          stock <= 0 ? 'text-rose-600' : stock <= 5 ? 'text-amber-600' : 'text-slate-700'
                        }`}
                      >
                        {stock}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">
            Orders{' '}
            <span className="text-sm font-normal text-slate-500">({sellerOrderPagination.total})</span>
          </h3>
          <Link
            to={`/admin/orders?sellerId=${seller.id}`}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Open in order manager
          </Link>
        </div>

        {sellerOrders.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Their items</th>
                  <th className="px-4 py-3 text-right">Their share</th>
                  <th className="px-4 py-3 text-right">Order total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellerOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-medium text-slate-800 hover:text-brand-600"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-400">{formatDate(order.placedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.customer?.name ?? order.shippingFullName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          order.orderSource === 'seller'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.orderSource}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {order.sellerItemCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                      {formatPrice(order.sellerSubtotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {formatPrice(order.total)}
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
        page={sellerOrderPagination.page}
        totalPages={sellerOrderPagination.totalPages}
        onChange={setOrderPage}
      />

      {recentOrders.length > 0 && sellerOrders.length === 0 ? (
        <p className="text-xs text-slate-400">
          This seller has {recentOrders.length} recent orders outside the selected period.
        </p>
      ) : null}
    </div>
  )
}
