import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchCategories } from '@/features/catalog/categorySlice'
import { fetchFilterOptions, fetchProducts } from '@/features/products/productSlice'
import { ProductCard } from '@/components/product/ProductCard'
import { FilterSidebar } from '@/components/product/FilterSidebar'
import type { ActiveFilters } from '@/components/product/FilterSidebar'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { SearchIcon, CloseIcon } from '@/components/ui/Icons'
import type { SortOption } from '@/types'

const SORT_LABELS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'name_asc', label: 'Name: A to Z' },
]

const PAGE_SIZE = 12

/** URL search params are the single source of truth for the current view. */
function readFilters(params: URLSearchParams): ActiveFilters {
  const list = (key: string) => (params.get(key) ? params.get(key)!.split(',').filter(Boolean) : [])
  return {
    category: params.get('category') || '',
    brand: list('brand'),
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    inStock: params.get('inStock') === 'true',
    size: list('size'),
    color: list('color'),
    rating: params.get('rating') || '',
  }
}

export default function ProductList() {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const categories = useAppSelector((state) => state.catalog.categories)
  const { items, pagination, filterOptions, listStatus, error } = useAppSelector(
    (state) => state.products
  )

  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const query = searchParams.get('q') || ''
  const sort = (searchParams.get('sort') as SortOption) || 'newest'
  const page = Number(searchParams.get('page')) || 1
  const featured = searchParams.get('featured') === 'true'

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories())
  }, [dispatch, categories.length])

  useEffect(() => {
    dispatch(fetchFilterOptions(filters.category ? { category: filters.category } : undefined))
  }, [dispatch, filters.category])

  useEffect(() => {
    dispatch(
      fetchProducts({
        q: query || undefined,
        category: filters.category || undefined,
        brand: filters.brand.length ? filters.brand.join(',') : undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        inStock: filters.inStock,
        size: filters.size.length ? filters.size.join(',') : undefined,
        color: filters.color.length ? filters.color.join(',') : undefined,
        rating: filters.rating ? Number(filters.rating) : undefined,
        featured,
        sort,
        page,
        limit: PAGE_SIZE,
      })
    )
  }, [dispatch, query, filters, sort, page, featured])

  /** Writes a filter change back to the URL and returns to page 1. */
  const updateParams = useCallback(
    (changes: Record<string, string | string[] | boolean | number | undefined>, keepPage = false) => {
      const next = new URLSearchParams(searchParams)

      Object.entries(changes).forEach(([key, value]) => {
        const isEmpty =
          value === undefined ||
          value === '' ||
          value === false ||
          (Array.isArray(value) && value.length === 0)

        if (isEmpty) next.delete(key)
        else next.set(key, Array.isArray(value) ? value.join(',') : String(value))
      })

      if (!keepPage) next.delete('page')
      setSearchParams(next)
    },
    [searchParams, setSearchParams]
  )

  const handleFilterChange = useCallback(
    (changes: Partial<ActiveFilters>) => updateParams(changes as Record<string, string | string[] | boolean>),
    [updateParams]
  )

  const handleReset = useCallback(() => {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    setSearchParams(next)
  }, [query, setSearchParams])

  const activeCategory = useMemo(() => {
    if (!filters.category) return null
    for (const parent of categories) {
      if (parent.slug === filters.category) return parent
      const child = parent.children?.find((c) => c.slug === filters.category)
      if (child) return child
    }
    return null
  }, [categories, filters.category])

  const heading = query
    ? `Results for “${query}”`
    : featured
      ? 'Featured products'
      : activeCategory
        ? activeCategory.name
        : 'All products'

  const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total)

  const chips: Array<{ label: string; clear: () => void }> = []
  if (query) chips.push({ label: `Search: ${query}`, clear: () => updateParams({ q: undefined }) })
  if (activeCategory) {
    chips.push({ label: activeCategory.name, clear: () => updateParams({ category: undefined }) })
  }
  filters.brand.forEach((brand) =>
    chips.push({
      label: brand,
      clear: () => updateParams({ brand: filters.brand.filter((b) => b !== brand) }),
    })
  )
  filters.size.forEach((size) =>
    chips.push({
      label: `Size: ${size}`,
      clear: () => updateParams({ size: filters.size.filter((s) => s !== size) }),
    })
  )
  filters.color.forEach((color) =>
    chips.push({
      label: color,
      clear: () => updateParams({ color: filters.color.filter((c) => c !== color) }),
    })
  )
  if (filters.inStock) chips.push({ label: 'In stock', clear: () => updateParams({ inStock: false }) })
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      label: `₹${filters.minPrice || 0} – ₹${filters.maxPrice || '∞'}`,
      clear: () => updateParams({ minPrice: undefined, maxPrice: undefined }),
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <span className="text-slate-800">{heading}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total > 0
              ? `Showing ${showingFrom}–${showingTo} of ${pagination.total} products`
              : 'No products to show'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-outline lg:hidden"
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            Filters
          </button>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden sm:inline">Sort by</span>
            <select
              className="input-field w-auto"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
            >
              {SORT_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip, index) => (
            <button
              key={`${chip.label}-${index}`}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {chip.label}
              <CloseIcon className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={handleReset} className="text-xs font-semibold text-brand-600 hover:underline">
            Clear all
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}>
          <FilterSidebar
            categories={categories}
            options={filterOptions}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>

        <div>
          {listStatus === 'loading' ? (
            <PageLoader label="Loading products…" />
          ) : listStatus === 'failed' ? (
            <EmptyState
              title="Could not load products"
              description={error ?? 'Please check that the API is running and try again.'}
              action={
                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                  Retry
                </button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<SearchIcon className="h-12 w-12" />}
              title={query ? `No products match “${query}”` : 'No products match these filters'}
              description="Try a different search term, or clear some filters to see more results."
              action={
                <button type="button" className="btn-primary" onClick={handleReset}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-8">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onChange={(nextPage) => {
                    updateParams({ page: nextPage }, true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
