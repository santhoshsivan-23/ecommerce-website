import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  adjustAdminStock,
  fetchAdminInventory,
  fetchAdminStockHistory,
  fetchSellers,
} from '@/features/admin/adminSlice'
import { fetchCategories } from '@/features/catalog/categorySlice'
import { StatTile } from '@/components/charts/StatTile'
import { formatCount } from '@/components/charts/chartUtils'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { CloseIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import { formatDateTime } from '@/utils/orders'
import { notify, notifyApiError } from '@/utils/notify'
import type { AdminInventoryProduct } from '@/types'

const STOCK_LEVELS = [
  { value: '', label: 'All stock levels' },
  { value: 'out', label: 'Out of stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'in', label: 'Well stocked' },
]

function stockTone(stock: number, threshold: number) {
  if (stock <= 0) return 'text-rose-600'
  return stock <= threshold ? 'text-amber-600' : 'text-slate-700'
}

export default function AdminInventory() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  const { inventory, inventoryStatus, sellers, history, historyProduct } = useAppSelector(
    (state) => state.admin
  )
  const categories = useAppSelector((state) => state.catalog.categories)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [adjusting, setAdjusting] = useState<AdminInventoryProduct | null>(null)
  const [variantId, setVariantId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [historyFor, setHistoryFor] = useState<AdminInventoryProduct | null>(null)

  const query = {
    q: searchParams.get('q') || '',
    sellerId: searchParams.get('sellerId') || '',
    categoryId: searchParams.get('categoryId') || '',
    stockLevel: searchParams.get('stockLevel') || '',
    page: Number(searchParams.get('page')) || 1,
  }

  useEffect(() => {
    if (sellers.length === 0) dispatch(fetchSellers({ limit: 100 }))
    if (categories.length === 0) dispatch(fetchCategories({ includeInactive: true }))
  }, [dispatch, sellers.length, categories.length])

  const reload = () => {
    dispatch(fetchAdminInventory(query)).then((result) => {
      if (fetchAdminInventory.rejected.match(result)) notifyApiError(result.payload)
    })
  }

  useEffect(reload, [dispatch, searchParams])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  const openAdjust = (product: AdminInventoryProduct) => {
    setAdjusting(product)
    setVariantId('')
    setAmount('')
    setReason('')
  }

  const openHistory = (product: AdminInventoryProduct) => {
    setHistoryFor(product)
    dispatch(fetchAdminStockHistory(product.id))
  }

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adjusting) return

    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed === 0) {
      notify.error('Enter how many units to add or remove')
      return
    }

    const result = await dispatch(
      adjustAdminStock({
        productId: adjusting.id,
        variantId: variantId ? Number(variantId) : null,
        adjustment: parsed,
        reason: reason.trim() || undefined,
      })
    )

    if (adjustAdminStock.fulfilled.match(result)) {
      notify.success(result.payload.message)
      setAdjusting(null)
      reload()
    } else {
      notifyApiError(result.payload)
    }
  }

  if (!inventory && inventoryStatus === 'loading') return <PageLoader label="Loading inventory…" />

  const threshold = inventory?.lowStockThreshold ?? 5
  const summary = inventory?.summary

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Inventory{' '}
          <span className="text-sm font-normal text-slate-500">
            ({inventory?.pagination.total ?? 0})
          </span>
        </h2>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Units on hand" value={formatCount(summary.units)} />
          <StatTile
            label="Inventory value"
            value={formatPrice(summary.inventoryValue)}
            hint="Selling price × units"
          />
          <StatTile
            label="Low stock"
            value={formatCount(summary.lowStock)}
            hint={`At or below ${threshold} units`}
            tone={summary.lowStock > 0 ? 'warning' : 'default'}
          />
          <StatTile
            label="Out of stock"
            value={formatCount(summary.outOfStock)}
            tone={summary.outOfStock > 0 ? 'danger' : 'default'}
          />
        </div>
      ) : null}

      <div className="card flex flex-wrap gap-3 p-4">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            updateParams({ q: search.trim() })
          }}
        >
          <input
            className="input-field"
            placeholder="Search products by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0">
            Search
          </button>
        </form>

        <select
          className="input-field w-auto"
          value={query.sellerId}
          onChange={(event) => updateParams({ sellerId: event.target.value })}
          aria-label="Filter by seller"
        >
          <option value="">All sellers</option>
          <option value="none">No seller assigned</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>

        <select
          className="input-field w-auto"
          value={query.categoryId}
          onChange={(event) => updateParams({ categoryId: event.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.id}>{parent.name}</option>
              {(parent.children ?? []).map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className="input-field w-auto"
          value={query.stockLevel}
          onChange={(event) => updateParams({ stockLevel: event.target.value })}
          aria-label="Filter by stock level"
        >
          {STOCK_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {!inventory || inventory.products.length === 0 ? (
        <EmptyState
          title="No products match these filters"
          description="Try a different seller, category or stock level."
        />
      ) : (
        <div className={`card overflow-x-auto ${inventoryStatus === 'loading' ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3">Last movement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {inventory.products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="block max-w-64 truncate font-medium text-slate-800 hover:text-brand-600"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {product.brand?.name ?? 'No brand'}
                      {(product.variants?.length ?? 0) > 0
                        ? ` · ${product.variants!.length} variants`
                        : ''}
                      {!product.isActive ? ' · disabled' : ''}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {product.seller ? (
                      <Link
                        to={`/admin/sellers/${product.seller.id}`}
                        className="hover:text-brand-600"
                      >
                        {product.seller.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>

                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${stockTone(product.stock, threshold)}`}
                  >
                    {product.stock}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {product.soldCount}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(product.lastMovementAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openAdjust(product)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Adjust
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistory(product)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={inventory?.pagination.page ?? 1}
        totalPages={inventory?.pagination.totalPages ?? 0}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />

      {adjusting ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <form onSubmit={submitAdjustment} className="card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-slate-900">Adjust stock</h3>
            <p className="mt-1 text-sm text-slate-500">
              {adjusting.name} · currently {adjusting.stock} units
            </p>

            {(adjusting.variants?.length ?? 0) > 0 ? (
              <label className="mt-4 block">
                <span className="label">Variant</span>
                <select
                  className="input-field"
                  value={variantId}
                  onChange={(event) => setVariantId(event.target.value)}
                >
                  <option value="">Product-level stock</option>
                  {adjusting.variants!.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {[variant.color, variant.size].filter(Boolean).join(' / ') || variant.sku} —{' '}
                      {variant.stock} in stock
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="mt-4 block">
              <span className="label">Units to add or remove</span>
              <input
                type="number"
                className="input-field"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 25 to add, -5 to remove"
              />
            </label>

            <label className="mt-4 block">
              <span className="label">Reason</span>
              <input
                className="input-field"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Stock take, damaged goods, restock…"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Recorded in the stock ledger against your account.
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setAdjusting(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Apply adjustment
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {historyFor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="card flex max-h-[80vh] w-full max-w-2xl flex-col p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Stock history</h3>
                <p className="text-sm text-slate-500">
                  {historyProduct?.name ?? historyFor.name} · {historyProduct?.stock ?? historyFor.stock}{' '}
                  units now
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close stock history"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No movements recorded yet.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-b border-slate-100 px-2 py-2">When</th>
                      <th className="border-b border-slate-100 px-2 py-2">Type</th>
                      <th className="border-b border-slate-100 px-2 py-2 text-right">Change</th>
                      <th className="border-b border-slate-100 px-2 py-2 text-right">Resulting</th>
                      <th className="border-b border-slate-100 px-2 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-2 py-2 text-xs text-slate-500">
                          {formatDateTime(movement.createdAt)}
                        </td>
                        <td className="px-2 py-2 text-slate-600">{movement.type}</td>
                        <td
                          className={`px-2 py-2 text-right font-medium tabular-nums ${
                            movement.quantityChange >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {movement.quantityChange > 0 ? '+' : ''}
                          {movement.quantityChange}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                          {movement.resultingStock}
                        </td>
                        <td className="px-2 py-2 text-xs text-slate-500">
                          {movement.reason ?? '—'}
                          {movement.createdBy ? ` · ${movement.createdBy.name} (${movement.createdBy.role === 'admin' ? 'Admin' : 'Seller'})` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
