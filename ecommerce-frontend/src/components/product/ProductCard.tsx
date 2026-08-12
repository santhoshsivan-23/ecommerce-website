import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { addToCart } from '@/features/cart/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/features/wishlist/wishlistSlice'
import { formatPrice, primaryImage, resolvePricing, resolveStock } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'
import type { Product } from '@/types'
import { HeartIcon } from '@/components/ui/Icons'
import { Rating } from '@/components/ui/Rating'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const wishlistIds = useAppSelector((state) => state.wishlist.productIds)

  const { original, effective, hasDiscount, percentOff } = resolvePricing(product)
  const stock = resolveStock(product)
  const image = primaryImage(product)
  const inWishlist = wishlistIds.includes(product.id)
  const hasVariants = (product.variants?.length ?? 0) > 0
  const isCustomer = user?.role === 'customer'

  const requireCustomer = (action: string) => {
    if (!user) {
      notify.info(`Please log in to ${action}`)
      navigate('/login', { state: { from: `/product/${product.slug}` } })
      return false
    }
    if (!isCustomer) {
      notify.warning(`Only customer accounts can ${action}`)
      return false
    }
    return true
  }

  const handleWishlist = async () => {
    if (!requireCustomer('use the wishlist')) return

    if (inWishlist) {
      const result = await dispatch(removeFromWishlist(product.id))
      if (removeFromWishlist.fulfilled.match(result)) notify.success('Removed from wishlist')
      else notifyApiError(result.payload)
      return
    }

    const result = await dispatch(addToWishlist(product.id))
    if (addToWishlist.fulfilled.match(result)) notify.success('Added to wishlist')
    else notifyApiError(result.payload)
  }

  const handleAddToCart = async () => {
    if (!requireCustomer('add items to the cart')) return

    // Variant products need a choice, so send the customer to the details page.
    if (hasVariants) {
      navigate(`/product/${product.slug}`)
      notify.info('Choose a variant to continue')
      return
    }

    const result = await dispatch(addToCart({ productId: product.id, quantity: 1 }))
    if (addToCart.fulfilled.match(result)) notify.success(`${product.name} added to cart`)
    else notifyApiError(result.payload)
  }

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
        </Link>

        {hasDiscount ? (
          <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
            {percentOff}% OFF
          </span>
        ) : null}

        {stock <= 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
              Out of stock
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={inWishlist}
          className={`absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors ${
            inWishlist ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
          }`}
        >
          <HeartIcon filled={inWishlist} className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.brand ? (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {product.brand.name}
          </span>
        ) : null}

        <Link
          to={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-800 hover:text-brand-600"
        >
          {product.name}
        </Link>

        <Rating value={product.rating} count={product.numReviews} />

        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-slate-900">{formatPrice(effective)}</span>
          {hasDiscount ? (
            <span className="text-sm text-slate-400 line-through">{formatPrice(original)}</span>
          ) : null}
        </div>

        <button
          type="button"
          className="btn-primary mt-auto w-full"
          onClick={handleAddToCart}
          disabled={stock <= 0}
        >
          {stock <= 0 ? 'Out of stock' : hasVariants ? 'Select options' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}
