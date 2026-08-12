import { useEffect, useState } from 'react'
import type { Category, FilterOptions } from '@/types'

export interface ActiveFilters {
  category: string
  brand: string[]
  minPrice: string
  maxPrice: string
  inStock: boolean
  size: string[]
  color: string[]
  rating: string
}

interface FilterSidebarProps {
  categories: Category[]
  options: FilterOptions | null
  filters: ActiveFilters
  onChange: (next: Partial<ActiveFilters>) => void
  onReset: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  )
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function FilterSidebar({
  categories,
  options,
  filters,
  onChange,
  onReset,
}: FilterSidebarProps) {
  // Price inputs are local so typing does not fire a request per keystroke.
  const [minPrice, setMinPrice] = useState(filters.minPrice)
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice)

  useEffect(() => {
    setMinPrice(filters.minPrice)
    setMaxPrice(filters.maxPrice)
  }, [filters.minPrice, filters.maxPrice])

  const applyPrice = () => onChange({ minPrice, maxPrice })

  const activeCount =
    (filters.category ? 1 : 0) +
    filters.brand.length +
    filters.size.length +
    filters.color.length +
    (filters.inStock ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0)

  return (
    <aside className="card h-fit p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          Filters {activeCount > 0 ? <span className="text-brand-600">({activeCount})</span> : null}
        </h2>
        {activeCount > 0 ? (
          <button type="button" onClick={onReset} className="text-xs font-semibold text-brand-600 hover:underline">
            Clear all
          </button>
        ) : null}
      </div>

      <Section title="Category">
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="radio"
              name="category"
              checked={filters.category === ''}
              onChange={() => onChange({ category: '' })}
              className="accent-brand-600"
            />
            All categories
          </label>

          {categories.map((parent) => (
            <div key={parent.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="category"
                  checked={filters.category === parent.slug}
                  onChange={() => onChange({ category: parent.slug })}
                  className="accent-brand-600"
                />
                {parent.name}
              </label>

              <div className="ml-5 space-y-1">
                {(parent.children ?? []).map((child) => (
                  <label
                    key={child.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={filters.category === child.slug}
                      onChange={() => onChange({ category: child.slug })}
                      className="accent-brand-600"
                    />
                    {child.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Price range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input-field"
            placeholder={options ? String(options.priceRange.min) : 'Min'}
            value={minPrice}
            min={0}
            onChange={(event) => setMinPrice(event.target.value)}
            onBlur={applyPrice}
            aria-label="Minimum price"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            className="input-field"
            placeholder={options ? String(options.priceRange.max) : 'Max'}
            value={maxPrice}
            min={0}
            onChange={(event) => setMaxPrice(event.target.value)}
            onBlur={applyPrice}
            aria-label="Maximum price"
          />
        </div>
        <button type="button" className="btn-outline mt-2 w-full text-xs" onClick={applyPrice}>
          Apply price
        </button>
      </Section>

      {options && options.brands.length > 0 ? (
        <Section title="Brand">
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {options.brands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-600"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.brand.includes(brand.slug)}
                    onChange={() => onChange({ brand: toggle(filters.brand, brand.slug) })}
                    className="accent-brand-600"
                  />
                  {brand.name}
                </span>
                <span className="text-xs text-slate-400">{brand.productCount}</span>
              </label>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => onChange({ inStock: event.target.checked })}
            className="accent-brand-600"
          />
          In stock only
        </label>
      </Section>

      {options && options.sizes.length > 0 ? (
        <Section title="Size">
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ size: toggle(filters.size, size) })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  filters.size.includes(size)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
                aria-pressed={filters.size.includes(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {options && options.colors.length > 0 ? (
        <Section title="Colour">
          <div className="flex flex-wrap gap-2">
            {options.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ color: toggle(filters.color, color) })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  filters.color.includes(color)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
                aria-pressed={filters.color.includes(color)}
              >
                {color}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Customer rating">
        <div className="space-y-1">
          {['4', '3'].map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="rating"
                checked={filters.rating === value}
                onChange={() => onChange({ rating: value })}
                className="accent-brand-600"
              />
              {value}★ and above
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="radio"
              name="rating"
              checked={filters.rating === ''}
              onChange={() => onChange({ rating: '' })}
              className="accent-brand-600"
            />
            Any rating
          </label>
        </div>
      </Section>
    </aside>
  )
}
