import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchBrands, fetchCategories } from '@/features/catalog/categorySlice'
import { fetchProducts } from '@/features/products/productSlice'
import { fetchOrderStats } from '@/features/orders/orderSlice'
import { formatPrice, resolveStock } from '@/utils/format'
import { ORDER_STATUS_LABELS, orderStatusClasses } from '@/utils/orders'
import type { OrderStatus } from '@/types'

export default function AdminDashboard() {
  const dispatch = useAppDispatch()
  const { items, pagination } = useAppSelector((state) => state.products)
  const { categories, brands } = useAppSelector((state) => state.catalog)
  const stats = useAppSelector((state) => state.orders.stats)

  useEffect(() => {
    // A wide page gives the dashboard enough rows to summarise stock levels.
    dispatch(fetchProducts({ includeInactive: true, limit: 60, sort: 'newest' }))
    dispatch(fetchCategories({ includeInactive: true }))
    dispatch(fetchBrands({ includeInactive: true }))
    dispatch(fetchOrderStats())
  }, [dispatch])

  const productStats = useMemo(() => {
    const disabled = items.filter((p) => !p.isActive).length
    const outOfStock = items.filter((p) => resolveStock(p) <= 0).length
    const lowStock = items.filter((p) => {
      const stock = resolveStock(p)
      return stock > 0 && stock <= 5
    }).length
    const inventoryValue = items.reduce(
      (sum, p) => sum + (p.discountPrice ?? p.price) * resolveStock(p),
      0
    )
    const subcategories = categories.reduce((sum, c) => sum + (c.children?.length ?? 0), 0)

    return { disabled, outOfStock, lowStock, inventoryValue, subcategories }
  }, [items, categories])

  const cards = [
    { label: 'Total products', value: pagination.total, to: '/admin/products' },
    { label: 'Disabled products', value: productStats.disabled, to: '/admin/products' },
    { label: 'Out of stock', value: productStats.outOfStock, to: '/admin/products' },
    { label: 'Low stock (≤5)', value: productStats.lowStock, to: '/admin/products' },
    { label: 'Categories', value: `${categories.length} + ${productStats.subcategories} sub`, to: '/admin/categories' },
    { label: 'Brands', value: brands.length, to: '/admin/brands' },
  ]

  const attention = items
    .filter((p) => resolveStock(p) <= 5 || !p.isActive)
    .slice(0, 8)

  const statusOrder: OrderStatus[] = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ]

  return (
    <div className="flex flex-col gap-6">
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/admin/orders" className="card p-4 transition-shadow hover:shadow-md">
            <p className="text-sm text-slate-500">Orders placed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.orderCount}</p>
          </Link>
          <div className="card p-4">
            <p className="text-sm text-slate-500">Revenue (excluding cancelled)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatPrice(stats.revenue)}</p>
          </div>
        </div>
      ) : null}

      {stats ? (
        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((status) => (
              <Link
                key={status}
                to={`/admin/orders?status=${status}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${orderStatusClasses(status)}`}
              >
                {ORDER_STATUS_LABELS[status]}: {stats.byStatus[status] ?? 0}
              </Link>
            ))}
          </div>

          {Object.keys(stats.byPaymentMethod).length > 0 ? (
            <>
              <h2 className="mb-3 mt-5 font-semibold text-slate-900">Orders by payment method</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byPaymentMethod).map(([code, count]) => (
                  <Link
                    key={code}
                    to={`/admin/orders?paymentMethod=${code}`}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    {code}: {count}
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="card p-4 transition-shadow hover:shadow-md">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <p className="text-sm text-slate-500">Inventory value (listed price × stock)</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{formatPrice(productStats.inventoryValue)}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Needs attention</h2>
          <Link to="/admin/products" className="text-sm font-semibold text-brand-600 hover:underline">
            Manage products
          </Link>
        </div>

        {attention.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Everything is enabled and well stocked.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attention.map((product) => {
              const stock = resolveStock(product)
              return (
                <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category?.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!product.isActive ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        Disabled
                      </span>
                    ) : null}
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        stock <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {stock <= 0 ? 'Out of stock' : `${stock} left`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
