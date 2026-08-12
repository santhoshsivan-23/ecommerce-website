import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchCategories } from '@/features/catalog/categorySlice'
import { fetchFeaturedProducts, fetchProducts } from '@/features/products/productSlice'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronRightIcon } from '@/components/ui/Icons'

function SectionHeader({ title, subtitle, to }: { title: string; subtitle?: string; to: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
      >
        View all <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  )
}

export default function Home() {
  const dispatch = useAppDispatch()
  const categories = useAppSelector((state) => state.catalog.categories)
  const featured = useAppSelector((state) => state.products.featured)
  const latest = useAppSelector((state) => state.products.items)
  const listStatus = useAppSelector((state) => state.products.listStatus)

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories())
    dispatch(fetchFeaturedProducts())
    dispatch(fetchProducts({ sort: 'newest', limit: 8 }))
    // Categories are only fetched when missing, so the dependency list stays stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Free delivery over ₹500
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            Everything you need, in one place
          </h1>
          <p className="mt-3 text-base text-brand-100 sm:text-lg">
            Electronics, fashion, home essentials and fitness gear from brands people trust.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/products" className="btn bg-white text-brand-700 hover:bg-brand-50">
              Shop all products
            </Link>
            <Link to="/products?featured=true" className="btn border border-white/40 text-white hover:bg-white/10">
              See featured deals
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          title="Shop by category"
          subtitle="Browse the catalogue by department"
          to="/products"
        />

        {categories.length === 0 ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="card group overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-slate-800 group-hover:text-brand-600">
                    {category.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {(category.children?.length ?? 0)} subcategories
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {featured.length > 0 ? (
        <section className="mt-12">
          <SectionHeader
            title="Featured products"
            subtitle="Hand-picked deals worth a look"
            to="/products?featured=true"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <SectionHeader title="Latest arrivals" subtitle="Just added to the store" to="/products?sort=newest" />

        {listStatus === 'loading' && latest.length === 0 ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {latest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Free delivery', body: 'On every order above ₹500, anywhere in India.' },
          { title: 'Genuine products', body: 'Sourced directly from brands and authorised sellers.' },
          { title: 'Easy returns', body: 'Seven-day replacement on eligible items.' },
        ].map((item) => (
          <div key={item.title} className="card p-5">
            <h3 className="font-semibold text-slate-800">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
