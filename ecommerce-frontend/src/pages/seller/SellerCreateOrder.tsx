import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearDraftQuote,
  createSellerCustomer,
  createSellerOrder,
  fetchSellerCustomers,
  fetchSellerStats,
  quoteDraftOrder,
} from '@/features/seller/sellerSlice'
import { fetchProducts } from '@/features/products/productSlice'
import { fetchPaymentMethods } from '@/features/payments/paymentSlice'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Spinner } from '@/components/ui/Spinner'
import {
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiPlus,
  FiSearch,
  FiShoppingBag,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi'
import { formatPrice, primaryImage, resolvePricing, resolveStock } from '@/utils/format'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { DraftLine, Product, ProductVariant, SellerCustomer } from '@/types'

const PAGE_SIZE = 40

export default function SellerCreateOrder() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { customers, draftQuote } = useAppSelector((state) => state.seller)
  const { items: products, pagination: productPagination, listStatus } = useAppSelector(
    (state) => state.products
  )
  const paymentMethods = useAppSelector((state) => state.payments.methods)

  // Current Wizard Step: 1 = Customer Details, 2 = Product Selection, 3 = Payment & Summary
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Customer State
  const [customerFlow, setCustomerFlow] = useState<'cards' | 'existing-search' | 'add-new'>('cards')
  const [customerMode, setCustomerMode] = useState<'walk-in' | 'existing' | 'new'>('walk-in')
  const [customerSearch, setCustomerSearch] = useState('')
  const [hasSearchedCustomer, setHasSearchedCustomer] = useState(false)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<SellerCustomer | null>(null)
  const [addressId, setAddressId] = useState<number | null>(null)

  // Step 1: Add New Customer Form
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '' })
  const [newCustomerErrors, setNewCustomerErrors] = useState<Record<string, string>>({})
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Step 2: Product Selection & Dedicated Search API
  const [productPage, setProductPage] = useState(1)
  const [productSearchInput, setProductSearchInput] = useState('')
  const [appliedProductSearch, setAppliedProductSearch] = useState('')

  // Persistent Order Cart Lines across product page changes
  const [lines, setLines] = useState<DraftLine[]>([])
  const [variantPicker, setVariantPicker] = useState<Product | null>(null)

  // Step 3: Payment & Coupon Details
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [publicCoupons, setPublicCoupons] = useState<
    Array<{ id: number; code: string; description: string | null; discountType: string; discountValue: number }>
  >([])
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)

  // Fetch payment methods and public coupons initially
  useEffect(() => {
    dispatch(fetchPaymentMethods())
    fetch('/api/coupons/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.coupons)) {
          setPublicCoupons(data.data.coupons)
        }
      })
      .catch(() => {})
  }, [dispatch])

  // Dedicated Product Search API (40 items/page)
  useEffect(() => {
    if (step === 2 || step === 3) {
      dispatch(
        fetchProducts({
          q: appliedProductSearch || undefined,
          page: productPage,
          limit: PAGE_SIZE,
          sort: 'newest',
        })
      )
    }
  }, [dispatch, appliedProductSearch, productPage, step])

  // Set default payment method when loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && paymentMethodId === null) {
      setPaymentMethodId(paymentMethods[0].id)
    }
  }, [paymentMethods, paymentMethodId])

  // Price draft quote on server whenever cart lines or coupon change
  const requestQuote = useCallback(
    (nextLines: DraftLine[], code?: string) => {
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
          couponCode: code !== undefined ? (code || null) : (couponCode || null),
        })
      ).then((result) => {
        if (quoteDraftOrder.rejected.match(result)) notifyApiError(result.payload)
      })
    },
    [dispatch, couponCode]
  )

  useEffect(() => {
    requestQuote(lines, couponCode)
  }, [lines, couponCode, requestQuote])

  // --- STEP 1: CUSTOMER HANDLING ---

  const handleSelectWalkInCard = () => {
    setCustomerMode('walk-in')
    setSelectedCustomer(null)
    setAddressId(null)
    setStep(2) // Advance directly to Step 2 Product Selection
    notify.info('Customer assigned as Walk-in Customer')
  }

  const handleOpenExistingSearchCard = () => {
    setCustomerFlow('existing-search')
    setCustomerSearch('')
    setHasSearchedCustomer(false)
  }

  const handleCustomerSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const term = customerSearch.trim()
    if (!term) return

    setSearchingCustomer(true)
    await dispatch(fetchSellerCustomers({ q: term }))
    setSearchingCustomer(false)
    setHasSearchedCustomer(true)
  }

  const handleSelectExistingCustomer = (c: SellerCustomer) => {
    setSelectedCustomer(c)
    setCustomerMode('existing')
    const preferred = (c.addresses ?? []).find((a) => a.isDefault) ?? c.addresses?.[0]
    setAddressId(preferred ? preferred.id : null)
    setStep(2) // Advance to Step 2
    notify.success(`Customer "${c.name}" selected`)
  }

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCustomerErrors({})

    if (!newCustomerForm.name.trim()) {
      setNewCustomerErrors({ name: 'Customer name is required' })
      return
    }
    if (!newCustomerForm.email.trim() || !/^\S+@\S+\.\S+$/.test(newCustomerForm.email)) {
      setNewCustomerErrors({ email: 'Enter a valid email address' })
      return
    }

    setCreatingCustomer(true)
    const result = await dispatch(
      createSellerCustomer({
        name: newCustomerForm.name.trim(),
        email: newCustomerForm.email.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
      })
    )
    setCreatingCustomer(false)

    if (createSellerCustomer.fulfilled.match(result)) {
      notify.success(`New Customer "${result.payload.name}" created`)
      setSelectedCustomer(result.payload)
      setCustomerMode('new')
      setAddressId(null)
      setStep(2) // Auto advance to Step 2
    } else {
      setNewCustomerErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not create customer')
    }
  }

  // --- STEP 2 & CART HANDLING ---

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

    notify.success(`${product.name} added to order`)
  }

  const handleProductClick = (product: Product) => {
    const activeVariants = (product.variants ?? []).filter((v) => v.isActive)
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

  const handleProductSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setProductPage(1)
    setAppliedProductSearch(productSearchInput.trim())
  }

  const handleClearProductSearch = () => {
    setProductSearchInput('')
    setAppliedProductSearch('')
    setProductPage(1)
  }

  // --- STEP 3 & FINAL SUBMISSION ---

  const canSubmit = lines.length > 0 && paymentMethodId !== null

  const handleFinalSubmit = async () => {
    if (!canSubmit || !paymentMethodId) {
      notify.error('Add products and choose a payment method to complete order')
      return
    }

    setPlacing(true)
    const result = await dispatch(
      createSellerOrder({
        customerId: customerMode === 'walk-in' || !selectedCustomer ? undefined : selectedCustomer.id,
        addressId: customerMode === 'walk-in' ? null : addressId,
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
      notify.success(`Order ${result.payload.orderNumber} created successfully!`)
      dispatch(fetchSellerStats())
      navigate(`/seller/orders/${result.payload.id}`)
    } else {
      notifyApiError(result.payload, 'Could not create the order')
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* HEADER & STEP PROGRESS INDICATOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Create New Order</h1>
          <p className="text-xs text-slate-500">Step-by-Step Order Wizard for Walk-in & Delivery Sales</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${
              step === 1 ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">1</span>
            Customer Details
          </div>

          <FiChevronRight className="h-4 w-4 text-slate-400" />

          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${
              step === 2 ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">2</span>
            Select Products ({lines.reduce((s, l) => s + l.quantity, 0)})
          </div>

          <FiChevronRight className="h-4 w-4 text-slate-400" />

          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${
              step === 3 ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">3</span>
            Payment & Summary
          </div>
        </div>
      </div>

      {/* STEP 1: CUSTOMER DETAILS (3 CARDS) */}
      {step === 1 ? (
        <div className="flex flex-col gap-6">
          {customerFlow === 'cards' ? (
            <>
              <div className="text-center py-2">
                <h2 className="text-lg font-bold text-zinc-900">Step 1 — Choose Customer Option</h2>
                <p className="text-xs text-slate-500">Select how you want to assign this order</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* CARD 1: WALK-IN / DIRECT SALE */}
                <button
                  type="button"
                  onClick={handleSelectWalkInCard}
                  className="group card flex flex-col justify-between p-6 text-left border-2 border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all hover:bg-orange-50/30"
                >
                  <div>
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <FiZap className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                      Walk-in / Direct Sale
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Create an order without selecting a customer. Perfect for quick over-the-counter physical sales.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600">
                    <span>Quick Walk-in Sale</span>
                    <FiChevronRight className="h-4 w-4" />
                  </div>
                </button>

                {/* CARD 2: SELECT EXISTING CUSTOMER */}
                <button
                  type="button"
                  onClick={handleOpenExistingSearchCard}
                  className="group card flex flex-col justify-between p-6 text-left border-2 border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all hover:bg-orange-50/30"
                >
                  <div>
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FiUsers className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                      Select Existing Customer
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Search and select an existing customer from the system database by name, phone or email.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <span>Search Customer</span>
                    <FiChevronRight className="h-4 w-4" />
                  </div>
                </button>

                {/* CARD 3: ADD NEW CUSTOMER */}
                <button
                  type="button"
                  onClick={() => setCustomerFlow('add-new')}
                  className="group card flex flex-col justify-between p-6 text-left border-2 border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all hover:bg-orange-50/30"
                >
                  <div>
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FiUserPlus className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                      Add New Customer
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Create a new customer account before creating the order. Details will be saved for future orders.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <span>Register New Customer</span>
                    <FiChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </>
          ) : customerFlow === 'existing-search' ? (
            /* EXISTING CUSTOMER LAZY SEARCH VIEW */
            <div className="card max-w-2xl mx-auto w-full p-6 border-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCustomerFlow('cards')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-zinc-900"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Back to Customer Options
                </button>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Search Customer</span>
              </div>

              <h2 className="text-lg font-bold text-zinc-900">Select Existing Customer</h2>
              <p className="text-xs text-slate-500 mb-4">Enter name, phone number, or email address to search</p>

              <form onSubmit={handleCustomerSearchSubmit} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input-field pl-10"
                    placeholder="Search customer by name, phone or email…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary shrink-0" disabled={searchingCustomer}>
                  {searchingCustomer ? <Spinner className="h-4 w-4 text-white" /> : 'Search'}
                </button>
              </form>

              {searchingCustomer ? (
                <div className="py-8 text-center text-slate-400">
                  <Spinner label="Searching customers..." />
                </div>
              ) : hasSearchedCustomer && customers.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No customers found matching “{customerSearch}”.</p>
                </div>
              ) : hasSearchedCustomer ? (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingCustomer(c)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition-all hover:border-orange-500 hover:bg-orange-50/40"
                    >
                      <div>
                        <p className="font-bold text-zinc-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                        {c.phone ? <p className="text-xs text-slate-400">{c.phone}</p> : null}
                      </div>
                      <span className="btn-outline text-xs font-semibold text-orange-600 border-orange-200 hover:bg-orange-50">
                        Select Customer
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Type in the search field above and click Search to display matching customers.
                </p>
              )}
            </div>
          ) : (
            /* ADD NEW CUSTOMER FORM VIEW */
            <div className="card max-w-xl mx-auto w-full p-6 border-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCustomerFlow('cards')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-zinc-900"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Back to Customer Options
                </button>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">New Customer</span>
              </div>

              <h2 className="text-lg font-bold text-zinc-900 mb-1">Add New Customer</h2>
              <p className="text-xs text-slate-500 mb-4">Enter customer details to register and select automatically</p>

              <form onSubmit={handleCreateNewCustomer} className="space-y-4">
                <div>
                  <label className="label" htmlFor="name">Customer Full Name</label>
                  <input
                    id="name"
                    className="input-field"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                  />
                  {newCustomerErrors.name ? <p className="field-error">{newCustomerErrors.name}</p> : null}
                </div>

                <div>
                  <label className="label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="input-field"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="ramesh@example.com"
                  />
                  {newCustomerErrors.email ? <p className="field-error">{newCustomerErrors.email}</p> : null}
                </div>

                <div>
                  <label className="label" htmlFor="phone">Phone Number (Optional)</label>
                  <input
                    id="phone"
                    type="tel"
                    className="input-field"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                  {newCustomerErrors.phone ? <p className="field-error">{newCustomerErrors.phone}</p> : null}
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" className="btn-outline" onClick={() => setCustomerFlow('cards')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={creatingCustomer}>
                    {creatingCustomer ? <Spinner className="h-4 w-4 text-white" label="Saving..." /> : 'Add & Select Customer'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : null}

      {/* STEP 2: PRODUCT SELECTION (40 items/page + LIVE CART PERSISTENCE) */}
      {step === 2 ? (
        <div className="flex flex-col gap-4">
          {/* Active Customer Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 border border-orange-200/80 p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 text-white font-bold">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                  {customerMode === 'walk-in' ? 'Walk-in Customer (Direct Sale)' : selectedCustomer?.name}
                </p>
                <p className="text-xs text-orange-700">
                  {customerMode === 'walk-in'
                    ? 'No delivery details required for over-the-counter sales'
                    : selectedCustomer?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-outline text-xs py-1.5 px-3 border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => setStep(1)}
            >
              Change Customer
            </button>
          </div>

          {/* Split Screen Layout: Left Products (40/page), Right Live Cart */}
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN: PRODUCT SELECTION (40 PER PAGE) */}
            <div className="flex flex-col gap-4">
              <div className="card p-4">
                <h3 className="text-base font-bold text-zinc-900 mb-3">
                  Step 2 — Add Products from Business Catalogue
                </h3>

                {/* Dedicated Product Search API */}
                <form onSubmit={handleProductSearchSubmit} className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input-field pl-10"
                      placeholder="Search full business catalogue by product name…"
                      value={productSearchInput}
                      onChange={(e) => setProductSearchInput(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary shrink-0">
                    Search API
                  </button>
                  {appliedProductSearch ? (
                    <button type="button" className="btn-outline shrink-0" onClick={handleClearProductSearch}>
                      Clear
                    </button>
                  ) : null}
                </form>

                {appliedProductSearch ? (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-orange-50 px-3.5 py-2 text-xs text-orange-900 border border-orange-200">
                    <span>
                      Search results for <strong>“{appliedProductSearch}”</strong> across business catalogue:
                    </span>
                    <button
                      type="button"
                      onClick={handleClearProductSearch}
                      className="font-bold text-orange-700 hover:underline"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : null}

                {/* Product Grid (40 Products/Page) */}
                {listStatus === 'loading' ? (
                  <div className="py-12 text-center text-slate-400">
                    <Spinner label="Loading products..." />
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-500">No products found matching your filter.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => {
                      const stock = resolveStock(product)
                      const pricing = resolvePricing(product)
                      const image = primaryImage(product)
                      const isOutOfStock = stock <= 0 || !product.isActive

                      return (
                        <div
                          key={product.id}
                          className="group flex flex-col justify-between rounded-xl border border-slate-200 p-3 bg-white hover:border-orange-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-100">
                              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-zinc-900 group-hover:text-orange-600">
                                {product.name}
                              </p>
                              <p className="text-xs font-bold text-zinc-800">{formatPrice(pricing.effective)}</p>
                              <span
                                className={`text-[10px] font-semibold ${
                                  isOutOfStock ? 'text-rose-600' : stock <= 5 ? 'text-amber-600' : 'text-slate-500'
                                }`}
                              >
                                {isOutOfStock ? 'Unavailable' : `${stock} in stock`}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleProductClick(product)}
                            disabled={isOutOfStock}
                            className="btn-outline mt-3 text-xs py-1.5 w-full border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 disabled:opacity-40"
                          >
                            <FiPlus className="h-3.5 w-3.5" />
                            Add to Order
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 40 Products Per Page Pagination */}
                {productPagination.totalPages > 1 ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 gap-2">
                    <span>
                      Page <strong>{productPagination.page}</strong> of <strong>{productPagination.totalPages}</strong> ({productPagination.total} total products)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                        disabled={productPage <= 1}
                        onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                      >
                        <FiChevronLeft className="h-4 w-4" />
                        Previous 40
                      </button>
                      <button
                        type="button"
                        className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                        disabled={productPage >= productPagination.totalPages}
                        onClick={() => setProductPage((p) => p + 1)}
                      >
                        Next 40
                        <FiChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE CART & ORDER SUMMARY */}
            <div className="h-fit lg:sticky lg:top-24">
              <div className="card p-5 border-slate-200 shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <FiShoppingBag className="h-5 w-5 text-orange-600" />
                    Selected Products ({lines.reduce((sum, line) => sum + line.quantity, 0)})
                  </h3>
                  {lines.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs text-rose-600 font-semibold hover:underline"
                      onClick={() => setLines([])}
                    >
                      Clear All
                    </button>
                  ) : null}
                </div>

                {lines.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <FiShoppingBag className="mx-auto h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs text-slate-500">No products added yet.</p>
                    <p className="text-[11px] text-slate-400">Select products from the list on the left.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {lines.map((line, index) => (
                        <div key={`${line.productId}-${line.variantId ?? 'none'}`} className="py-2.5 flex gap-2.5 items-center">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-100">
                            {line.image ? <img src={line.image} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-zinc-900">{line.name}</p>
                            {line.variantLabel ? <p className="text-[10px] text-slate-500">{line.variantLabel}</p> : null}
                            <p className="text-[11px] font-semibold text-orange-600">{formatPrice(line.unitPrice * line.quantity)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <QuantityStepper
                              value={line.quantity}
                              max={line.availableStock}
                              onChange={(next) => updateQuantity(index, next)}
                            />
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Price Breakdown */}
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-zinc-900">
                          {formatPrice(draftQuote?.summary.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-zinc-900 border-t border-slate-100 pt-2">
                        <span>Total Payable</span>
                        <span className="text-orange-600">
                          {formatPrice(draftQuote?.summary.total ?? lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary w-full py-3 mt-4 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2"
                      onClick={() => setStep(3)}
                    >
                      Proceed to Payment & Summary
                      <FiChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* STEP 3: PAYMENT & SUMMARY */}
      {step === 3 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-zinc-900"
              onClick={() => setStep(2)}
            >
              <FiChevronLeft className="h-4 w-4" />
              Back to Product Selection
            </button>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Step 3 of 3</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN: REVIEW SELECTED PRODUCTS & TOTALS */}
            <div className="card p-6 border-slate-200">
              <h3 className="text-base font-bold text-zinc-900 mb-4 pb-2 border-b border-slate-100">
                Order Items Review
              </h3>

              <div className="divide-y divide-slate-100 mb-6">
                {lines.map((line, index) => (
                  <div key={`${line.productId}-${line.variantId ?? 'none'}`} className="py-3 flex gap-3 items-center">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                      {line.image ? <img src={line.image} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900 text-sm">{line.name}</p>
                      {line.variantLabel ? <p className="text-xs text-slate-500">{line.variantLabel}</p> : null}
                      <p className="text-xs text-slate-400">{formatPrice(line.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <QuantityStepper
                        value={line.quantity}
                        max={line.availableStock}
                        onChange={(next) => updateQuantity(index, next)}
                      />
                      <p className="w-20 text-right font-bold text-zinc-900 text-sm">
                        {formatPrice(line.unitPrice * line.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Breakdown */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Product Subtotal</span>
                  <span className="font-semibold text-zinc-900">
                    {formatPrice(draftQuote?.summary.subtotal ?? 0)}
                  </span>
                </div>
                {draftQuote && draftQuote.summary.productDiscount > 0 ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">− {formatPrice(draftQuote.summary.productDiscount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span className="font-semibold text-zinc-900">
                    {draftQuote?.summary.deliveryCharge === 0 ? 'Free' : formatPrice(draftQuote?.summary.deliveryCharge ?? 0)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-extrabold text-zinc-900">
                  <span>Total Amount</span>
                  <span className="text-orange-600">{formatPrice(draftQuote?.summary.total ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CUSTOMER SUMMARY & PAYMENT SELECTION */}
            <div className="flex flex-col gap-6">
              {/* Customer Info Card */}
              <div className="card p-5 border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</h4>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-600 font-bold">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">
                      {customerMode === 'walk-in' ? 'Walk-in Customer (Direct Sale)' : selectedCustomer?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {customerMode === 'walk-in' ? 'Over the counter physical sale' : selectedCustomer?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Promo Code & Available Coupons Card */}
              <div className="card p-5 border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Promo Code</h4>
                
                <div className="flex gap-2 mb-3">
                  <input
                    className="input-field font-mono text-sm uppercase"
                    placeholder="Enter promo code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0 text-xs px-4"
                    onClick={() => {
                      const code = couponInput.trim()
                      setCouponCode(code)
                      requestQuote(lines, code)
                    }}
                  >
                    Apply
                  </button>
                  {couponCode ? (
                    <button
                      type="button"
                      className="btn-outline shrink-0 text-xs px-3 text-rose-600 border-rose-200"
                      onClick={() => {
                        setCouponInput('')
                        setCouponCode('')
                        requestQuote(lines, '')
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                {couponCode ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-medium mb-3">
                    Coupon <strong>{couponCode}</strong> applied to this order!
                  </div>
                ) : null}

                {/* Available Coupons List (Public Coupons with Toggle ON) */}
                {publicCoupons.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-zinc-900 mb-2">Available Coupons</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {publicCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-orange-200/80 bg-orange-50/50"
                        >
                          <div>
                            <p className="font-mono font-bold text-xs text-orange-900">{coupon.code}</p>
                            <p className="text-[11px] text-orange-700">
                              {coupon.discountType === 'percent' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                              {coupon.description ? ` · ${coupon.description}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCouponInput(coupon.code)
                              setCouponCode(coupon.code)
                              requestQuote(lines, coupon.code)
                              notify.success(`Coupon ${coupon.code} applied`)
                            }}
                            className="btn-outline text-[11px] py-1 px-2.5 border-orange-300 text-orange-700 hover:bg-orange-100 font-bold shrink-0"
                          >
                            Apply Coupon
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Payment Method Card */}
              <div className="card p-5 border-slate-200">
                <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2">
                  <FiCreditCard className="h-5 w-5 text-orange-600" />
                  Select Payment Method
                </h3>

                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                        paymentMethodId === method.id
                          ? 'border-orange-500 bg-orange-50/60 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        className="mt-0.5 accent-orange-600"
                        checked={paymentMethodId === method.id}
                        onChange={() => setPaymentMethodId(method.id)}
                      />
                      <div>
                        <p className="font-bold text-zinc-900">{method.name}</p>
                        {method.description ? <p className="text-xs text-slate-500 font-normal">{method.description}</p> : null}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="label" htmlFor="note">Order Note (Optional)</label>
                  <input
                    id="note"
                    className="input-field"
                    value={note}
                    placeholder="e.g. Counter Cash Sale"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary mt-6 w-full py-3.5 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md"
                  onClick={handleFinalSubmit}
                  disabled={!canSubmit || placing}
                >
                  {placing ? <Spinner className="h-4 w-4 text-white" label="Creating Order..." /> : 'Complete & Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* VARIANT PICKER MODAL */}
      {variantPicker ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 p-4">
          <div className="card w-full max-w-md p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Select Variant</h3>
                <p className="text-xs text-slate-500">{variantPicker.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setVariantPicker(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <FiX className="h-4 w-4" />
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
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left text-sm transition-colors hover:bg-orange-50/50 disabled:opacity-50"
                  >
                    <span>
                      <span className="font-semibold text-zinc-900">
                        {[variant.color, variant.size].filter(Boolean).join(' / ')}
                      </span>
                      {variant.sku ? <span className="block text-xs text-slate-400">SKU: {variant.sku}</span> : null}
                    </span>
                    <span className={variant.stock <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
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
