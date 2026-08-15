import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  adjustStock,
  fetchInventory,
  fetchSellerStats,
  fetchStockHistory,
} from '@/features/seller/sellerSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { CloseIcon } from '@/components/ui/Icons'
import { notify, notifyApiError } from '@/utils/notify'
import type { InventoryProduct, StockMovementType } from '@/types'

const STOCK_FILTERS = [
  { value: '', label: 'All stock levels' },
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
]

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  initial: 'Opening stock',
  adjustment: 'Manual adjustment',
  order: 'Sold on an order',
  cancellation: 'Returned by a cancellation',
}

function stockTone(stock: number, threshold: number) {
  if (stock <= 0) return 'bg-rose-50 text-rose-700'
  if (stock <= threshold) return 'bg-amber-50 text-amber-700'
  return 'bg-emerald-50 text-emerald-700'
}

export default function SellerInventory() {
  const dispatch = useAppDispatch()
  const {
    inventory,
    inventoryPagination,
    inventoryStatus,
    lowStockThreshold,
    history,
    historyProduct,
    historyStatus,
  } = useAppSelector((state) => state.seller)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [stockLevel, setStockLevel] = useState('')
  const [page, setPage] = useState(1)

  const [adjusting, setAdjusting] = useState<InventoryProduct | null>(null)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [mode, setMode] = useState<'adjust' | 'set'>('adjust')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyFor, setHistoryFor] = useState<InventoryProduct | null>(null)

  useEffect(() => {
    dispatch(fetchInventory({ q: appliedSearch, stockLevel, page, limit: 20 }))
  }, [dispatch, appliedSearch, stockLevel, page])

  const openAdjust = (product: InventoryProduct) => {
    setAdjusting(product)
    setVariantId(product.variants?.length ? product.variants[0].id : null)
    setMode('adjust')
    setAmount('')
    setReason('')
  }

  const openHistory = (product: InventoryProduct) => {
    setHistoryFor(product)
    dispatch(fetchStockHistory(product.id))
  }

  const handleAdjust = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adjusting) return

    const value = Number(amount)
    if (!Number.isFinite(value) || amount.trim() === '') {
      notify.error('Enter a number')
      return
    }
    if (mode === 'adjust' && value === 0) {
      notify.info('Nothing to change')
      return
    }

    setSaving(true)
    const result = await dispatch(
      adjustStock({
        productId: adjusting.id,
        variantId,
        ...(mode === 'adjust' ? { adjustment: value } : { stock: value }),
        reason: reason.trim() || undefined,
      })
    )
    setSaving(false)

    if (adjustStock.fulfilled.match(result)) {
      notify.success(
        mode === 'adjust'
          ? `Stock ${value > 0 ? 'increased' : 'reduced'} to ${result.payload.newStock}`
          : `Stock set to ${result.payload.newStock}`
      )
      setAdjusting(null)
      // Dashboard counters depend on stock, so keep them in step.
      dispatch(fetchSellerStats())
      dispatch(fetchInventory({ q: appliedSearch, stockLevel, page, limit: 20 }))
    } else {
      notifyApiError(result.payload, 'Could not update stock')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Inventory{' '}
          <span className="text-sm font-normal text-slate-500">({inventoryPagination.total})</span>
        </h2>
        <p className="text-xs text-slate-500">Low stock is {lowStockThreshold} units or fewer</p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setAppliedSearch(search.trim())
          }}
        >
          <input
            className="input-field"
            placeholder="Search my products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="btn-outline">Search</button>
        </form>

        <select
          className="input-field w-auto"
          value={stockLevel}
          onChange={(event) => {
            setPage(1)
            setStockLevel(event.target.value)
          }}
          aria-label="Filter by stock level"
        >
          {STOCK_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {inventoryStatus === 'loading' && inventory.length === 0 ? (
        <PageLoader label="Loading inventory…" />
      ) : inventory.length === 0 ? (
        <EmptyState title="Nothing to show" description="No products match this filter." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Current stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {inventory.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                        {product.images?.[0] ? (
                          <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-56 truncate font-medium text-slate-800">{product.name}</p>
                        <span className="text-xs text-slate-400">
                          {product.category?.name ?? '—'}
                          {!product.isActive ? ' · disabled' : ''}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {product.variants?.length
                      ? product.variants.map((v) => (
                          <span
                            key={v.id}
                            className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs"
                          >
                            {[v.color, v.size].filter(Boolean).join(' ')}: {v.stock}
                          </span>
                        ))
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${stockTone(product.stock, lowStockThreshold)}`}
                    >
                      {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-outline text-xs" onClick={() => openAdjust(product)}>
                        Update stock
                      </button>
                      <button type="button" className="btn-outline text-xs" onClick={() => openHistory(product)}>
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
        page={inventoryPagination.page}
        totalPages={inventoryPagination.totalPages}
        onChange={setPage}
      />

      {adjusting ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <form onSubmit={handleAdjust} className="card w-full max-w-md p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Update stock</h3>
                <p className="text-sm text-slate-500">{adjusting.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjusting(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {adjusting.variants?.length ? (
              <div className="mb-3">
                <label className="label" htmlFor="variant">Variant</label>
                <select
                  id="variant"
                  className="input-field"
                  value={variantId ?? ''}
                  onChange={(event) => setVariantId(Number(event.target.value))}
                >
                  {adjusting.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {[variant.color, variant.size].filter(Boolean).join(' / ')} — {variant.stock} in stock
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-500">
                Current stock: <strong>{adjusting.stock}</strong>
              </p>
            )}

            <div className="mb-3 flex gap-2">
              <button
                type="button"
                className={mode === 'adjust' ? 'btn-primary flex-1 text-xs' : 'btn-outline flex-1 text-xs'}
                onClick={() => setMode('adjust')}
              >
                Add / remove
              </button>
              <button
                type="button"
                className={mode === 'set' ? 'btn-primary flex-1 text-xs' : 'btn-outline flex-1 text-xs'}
                onClick={() => setMode('set')}
              >
                Set exact value
              </button>
            </div>

            <div className="mb-3">
              <label className="label" htmlFor="amount">
                {mode === 'adjust' ? 'Adjustment (use -5 to remove)' : 'New stock value'}
              </label>
              <input
                id="amount"
                type="number"
                className="input-field"
                value={amount}
                placeholder={mode === 'adjust' ? '+10' : '25'}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="label" htmlFor="reason">Reason (optional)</label>
              <input
                id="reason"
                className="input-field"
                value={reason}
                placeholder="Restocked from supplier"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setAdjusting(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Update stock'}
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
                  {historyProduct?.name ?? historyFor.name}
                  {historyProduct ? ` · now ${historyProduct.stock} in stock` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {historyStatus === 'loading' ? (
              <div className="py-10 text-center text-slate-400">
                <Spinner />
              </div>
            ) : history.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No stock movements recorded yet.</p>
            ) : (
              <div className="overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2">When</th>
                      <th className="py-2">Change</th>
                      <th className="py-2">Resulting stock</th>
                      <th className="py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((movement) => (
                      <tr key={movement.id}>
                        <td className="py-2 text-slate-600">
                          {new Date(movement.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {movement.variant ? (
                            <span className="block text-xs text-slate-400">
                              {[movement.variant.color, movement.variant.size].filter(Boolean).join(' / ')}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={`py-2 font-semibold ${
                            movement.quantityChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {movement.quantityChange >= 0 ? '+' : ''}
                          {movement.quantityChange}
                        </td>
                        <td className="py-2 text-slate-700">{movement.resultingStock}</td>
                        <td className="py-2 text-slate-600">
                          {movement.reason || MOVEMENT_LABELS[movement.type]}
                          <span className="block text-xs text-slate-400">
                            {MOVEMENT_LABELS[movement.type]}
                            {movement.createdBy ? ` · ${movement.createdBy.name} (${movement.createdBy.role === 'admin' ? 'Admin' : 'Seller'})` : ''}
                          </span>
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
