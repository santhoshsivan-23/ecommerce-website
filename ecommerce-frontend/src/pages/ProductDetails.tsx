import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearCurrentProduct, fetchProduct } from '@/features/products/productSlice'
import { addToCart } from '@/features/cart/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/features/wishlist/wishlistSlice'
import { ProductCard } from '@/components/product/ProductCard'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Rating } from '@/components/ui/Rating'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { HeartIcon } from '@/components/ui/Icons'
import { formatPrice, resolvePricing, resolveStock, stockLabel } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'
import type { ProductVariant } from '@/types'

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { current: product, related, detailStatus, error } = useAppSelector((state) => state.products)
  const user = useAppSelector((state) => state.auth.user)
  const wishlistIds = useAppSelector((state) => state.wishlist.productIds)

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [showVariantError, setShowVariantError] = useState(false)

  useEffect(() => {
    if (slug) dispatch(fetchProduct(slug))
    return () => {
      dispatch(clearCurrentProduct())
    }
  }, [dispatch, slug])

  // A new product means the previous selection no longer applies.
  useEffect(() => {
    setSelectedImage(0)
    setSelectedSize(null)
    setSelectedColor(null)
    setQuantity(1)
    setShowVariantError(false)
  }, [product?.id])

  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((variant) => variant.isActive),
    [product]
  )
  const hasVariants = activeVariants.length > 0

  const sizes = useMemo(
    () => [...new Set(activeVariants.map((v) => v.size).filter((s): s is string => Boolean(s)))],
    [activeVariants]
  )
  const colors = useMemo(
    () => [...new Set(activeVariants.map((v) => v.color).filter((c): c is string => Boolean(c)))],
    [activeVariants]
  )

  /** The one variant matching every dimension the product actually uses. */
  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!hasVariants) return null
    if (sizes.length > 0 && !selectedSize) return null
    if (colors.length > 0 && !selectedColor) return null

    return (
      activeVariants.find(
        (variant) =>
          (sizes.length === 0 || variant.size === selectedSize) &&
          (colors.length === 0 || variant.color === selectedColor)
      ) ?? null
    )
  }, [activeVariants, colors.length, hasVariants, selectedColor, selectedSize, sizes.length])

  /** Stock for a given option, so unavailable combinations can be greyed out. */
  const stockFor = (dimension: 'size' | 'color', value: string) =>
    activeVariants
      .filter((variant) => {
        if (dimension === 'size') {
          return variant.size === value && (!selectedColor || variant.color === selectedColor)
        }
        return variant.color === value && (!selectedSize || variant.size === selectedSize)
      })
      .reduce((sum, variant) => sum + variant.stock, 0)

  if (detailStatus === 'loading') return <PageLoader label="Loading product…" />

  if (detailStatus === 'failed' || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Product not found"
          description={error ?? 'This product may have been removed or is no longer available.'}
          action={
            <Link to="/products" className="btn-primary">
              Browse all products
            </Link>
          }
        />
      </div>
    )
  }

  const pricing = resolvePricing(product, selectedVariant)
  const availableStock = resolveStock(product, selectedVariant)
  const stockState = stockLabel(availableStock)
  const inWishlist = wishlistIds.includes(product.id)
  const isCustomer = user?.role === 'customer'
  const images = product.images ?? []

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

  const handleAddToCart = async () => {
    if (!requireCustomer('add items to the cart')) return

    // Guard the same rules the API enforces, so the customer gets instant feedback.
    if (hasVariants && !selectedVariant) {
      setShowVariantError(true)
      notify.warning('Please select all options before adding to the cart')
      return
    }
    if (availableStock <= 0) {
      notify.error('This product is out of stock')
      return
    }
    if (quantity > availableStock) {
      notify.error(`Only ${availableStock} unit(s) available`)
      return
    }

    setAdding(true)
    const result = await dispatch(
      addToCart({ productId: product.id, variantId: selectedVariant?.id ?? null, quantity })
    )
    setAdding(false)

    if (addToCart.fulfilled.match(result)) notify.success(`${product.name} added to cart`)
    else notifyApiError(result.payload)
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-brand-600">Products</Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-brand-600">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="truncate text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="card aspect-square overflow-hidden bg-slate-100">
            {images[selectedImage] ? (
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].alt ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">No image</div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    index === selectedImage ? 'border-brand-600' : 'border-transparent hover:border-slate-300'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          {product.brand ? (
            <Link
              to={`/products?brand=${product.brand.slug}`}
              className="text-sm font-semibold uppercase tracking-wide text-brand-600 hover:underline"
            >
              {product.brand.name}
            </Link>
          ) : null}

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{product.name}</h1>

          <div className="flex flex-wrap items-center gap-3">
            <Rating value={product.rating} count={product.numReviews} size="md" />
            <span className="text-sm text-slate-400">|</span>
            <span className="text-sm text-slate-500">{product.soldCount} sold</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatPrice(pricing.effective)}</span>
            {pricing.hasDiscount ? (
              <>
                <span className="text-lg text-slate-400 line-through">{formatPrice(pricing.original)}</span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-700">
                  {pricing.percentOff}% off
                </span>
              </>
            ) : null}
          </div>

          <p
            className={`text-sm font-semibold ${
              stockState.tone === 'out'
                ? 'text-rose-600'
                : stockState.tone === 'low'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            {stockState.text}
          </p>

          {product.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
          ) : null}

          {colors.length > 0 ? (
            <div>
              <h3 className="label">
                Colour {selectedColor ? <span className="text-slate-500">— {selectedColor}</span> : null}
              </h3>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const disabled = stockFor('color', color) <= 0
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedColor(color)
                        setShowVariantError(false)
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selectedColor === color
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      } ${disabled ? 'cursor-not-allowed line-through opacity-40' : ''}`}
                    >
                      {color}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {sizes.length > 0 ? (
            <div>
              <h3 className="label">
                Size {selectedSize ? <span className="text-slate-500">— {selectedSize}</span> : null}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const disabled = stockFor('size', size) <= 0
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedSize(size)
                        setShowVariantError(false)
                      }}
                      className={`min-w-14 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      } ${disabled ? 'cursor-not-allowed line-through opacity-40' : ''}`}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {showVariantError && hasVariants && !selectedVariant ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Please choose {colors.length > 0 && !selectedColor ? 'a colour' : ''}
              {colors.length > 0 && !selectedColor && sizes.length > 0 && !selectedSize ? ' and ' : ''}
              {sizes.length > 0 && !selectedSize ? 'a size' : ''} before adding to the cart.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="label">Quantity</span>
              <QuantityStepper
                value={quantity}
                max={Math.max(1, availableStock)}
                disabled={availableStock <= 0}
                onChange={setQuantity}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary flex-1 sm:flex-none sm:px-8"
              onClick={handleAddToCart}
              disabled={availableStock <= 0 || adding}
            >
              {adding ? (
                <Spinner className="h-4 w-4" label="Adding…" />
              ) : availableStock <= 0 ? (
                'Out of stock'
              ) : (
                'Add to cart'
              )}
            </button>

            <button
              type="button"
              onClick={handleWishlist}
              className={`btn-outline gap-2 ${inWishlist ? 'text-rose-600' : ''}`}
            >
              <HeartIcon filled={inWishlist} className="h-5 w-5" />
              {inWishlist ? 'In wishlist' : 'Add to wishlist'}
            </button>
          </div>

          {selectedVariant?.sku ? (
            <p className="text-xs text-slate-400">SKU: {selectedVariant.sku}</p>
          ) : null}

          {product.specifications.length > 0 ? (
            <div className="card mt-2 overflow-hidden">
              <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
                Specifications
              </h2>
              <dl className="divide-y divide-slate-100">
                {product.specifications.map((spec) => (
                  <div key={spec.key} className="grid grid-cols-3 gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-slate-500">{spec.key}</dt>
                    <dd className="col-span-2 font-medium text-slate-800">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-bold text-slate-900">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
