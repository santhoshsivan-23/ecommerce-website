import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearDraftQuote,
  createSellerOrder,
  fetchSellerCustomers,
  fetchSellerStats,
  quoteDraftOrder,
} from '@/features/seller/sellerSlice'
import { fetchProducts } from '@/features/products/productSlice'
import { fetchPaymentMethods } from '@/features/payments/paymentSlice'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Spinner } from '@/components/ui/Spinner'
import { CloseIcon, SearchIcon, TrashIcon } from '@/components/ui/Icons'
import { formatPrice, primaryImage, resolvePricing, resolveStock } from '@/utils/format'
import { notify, notifyApiError } from '@/utils/notify'
import type { Address, DraftLine, Product, ProductVariant, SellerCustomer } from '@/types'

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="mb-4 font-semibold text-slate-900">
        {index}. {title}
      </h3>
      {children}
    </section>
  )
}

export default function SellerCreateOrder() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { customers, draftQuote } = useAppSelector((state) => state.seller)
  const { items: products, listStatus } = useAppSelector((state) => state.products)
  const paymentMethods = useAppSelector((state) => state.payments.methods)

  const [customerSearch, setCustomerSearch] = useState('')
  const [customer, setCustomer] = useState<SellerCustomer | null>(null)
  const [addressId, setAddressId] = useState<number | null>(null)

  const [productSearch, setProductSearch] = useState('')
  const [appliedProductSearch, setAppliedProductSearch] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [variantPicker, setVariantPicker] = useState<Product | null>(null)

  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    dispatch(fetchSellerCustomers())
    dispatch(fetchPaymentMethods())
  }, [dispatch])

  // Only this seller's own products can be added to the order.
  useEffect(() => {
    dispatch(fetchProducts({ q: appliedProductSearch || undefined, mine: true, limit: 12 }))
  }, [dispatch, appliedProductSearch])

  useEffect(() => {
    if (paymentMethods.length > 0 && paymentMethodId === null) {
      setPaymentMethodId(paymentMethods[0].id)
    }
  }, [paymentMethods, paymentMethodId])

  // The server prices every change, so the shown total is the one that gets charged.
  const requestQuote = useCallback(
    (nextLines: DraftLine[]) => {
      if (nextLines.length === 0) {
        dispatch(clearDraftQuote())
        return
      }
      dispatch(
        quoteDraftOrder({
          items: nextLines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        })
      ).then((result) => {
        if (quoteDraftOrder.rejected.match(result)) notifyApiError(result.payload)
      })
    },
    [dispatch]
  )

  useEffect(() => {
    requestQuote(lines)
  }, [lines, requestQuote])

  const addLine = (product: Product, variant: ProductVariant | null) => {
    const pricing = resolvePricing(product, variant)
    const stock = variant ? variant.stock : resolveStock(product)

    if (stock <= 0) {
      notify.error(`${product.name} is out of stock`)
      return
    }

    setLines((current) => {
      const existing = current.find(
        (line) => line.productId === product.id && line.variantId === (variant?.id ?? null)
      )

      if (existing) {
        if (existing.quantity >= stock) {
          notify.warning(`Only ${stock} unit(s) available`)
          return current
        }
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line
        )
      }

      return [
        ...current,
        {
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: 1,
          name: product.name,
          variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : null,
          image: primaryImage(product),
          unitPrice: pricing.effective,
          availableStock: stock,
        },
      ]
    })

    notify.success(`${product.name} added`)
  }

  const handleProductClick = (product: Product) => {
    const activeVariants = (product.variants ?? []).filter((v) => v.isActive)
    // Variant products need a concrete choice, exactly as at customer checkout.
    if (activeVariants.length > 0) setVariantPicker(product)
    else addLine(product, null)
  }

  const updateQuantity = (index: number, quantity: number) => {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, quantity } : line))
    )
  }

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  const selectedCustomerAddresses: Address[] = useMemo(
    () => customer?.addresses ?? [],
    [customer]
  )

  const selectCustomer = (next: SellerCustomer) => {
    setCustomer(next)
    const preferred = (next.addresses ?? []).find((a) => a.isDefault) ?? next.addresses?.[0]
    setAddressId(preferred ? preferred.id : null)
  }

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.phone ?? '').includes(term)
    )
  }, [customers, customerSearch])

  const canSubmit =
    customer !== null && addressId !== null && lines.length > 0 && paymentMethodId !== null

  const handleSubmit = async () => {
    if (!canSubmit || !customer || !paymentMethodId) {
      notify.error('Choose a customer, an address, at least one product and a payment method')
      return
    }

    setPlacing(true)
    const result = await dispatch(
      createSellerOrder({
        customerId: customer.id,
        addressId,
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
        })),
        paymentMethodId,
        note: note.trim() || undefined,
      })
    )
    setPlacing(false)

    if (createSellerOrder.fulfilled.match(result)) {
      notify.success(`Order ${result.payload.orderNumber} created`)
      dispatch(fetchSellerStats())
      navigate(`/seller/orders/${result.payload.id}`)
    } else {
      notifyApiError(result.payload, 'Could not create the order')
    }
  }

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Create an order</h2>
        <button type="button" className="btn-outline" onClick={() => navigate('/seller/orders')}>
          Back to orders
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Step index={1} title="Select customer">
            <div className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9"
                placeholder="Search customers by name, email or phone"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
              />
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-slate-500">No customers match that search.</p>
              ) : (
                filteredCustomers.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      customer?.id === option.id
                        ? 'border-brand-600 bg-brand-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="customer"
                      className="mt-0.5 accent-brand-600"
                      checked={customer?.id === option.id}
                      onChange={() => selectCustomer(option)}
                    />
                    <span>
                      <span className="font-medium text-slate-800">{option.name}</span>
                      <span className="block text-xs text-slate-500">{option.email}</span>
                      {option.phone ? (
                        <span className="block text-xs text-slate-400">{option.phone}</span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>

            {customer ? (
              <div className="mt-4">
                <h4 className="label">Delivery address</h4>
                {selectedCustomerAddresses.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {customer.name} has no saved address. Ask them to add one before ordering.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerAddresses.map((address) => (
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
                          name="address"
                          className="mt-0.5 accent-brand-600"
                          checked={addressId === address.id}
                          onChange={() => setAddressId(address.id)}
                        />
                        <span>
                          <span className="font-medium text-slate-800">{address.fullName}</span>
                          {address.isDefault ? (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                              Default
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {address.addressLine1}, {address.city}, {address.state}{' '}
                            {address.postalCode}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </Step>

          <Step index={2} title="Select products">
            <form
              className="mb-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setAppliedProductSearch(productSearch.trim())
              }}
            >
              <input
                className="input-field"
                placeholder="Search my products"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
              <button type="submit" className="btn-outline">Search</button>
            </form>

            {listStatus === 'loading' ? (
              <div className="py-6 text-center text-slate-400">
                <Spinner />
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-slate-500">No products match that search.</p>
            ) : (
              <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                {products.map((product) => {
                  const stock = resolveStock(product)
                  const pricing = resolvePricing(product)
                  const image = primaryImage(product)

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product)}
                      disabled={stock <= 0}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatPrice(pricing.effective)} ·{' '}
                          {stock <= 0 ? 'Out of stock' : `${stock} in stock`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Step>

          <Step index={3} title="Review items">
            {lines.length === 0 ? (
              <p className="text-sm text-slate-500">No products added yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lines.map((line, index) => (
                  <li key={`${line.productId}-${line.variantId ?? 'none'}`} className="flex gap-3 py-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
                      {line.image ? (
                        <img src={line.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{line.name}</p>
                        {line.variantLabel ? (
                          <p className="text-sm text-slate-500">{line.variantLabel}</p>
                        ) : null}
                        <p className="text-xs text-slate-400">
                          {formatPrice(line.unitPrice)} each · {line.availableStock} in stock
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <QuantityStepper
                          value={line.quantity}
                          max={line.availableStock}
                          onChange={(next) => updateQuantity(index, next)}
                        />
                        <p className="w-20 text-right font-semibold text-slate-900">
                          {formatPrice(line.unitPrice * line.quantity)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${line.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Step>

          <Step index={4} title="Payment method">
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    paymentMethodId === method.id
                      ? 'border-brand-600 bg-brand-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="mt-0.5 accent-brand-600"
                    checked={paymentMethodId === method.id}
                    onChange={() => setPaymentMethodId(method.id)}
                  />
                  <span>
                    <span className="font-medium text-slate-800">{method.name}</span>
                    {method.description ? (
                      <span className="block text-xs text-slate-500">{method.description}</span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {method.settlesImmediately
                        ? 'Recorded as paid when the order is created'
                        : 'Recorded as pending until delivery'}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="note">Note (optional)</label>
              <input
                id="note"
                className="input-field"
                value={note}
                placeholder="Phone order taken on 12 Aug"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </Step>
        </div>

        <div className="h-fit lg:sticky lg:top-24">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-slate-900">Order summary</h3>

            {!draftQuote ? (
              <p className="text-sm text-slate-500">Add products to see the total.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Product total</dt>
                  <dd className="font-medium text-slate-800">
                    {formatPrice(draftQuote.summary.subtotal)}
                  </dd>
                </div>

                {draftQuote.summary.productDiscount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Product discount</dt>
                    <dd className="font-medium text-emerald-600">
                      − {formatPrice(draftQuote.summary.productDiscount)}
                    </dd>
                  </div>
                ) : null}

                <div className="flex justify-between">
                  <dt className="text-slate-500">Delivery charge</dt>
                  <dd className="font-medium text-slate-800">
                    {draftQuote.summary.deliveryCharge === 0 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      formatPrice(draftQuote.summary.deliveryCharge)
                    )}
                  </dd>
                </div>

                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base">
                  <dt className="font-semibold text-slate-900">Total payable</dt>
                  <dd className="font-bold text-slate-900">{formatPrice(draftQuote.summary.total)}</dd>
                </div>
              </dl>
            )}

            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p>Customer: {customer ? customer.name : 'not selected'}</p>
              <p>Items: {lines.reduce((sum, line) => sum + line.quantity, 0)}</p>
              <p>Payment: {selectedMethod ? selectedMethod.name : 'not selected'}</p>
            </div>

            <button
              type="button"
              className="btn-primary mt-4 w-full"
              onClick={handleSubmit}
              disabled={!canSubmit || placing}
            >
              {placing ? <Spinner className="h-4 w-4" label="Creating…" /> : 'Create order'}
            </button>

            <p className="mt-2 text-center text-xs text-slate-400">
              Stock is validated and reduced when the order is created.
            </p>
          </div>
        </div>
      </div>

      {variantPicker ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-md p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Choose a variant</h3>
                <p className="text-sm text-slate-500">{variantPicker.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setVariantPicker(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {(variantPicker.variants ?? [])
                .filter((variant) => variant.isActive)
                .map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={variant.stock <= 0}
                    onClick={() => {
                      addLine(variantPicker, variant)
                      setVariantPicker(null)
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      <span className="font-medium text-slate-800">
                        {[variant.color, variant.size].filter(Boolean).join(' / ')}
                      </span>
                      {variant.sku ? (
                        <span className="block text-xs text-slate-400">SKU: {variant.sku}</span>
                      ) : null}
                    </span>
                    <span className={variant.stock <= 0 ? 'text-rose-600' : 'text-slate-500'}>
                      {variant.stock <= 0 ? 'Out of stock' : `${variant.stock} in stock`}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
