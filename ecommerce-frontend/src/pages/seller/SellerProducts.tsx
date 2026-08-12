import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteProduct, fetchProducts, toggleProductStatus } from '@/features/products/productSlice'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { formatPrice, primaryImage, resolveStock } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'
import type { Product } from '@/types'

const PAGE_SIZE = 10

export default function SellerProducts() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { items, pagination, listStatus } = useAppSelector((state) => state.products)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)

  const query = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1

  const reload = () => {
    // `mine` is what keeps one seller out of another's catalogue.
    dispatch(
      fetchProducts({
        q: query || undefined,
        mine: true,
        includeInactive: true,
        page,
        limit: PAGE_SIZE,
        sort: 'newest',
      })
    )
  }

  useEffect(reload, [dispatch, query, page])

  const updateParams = (changes: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (!keepPage) next.delete('page')
    setSearchParams(next)
  }

  const handleToggle = async (product: Product) => {
    const result = await dispatch(toggleProductStatus({ id: product.id, isActive: !product.isActive }))
    if (toggleProductStatus.fulfilled.match(result)) {
      notify.success(result.payload.isActive ? 'Product enabled' : 'Product disabled')
    } else {
      notifyApiError(result.payload)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return

    const result = await dispatch(deleteProduct(confirmDelete.id))
    if (deleteProduct.fulfilled.match(result)) {
      notify.success(`${confirmDelete.name} deleted`)
      reload()
    } else {
      notifyApiError(result.payload)
    }
    setConfirmDelete(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          My products <span className="text-sm font-normal text-slate-500">({pagination.total})</span>
        </h2>
        <Link to="/seller/products/new" className="btn-primary gap-2">
          <PlusIcon className="h-4 w-4" />
          Add product
        </Link>
      </div>

      <form
        className="card flex gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          updateParams({ q: search.trim() })
        }}
      >
        <input
          className="input-field"
          placeholder="Search my products by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit" className="btn-outline">Search</button>
      </form>

      {listStatus === 'loading' ? (
        <PageLoader label="Loading your products…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start selling."
          action={
            <Link to="/seller/products/new" className="btn-primary">
              Add product
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((product) => {
                const stock = resolveStock(product)
                const image = primaryImage(product)

                return (
                  <tr key={product.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/product/${product.slug}`}
                            className="block max-w-56 truncate font-medium text-slate-800 hover:text-brand-600"
                          >
                            {product.name}
                          </Link>
                          <span className="text-xs text-slate-400">
                            {product.brand?.name ?? 'No brand'}
                            {(product.variants?.length ?? 0) > 0
                              ? ` · ${product.variants!.length} variants`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">
                        {formatPrice(product.discountPrice ?? product.price)}
                      </span>
                      {product.discountPrice ? (
                        <span className="ml-1 text-xs text-slate-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          stock <= 0 ? 'text-rose-600' : stock <= 5 ? 'text-amber-600' : 'text-slate-700'
                        }`}
                      >
                        {stock}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(product)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          product.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to toggle"
                      >
                        {product.isActive ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/seller/products/${product.id}/edit`}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                          aria-label={`Edit ${product.name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(product)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${product.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onChange={(nextPage) => updateParams({ page: nextPage }, true)}
      />

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-slate-900">Delete product?</h3>
            <p className="mt-2 text-sm text-slate-600">
              “{confirmDelete.name}” and its images and variants will be removed permanently. To keep
              the record but hide it from customers, disable it instead.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
