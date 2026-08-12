import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchCheckoutSummary, placeOrder } from '@/features/orders/orderSlice'
import { fetchCart } from '@/features/cart/cartSlice'
import { OrderSummaryCard } from '@/components/order/OrderSummaryCard'
import { CouponBox } from '@/components/order/CouponBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { CartIcon } from '@/components/ui/Icons'
import { formatPrice } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'

export default function Checkout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { checkout, checkoutStatus, placing } = useAppSelector((state) => state.orders)

  const couponCode = searchParams.get('coupon')
  const [addressId, setAddressId] = useState<number | null>(null)
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    dispatch(fetchCheckoutSummary(couponCode ? { coupon: couponCode } : undefined))
  }, [dispatch, couponCode])

  // Default to the customer's default address and the first payment method.
  useEffect(() => {
    if (!checkout) return

    setAddressId((current) => {
      if (current && checkout.addresses.some((a) => a.id === current)) return current
      return checkout.addresses.find((a) => a.isDefault)?.id ?? checkout.addresses[0]?.id ?? null
    })

    setPaymentMethodId((current) => {
      if (current && checkout.paymentMethods.some((m) => m.id === current)) return current
      return checkout.paymentMethods[0]?.id ?? null
    })
  }, [checkout])

  const selectedMethod = useMemo(
    () => checkout?.paymentMethods.find((m) => m.id === paymentMethodId) ?? null,
    [checkout, paymentMethodId]
  )

  const handlePlaceOrder = async () => {
    if (!addressId) {
      notify.warning('Please select a delivery address')
      return
    }
    if (!paymentMethodId) {
      notify.warning('Please select a payment method')
      return
    }

    const result = await dispatch(
      placeOrder({
        addressId,
        paymentMethodId,
        couponCode: couponCode || undefined,
        customerNote: note.trim() || undefined,
      })
    )

    if (placeOrder.fulfilled.match(result)) {
      notify.success(`Order ${result.payload.orderNumber} placed`)
      // The cart is now empty server-side, so refresh the badge before leaving.
      dispatch(fetchCart())
      navigate(`/orders/${result.payload.orderNumber}?placed=1`, { replace: true })
    } else {
      notifyApiError(result.payload, 'Could not place your order')
      // Stock or availability may have moved under us; reprice before retrying.
      dispatch(fetchCheckoutSummary(couponCode ? { coupon: couponCode } : undefined))
    }
  }

  if (checkoutStatus === 'loading' && !checkout) return <PageLoader label="Preparing checkout…" />

  if (!checkout || checkout.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<CartIcon className="h-12 w-12" />}
          title="There is nothing to check out"
          description="Add a few products to your cart and come back."
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
      <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/cart" className="hover:text-brand-600">Cart</Link>
        <span>/</span>
        <span className="text-slate-800">Checkout</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      <p className="mt-1 text-sm text-slate-500">
        Review everything below, then place your order.
      </p>

      {checkout.hasUnavailableItems ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Some items in your cart are no longer available.{' '}
          <Link to="/cart" className="font-semibold underline">
            Review your cart
          </Link>{' '}
          before ordering.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">1. Delivery address</h2>
              <Link to="/addresses" className="text-xs font-semibold text-brand-600 hover:underline">
                Manage addresses
              </Link>
            </div>

            {checkout.addresses.length === 0 ? (
              <p className="text-sm text-slate-500">
                You have no saved address.{' '}
                <Link to="/addresses" className="font-semibold text-brand-600 hover:underline">
                  Add one
                </Link>{' '}
                to continue.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {checkout.addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      addressId === address.id
                        ? 'border-brand-600 bg-brand-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <span>
                      <span className="font-medium text-slate-800">{address.fullName}</span>
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {address.label}
                      </span>
                      {address.isDefault ? (
                        <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          Default
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        {address.addressLine1}
                        {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                        <br />
                        {address.city}, {address.state} {address.postalCode}
                        <br />
                        Phone: {address.phone}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">2. Payment method</h2>

            {checkout.paymentMethods.length === 0 ? (
              <p className="text-sm text-slate-500">
                No payment methods are available right now. Please try again later.
              </p>
            ) : (
              <div className="space-y-2">
                {checkout.paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      paymentMethodId === method.id
                        ? 'border-brand-600 bg-brand-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      checked={paymentMethodId === method.id}
                      onChange={() => setPaymentMethodId(method.id)}
                      className="mt-1 accent-brand-600"
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{method.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            method.settlesImmediately
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {method.settlesImmediately ? 'Paid on placing' : 'Pay on delivery'}
                        </span>
                      </span>
                      {method.description ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{method.description}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {selectedMethod?.instructions ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {selectedMethod.instructions}
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">
              3. Review items ({checkout.summary.itemCount})
            </h2>

            <ul className="divide-y divide-slate-100">
              {checkout.items.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {line.product.image ? (
                      <img src={line.product.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <Link
                      to={`/product/${line.product.slug}`}
                      className="text-sm font-medium text-slate-800 hover:text-brand-600"
                    >
                      {line.product.name}
                    </Link>
                    {line.variantLabel ? (
                      <span className="text-xs text-slate-500">{line.variantLabel}</span>
                    ) : null}
                    <span className="mt-auto text-xs text-slate-500">
                      {formatPrice(line.effectivePrice)} × {line.quantity}
                    </span>
                    {line.issues.length > 0 ? (
                      <span className="text-xs font-medium text-rose-600">{line.issues[0]}</span>
                    ) : null}
                  </div>

                  <div className="text-right text-sm font-semibold text-slate-900">
                    {formatPrice(line.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <label className="label" htmlFor="note">Delivery note (optional)</label>
              <textarea
                id="note"
                rows={2}
                maxLength={500}
                className="input-field"
                placeholder="Anything the delivery partner should know?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <CouponBox
            onChange={(code) => {
              const next = new URLSearchParams(searchParams)
              if (code) next.set('coupon', code)
              else next.delete('coupon')
              setSearchParams(next, { replace: true })
            }}
          />

          <OrderSummaryCard
            summary={checkout.summary}
            couponCode={checkout.coupon?.code}
            title="Order total"
          >
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handlePlaceOrder}
              disabled={placing || !checkout.canPlaceOrder || checkout.hasUnavailableItems}
            >
              {placing ? (
                <Spinner className="h-4 w-4" label="Placing order…" />
              ) : selectedMethod && !selectedMethod.settlesImmediately ? (
                `Place order · ${formatPrice(checkout.summary.total)}`
              ) : (
                `Pay ${formatPrice(checkout.summary.total)}`
              )}
            </button>

            <Link to="/cart" className="btn-outline mt-2 w-full">
              Back to cart
            </Link>

            <p className="mt-3 text-center text-xs text-slate-400">
              {selectedMethod && !selectedMethod.settlesImmediately
                ? 'You will pay in cash when the order arrives.'
                : 'Your payment will be recorded as paid once the order is placed.'}
            </p>
          </OrderSummaryCard>
        </div>
      </div>
    </div>
  )
}
