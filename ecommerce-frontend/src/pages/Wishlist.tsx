import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchWishlist, removeFromWishlist } from '@/features/wishlist/wishlistSlice'
import { moveWishlistItemToCart } from '@/features/cart/cartSlice'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { HeartIcon, TrashIcon } from '@/components/ui/Icons'
import { Rating } from '@/components/ui/Rating'
import { formatPrice, primaryImage, resolvePricing, resolveStock } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'

export default function Wishlist() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items, status } = useAppSelector((state) => state.wishlist)

  useEffect(() => {
    dispatch(fetchWishlist())
  }, [dispatch])

  const handleRemove = async (productId: number, name: string) => {
    const result = await dispatch(removeFromWishlist(productId))
    if (removeFromWishlist.fulfilled.match(result)) notify.success(`${name} removed from wishlist`)
    else notifyApiError(result.payload)
  }

  const handleMoveToCart = async (productId: number, name: string, hasVariants: boolean, slug: string) => {
    // Variant products need an explicit choice, which only the details page offers.
    if (hasVariants) {
      notify.info('Choose a size or colour on the product page first')
      navigate(`/product/${slug}`)
      return
    }

    const result = await dispatch(moveWishlistItemToCart({ productId, quantity: 1 }))
    if (moveWishlistItemToCart.fulfilled.match(result)) notify.success(`${name} moved to cart`)
    else notifyApiError(result.payload)
  }

  if (status === 'loading' && items.length === 0) return <PageLoader label="Loading your wishlist…" />

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<HeartIcon className="h-12 w-12" />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later."
          action={
            <Link to="/products" className="btn-primary">
              Browse products
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My wishlist</h1>
        <p className="mt-1 text-sm text-slate-500">
          {items.length} saved item{items.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map(({ id, product }) => {
          const pricing = resolvePricing(product)
          const stock = resolveStock(product)
          const image = primaryImage(product)
          const hasVariants = (product.variants?.length ?? 0) > 0

          return (
            <div key={id} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <Link
                to={`/product/${product.slug}`}
                className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100"
              >
                {image ? (
                  <img src={image} alt={product.name} className="h-full w-full object-cover" />
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col gap-2">
                {product.brand ? (
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {product.brand.name}
                  </span>
                ) : null}

                <Link
                  to={`/product/${product.slug}`}
                  className="font-medium text-slate-800 hover:text-brand-600"
                >
                  {product.name}
                </Link>

                <Rating value={product.rating} count={product.numReviews} />

                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-slate-900">
                    {formatPrice(pricing.effective)}
                  </span>
                  {pricing.hasDiscount ? (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(pricing.original)}
                    </span>
                  ) : null}
                </div>

                <p
                  className={`text-xs font-semibold ${
                    stock > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {stock > 0 ? 'In stock' : 'Out of stock'}
                </p>
              </div>

              <div className="flex flex-row gap-2 sm:flex-col sm:justify-center">
                <button
                  type="button"
                  className="btn-primary flex-1 sm:flex-none"
                  disabled={stock <= 0}
                  onClick={() => handleMoveToCart(product.id, product.name, hasVariants, product.slug)}
                >
                  {stock <= 0 ? 'Out of stock' : 'Move to cart'}
                </button>

                <button
                  type="button"
                  className="btn-outline gap-2 text-rose-600"
                  onClick={() => handleRemove(product.id, product.name)}
                >
                  <TrashIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
