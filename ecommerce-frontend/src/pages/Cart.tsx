import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearCart, fetchCart, removeCartItem, updateCartItem } from '@/features/cart/cartSlice'
import { fetchAddresses } from '@/features/address/addressSlice'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { CartIcon, TrashIcon } from '@/components/ui/Icons'
import { OrderSummaryCard } from '@/components/order/OrderSummaryCard'
import { CouponBox } from '@/components/order/CouponBox'
import { formatPrice, variantLabel } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'

export default function Cart() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { items, summary, coupon, status, pendingItemIds } = useAppSelector((state) => state.cart)
  const addresses = useAppSelector((state) => state.address.items)

  useEffect(() => {
    dispatch(fetchCart())
    dispatch(fetchAddresses())
  }, [dispatch])

  const handleQuantity = async (itemId: number, quantity: number) => {
    const result = await dispatch(updateCartItem({ itemId, quantity }))
    if (!updateCartItem.fulfilled.match(result)) notifyApiError(result.payload)
  }

  const handleRemove = async (itemId: number, name: string) => {
    const result = await dispatch(removeCartItem(itemId))
    if (removeCartItem.fulfilled.match(result)) notify.success(`${name} removed from cart`)
    else notifyApiError(result.payload)
  }

  const handleClear = async () => {
    const result = await dispatch(clearCart())
    if (clearCart.fulfilled.match(result)) notify.success('Cart cleared')
    else notifyApiError(result.payload)
  }

  const handleCheckout = () => {
    if (items.some((item) => !item.isAvailable)) {
      notify.error('Please fix the highlighted items before continuing')
      return
    }
    if (addresses.length === 0) {
      notify.warning('Please add a delivery address first')
      navigate('/addresses')
      return
    }
    navigate(coupon ? `/checkout?coupon=${coupon.code}` : '/checkout')
  }

  if (status === 'loading' && items.length === 0) return <PageLoader label="Loading your cart…" />

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<CartIcon className="h-12 w-12" />}
          title="Your cart is empty"
          description="Browse the catalogue and add a few things you like."
          action={
            <Link to="/products" className="btn-primary">
              Start shopping
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shopping cart</h1>
          <p className="mt-1 text-sm text-slate-500">
            {summary.itemCount} item{summary.itemCount === 1 ? '' : 's'} ready to order
          </p>
        </div>
        <button type="button" className="btn-outline text-rose-600" onClick={handleClear}>
          Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const isPending = pendingItemIds.includes(item.id)
            const label = item.variant ? variantLabel(item.variant) : ''

            return (
              <div
                key={item.id}
                className={`card flex gap-4 p-4 ${item.isAvailable ? '' : 'border-rose-200 bg-rose-50/40'}`}
              >
                <Link
                  to={`/product/${item.product.slug}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100"
                >
                  {item.product.image ? (
                    <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {item.product.brand ? (
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {item.product.brand.name}
                        </p>
                      ) : null}
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="font-medium text-slate-800 hover:text-brand-600"
                      >
                        {item.product.name}
                      </Link>
                      {label ? <p className="text-sm text-slate-500">{label}</p> : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id, item.product.name)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${item.product.name}`}
                      disabled={isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {item.issues.length > 0 ? (
                    <ul className="text-xs font-medium text-rose-600">
                      {item.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.max(1, item.availableStock)}
                        disabled={isPending || item.availableStock <= 0}
                        onChange={(next) => handleQuantity(item.id, next)}
                      />
                      {isPending ? <Spinner className="h-4 w-4 text-slate-400" /> : null}
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatPrice(item.lineTotal)}</p>
                      {item.effectivePrice < item.originalPrice ? (
                        <p className="text-xs text-slate-400">
                          <span className="line-through">{formatPrice(item.originalPrice)}</span> each
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">{formatPrice(item.effectivePrice)} each</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-4">
          <CouponBox />

          <OrderSummaryCard summary={summary} couponCode={coupon?.code}>
            <button type="button" className="btn-primary w-full" onClick={handleCheckout}>
              Proceed to checkout
            </button>
            <Link to="/products" className="btn-outline mt-2 w-full">
              Continue shopping
            </Link>
          </OrderSummaryCard>

          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Delivery address</h2>
              <Link to="/addresses" className="text-xs font-semibold text-brand-600 hover:underline">
                Manage
              </Link>
            </div>

            {addresses.length === 0 ? (
              <p className="text-sm text-slate-500">
                No address saved yet.{' '}
                <Link to="/addresses" className="font-semibold text-brand-600 hover:underline">
                  Add one
                </Link>{' '}
                to continue.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                You have {addresses.length} saved address{addresses.length === 1 ? '' : 'es'}. You
                will choose the delivery address at checkout.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
