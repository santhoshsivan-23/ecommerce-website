import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchAttributes } from '@/features/admin/adminSlice'
import { ChartCard } from '@/components/charts/ChartCard'
import { RankBars } from '@/components/charts/RankBars'
import { StatTile } from '@/components/charts/StatTile'
import { formatCount } from '@/components/charts/chartUtils'
import { PageLoader } from '@/components/ui/Spinner'
import { notifyApiError } from '@/utils/notify'

/**
 * Variants are created per product, so this is the one screen where the admin can
 * see the vocabulary the whole catalogue has settled on — and spot the value that
 * only one product uses, or the size nobody stocks.
 */
export default function AdminAttributes() {
  const dispatch = useAppDispatch()
  const attributes = useAppSelector((state) => state.admin.attributes)

  useEffect(() => {
    dispatch(fetchAttributes()).then((result) => {
      if (fetchAttributes.rejected.match(result)) notifyApiError(result.payload)
    })
  }, [dispatch])

  if (!attributes) return <PageLoader label="Loading attributes…" />

  const { sizes, colors, summary } = attributes

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Attributes &amp; variants</h2>
        <p className="mt-1 text-sm text-slate-500">
          Size and colour values in use across every seller&apos;s catalogue. Values are added on
          the product form; this view shows how widely each one is actually used.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Products" value={formatCount(summary.products)} to="/admin/products" />
        <StatTile
          label="With variants"
          value={formatCount(summary.withVariants)}
          hint={`${formatCount(summary.withoutVariants)} sold as a single option`}
        />
        <StatTile label="Variants defined" value={formatCount(summary.variants)} />
        <StatTile
          label="Distinct values"
          value={formatCount(sizes.length + colors.length)}
          hint={`${sizes.length} sizes · ${colors.length} colours`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Sizes in use"
          subtitle="How many products offer each size"
          table={{
            columns: ['Size', 'Products', 'Variants', 'Units in stock'],
            rows: sizes.map((size) => [
              size.value,
              formatCount(size.productCount),
              formatCount(size.variantCount),
              formatCount(size.stock),
            ]),
          }}
        >
          <RankBars
            rows={sizes.map((size) => ({
              label: size.value,
              value: size.productCount,
              hint: `${formatCount(size.stock)} in stock`,
            }))}
            formatValue={(value) => `${formatCount(value)} products`}
            emptyMessage="No sizes defined yet."
          />
        </ChartCard>

        <ChartCard
          title="Colours in use"
          subtitle="How many products offer each colour"
          table={{
            columns: ['Colour', 'Products', 'Variants', 'Units in stock'],
            rows: colors.map((color) => [
              color.value,
              formatCount(color.productCount),
              formatCount(color.variantCount),
              formatCount(color.stock),
            ]),
          }}
        >
          <RankBars
            rows={colors.map((color) => ({
              label: color.value,
              value: color.productCount,
              hint: `${formatCount(color.stock)} in stock`,
            }))}
            formatValue={(value) => `${formatCount(value)} products`}
            emptyMessage="No colours defined yet."
          />
        </ChartCard>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-slate-900">Where to change these</h3>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
          <li>
            Variants, sizes, colours and per-variant pricing live on each product —{' '}
            <Link to="/admin/products" className="font-semibold text-brand-600 hover:underline">
              manage products
            </Link>
            .
          </li>
          <li>
            Categories and subcategories —{' '}
            <Link to="/admin/categories" className="font-semibold text-brand-600 hover:underline">
              manage categories
            </Link>
            .
          </li>
          <li>
            Brands —{' '}
            <Link to="/admin/brands" className="font-semibold text-brand-600 hover:underline">
              manage brands
            </Link>
            .
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Changes made in those screens flow straight through to the storefront filters and to every
          seller panel.
        </p>
      </div>
    </div>
  )
}
