import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchBrands, fetchCategories } from '@/features/catalog/categorySlice'
import { fetchProduct, saveProduct } from '@/features/products/productSlice'
import { fetchSellers } from '@/features/admin/adminSlice'
import { fetchVariations } from '@/features/variants/variationSlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import {
  FiLayers,
  FiPlus,
  FiCheck,
  FiExternalLink,
  FiChevronDown,
  FiX,
  FiTag,
} from 'react-icons/fi'

export interface ConfiguredVariant {
  attributeName: string
  attributeValue: string
  sku: string
  price: string
  stock: string
}

interface ProductFormProps {
  /** Where "back" and a successful save return to. The seller panel reuses this form. */
  listPath?: string
}

export default function AdminProductForm({ listPath = '/admin/products' }: ProductFormProps) {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { categories, brands } = useAppSelector((state) => state.catalog)
  const current = useAppSelector((state) => state.products.current)
  const sellers = useAppSelector((state) => state.admin.sellers)
  const availableVariations = useAppSelector((state) => state.variations.items)
  const isAdmin = useAppSelector((state) => state.auth.user?.role) === 'admin'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    stock: '0',
    categoryId: '',
    brandId: '',
    sellerId: '',
    isActive: true,
    isFeatured: false,
  })
  const [images, setImages] = useState<string[]>([])
  const [variants, setVariants] = useState<ConfiguredVariant[]>([])
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([])

  // Variation Selection UI State
  const [showVariationPicker, setShowVariationPicker] = useState(false)
  const [selectedVariationId, setSelectedVariationId] = useState<number | ''>('')
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories({ includeInactive: true }))
    if (brands.length === 0) dispatch(fetchBrands({ includeInactive: true }))
    if (availableVariations.length === 0) dispatch(fetchVariations())
    if (isAdmin && sellers.length === 0) dispatch(fetchSellers({ limit: 100 }))
  }, [dispatch, categories.length, brands.length, availableVariations.length, isAdmin, sellers.length])

  useEffect(() => {
    if (!isEdit || !id) return

    setLoading(true)
    dispatch(fetchProduct(id)).finally(() => setLoading(false))
  }, [dispatch, id, isEdit])

  // Populate the form once the product being edited arrives.
  useEffect(() => {
    if (!isEdit || !current || String(current.id) !== id) return

    setForm({
      name: current.name,
      description: current.description ?? '',
      price: String(current.price),
      discountPrice: current.discountPrice ? String(current.discountPrice) : '',
      stock: String(current.stock),
      categoryId: String(current.categoryId),
      brandId: current.brandId ? String(current.brandId) : '',
      sellerId: current.sellerId ? String(current.sellerId) : '',
      isActive: current.isActive,
      isFeatured: current.isFeatured,
    })
    setImages(current.images?.length ? current.images.map((image) => image.url) : [])
    setVariants(
      (current.variants ?? []).map((variant) => {
        let attrName = 'Option'
        let attrVal = variant.sku || 'Default'
        if (variant.size && variant.color) {
          attrName = 'Size & Color'
          attrVal = `${variant.size} / ${variant.color}`
        } else if (variant.size) {
          attrName = 'Size'
          attrVal = variant.size
        } else if (variant.color) {
          attrName = 'Color'
          attrVal = variant.color
        }

        return {
          attributeName: attrName,
          attributeValue: attrVal,
          sku: variant.sku ?? '',
          price: variant.price !== null ? String(variant.price) : '',
          stock: String(variant.stock),
        }
      })
    )
    setSpecs(current.specifications ?? [])
  }, [current, id, isEdit])

  // When selected variation changes in picker, reset selected values
  const handleVariationSelect = (varId: number) => {
    setSelectedVariationId(varId)
    const found = availableVariations.find((v) => v.id === varId)
    setSelectedValues(found ? [...found.values] : [])
  }

  const toggleValueSelection = (val: string) => {
    if (selectedValues.includes(val)) {
      setSelectedValues(selectedValues.filter((v) => v !== val))
    } else {
      setSelectedValues([...selectedValues, val])
    }
  }

  const handleAddSelectedVariants = () => {
    if (!selectedVariationId) return
    const variation = availableVariations.find((v) => v.id === Number(selectedVariationId))
    if (!variation || selectedValues.length === 0) return

    const newVariants: ConfiguredVariant[] = selectedValues.map((val) => {
      const slug = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const baseSku = form.name ? form.name.substring(0, 4).toUpperCase() : 'SKU'
      return {
        attributeName: variation.title || variation.name,
        attributeValue: val,
        sku: `${baseSku}-${slug}`,
        price: '',
        stock: form.stock && Number(form.stock) > 0 ? form.stock : '10',
      }
    })

    setVariants([...variants, ...newVariants])
    setShowVariationPicker(false)
    setSelectedVariationId('')
    setSelectedValues([])
    notify.success(`Added ${newVariants.length} variant${newVariants.length > 1 ? 's' : ''} to product`)
  }

  const updateVariantRow = (index: number, field: keyof ConfiguredVariant, value: string) => {
    const next = [...variants]
    next[index] = { ...next[index], [field]: value }
    setVariants(next)
  }

  const removeVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const validate = () => {
    const next: Record<string, string> = {}

    if (form.name.trim().length < 2) next.name = 'Product name is required'
    if (!form.price || Number(form.price) <= 0) next.price = 'Price must be greater than 0'
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) {
      next.discountPrice = 'Discount price must be lower than the price'
    }
    if (!form.categoryId) next.categoryId = 'Please select a category'
    if (Number(form.stock) < 0) next.stock = 'Stock cannot be negative'
    if (images.length === 0 || !images.some((url) => url.trim())) {
      next.images = 'Please upload at least one product image from your device'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) {
      notify.error('Please fix the highlighted fields')
      return
    }

    setSaving(true)
    const result = await dispatch(
      saveProduct({
        id: isEdit ? Number(id) : undefined,
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
          stock: Number(form.stock),
          categoryId: Number(form.categoryId),
          brandId: form.brandId ? Number(form.brandId) : null,
          ...(isAdmin ? { sellerId: form.sellerId ? Number(form.sellerId) : null } : {}),
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          images: images.filter((url) => url.trim()),
          variants: variants.map((variant) => {
            const attr = (variant.attributeName || '').toLowerCase()
            const isSize = attr.includes('size')
            const isColor = attr.includes('color') || attr.includes('colour')

            return {
              size: isSize ? variant.attributeValue : null,
              color: isColor ? variant.attributeValue : (!isSize ? variant.attributeValue : null),
              sku: variant.sku || null,
              price: variant.price ? Number(variant.price) : null,
              stock: Number(variant.stock) || 0,
            }
          }),
          specifications: specs.filter((spec) => spec.key.trim() && spec.value.trim()),
        },
      })
    )
    setSaving(false)

    if (saveProduct.fulfilled.match(result)) {
      notify.success(isEdit ? 'Product updated' : 'Product created')
      navigate(listPath)
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the product')
    }
  }

  if (loading) return <PageLoader label="Loading product…" />

  const variantsPath = isAdmin ? '/admin/variants' : '/seller/variants'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl" noValidate>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit product' : 'New product'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Fill in the details, upload photos, and select variations.
          </p>
        </div>
        <button type="button" className="btn-outline text-xs px-4 py-2" onClick={() => navigate(listPath)}>
          Back to list
        </button>
      </div>

      {/* Basic Details */}
      <section className="card p-6">
        <h3 className="mb-4 font-bold text-slate-800 text-base">Basic details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Product name *</label>
            <input
              id="name"
              className="input-field"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Aurora Studio Wireless Headphones"
            />
            {errors.name ? <p className="field-error">{errors.name}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              className="input-field"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What makes this product worth buying?"
            />
          </div>

          <div>
            <label className="label" htmlFor="categoryId">Category *</label>
            <select
              id="categoryId"
              className="input-field"
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            >
              <option value="">Select a category</option>
              {categories.map((parent) => (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name} (top level)</option>
                  {(parent.children ?? []).map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.categoryId ? <p className="field-error">{errors.categoryId}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="brandId">Brand</label>
            <select
              id="brandId"
              className="input-field"
              value={form.brandId}
              onChange={(event) => setForm({ ...form, brandId: event.target.value })}
            >
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin ? (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="sellerId">Sold by</label>
              <select
                id="sellerId"
                className="input-field"
                value={form.sellerId}
                onChange={(event) => setForm({ ...form, sellerId: event.target.value })}
              >
                <option value="">House catalogue (no seller)</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                    {seller.isActive ? '' : ' (deactivated)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                The owning seller manages this product&rsquo;s stock and sees its orders.
              </p>
              {errors.sellerId ? <p className="field-error">{errors.sellerId}</p> : null}
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="price">Base Price (₹) *</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              className="input-field font-semibold"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="e.g. 2499"
            />
            {errors.price ? <p className="field-error">{errors.price}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="discountPrice">Discount price (₹)</label>
            <input
              id="discountPrice"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.discountPrice}
              onChange={(event) => setForm({ ...form, discountPrice: event.target.value })}
              placeholder="Leave blank for no discount"
            />
            {errors.discountPrice ? <p className="field-error">{errors.discountPrice}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="stock">Base Stock *</label>
            <input
              id="stock"
              type="number"
              min="0"
              className="input-field"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
            />
            {errors.stock ? <p className="field-error">{errors.stock}</p> : null}
            {variants.length > 0 ? (
              <p className="mt-1 text-xs text-orange-600 font-medium">
                This product has variants configured below.
              </p>
            ) : null}
          </div>

          <div className="flex items-end gap-6 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="accent-orange-600 h-4 w-4 rounded"
              />
              Active Listing
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
                className="accent-orange-600 h-4 w-4 rounded"
              />
              Featured
            </label>
          </div>
        </div>
      </section>

      {/* ── Direct Device Image Upload Section ── */}
      <section className="card p-6">
        <h3 className="font-bold text-slate-800 text-base mb-1">Product Images *</h3>
        <p className="text-xs text-slate-400 mb-4">
          Select images directly from your device. The first image will be used as the main product thumbnail.
        </p>

        <ImageUpload
          mode="multiple"
          values={images}
          onChange={setImages}
          error={errors.images}
        />
      </section>

      {/* ── Product Variations Section (Database-Driven) ── */}
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">Product Variations</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {variants.length} configured
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select existing variations from the database (e.g. Size, Color, Weight) to add options to this product.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-primary gap-1.5 text-xs py-2 px-3.5"
              onClick={() => setShowVariationPicker(!showVariationPicker)}
            >
              <FiPlus className="h-3.5 w-3.5" />
              Add Variant
              <FiChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Variation Selection Dropdown Card */}
        {showVariationPicker ? (
          <div className="mb-6 rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FiLayers className="h-4 w-4 text-orange-600" />
                Select Existing Variation from Database
              </p>
              <button
                type="button"
                onClick={() => setShowVariationPicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            {availableVariations.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label text-xs mb-1.5">Choose Variation</label>
                  <select
                    className="input-field bg-white"
                    value={selectedVariationId}
                    onChange={(e) => handleVariationSelect(Number(e.target.value))}
                  >
                    <option value="">-- Choose a variation (e.g. Size, Color, Weight) --</option>
                    {availableVariations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title || v.name} ({v.values.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Values Checklist */}
                {selectedVariationId ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label text-xs">Select Values to Add</label>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          className="font-semibold text-orange-600 hover:underline"
                          onClick={() => {
                            const v = availableVariations.find((x) => x.id === Number(selectedVariationId))
                            if (v) setSelectedValues([...v.values])
                          }}
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:underline"
                          onClick={() => setSelectedValues([])}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-slate-200">
                      {availableVariations
                        .find((v) => v.id === Number(selectedVariationId))
                        ?.values.map((val) => {
                          const isChecked = selectedValues.includes(val)
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => toggleValueSelection(val)}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                isChecked
                                  ? 'bg-orange-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isChecked ? <FiCheck className="h-3 w-3" /> : null}
                              {val}
                            </button>
                          )
                        })}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {selectedValues.length} value{selectedValues.length === 1 ? '' : 's'} selected
                      </span>
                      <button
                        type="button"
                        className="btn-primary gap-1.5 text-xs py-2 px-4"
                        onClick={handleAddSelectedVariants}
                        disabled={selectedValues.length === 0}
                      >
                        <FiCheck className="h-3.5 w-3.5" />
                        Add Selected to Product
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600">No variations created yet in the database.</p>
                <Link
                  to={variantsPath}
                  target="_blank"
                  className="btn-outline gap-1 text-xs mt-3 inline-flex"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  Create Variations in Variants Section
                  <FiExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Configured Variants Table / List */}
        {variants.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Variation &amp; Value</th>
                  <th className="px-4 py-3 font-bold">SKU</th>
                  <th className="px-4 py-3 font-bold">Price Override (₹)</th>
                  <th className="px-4 py-3 font-bold">Stock *</th>
                  <th className="px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {variants.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800 border border-orange-200/80">
                          <FiTag className="h-3 w-3 text-orange-600" />
                          {v.attributeName}: {v.attributeValue}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="input-field py-1 px-2 text-xs font-mono max-w-[140px]"
                        value={v.sku}
                        placeholder="Optional SKU"
                        onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field py-1 px-2 text-xs max-w-[120px]"
                        value={v.price}
                        placeholder="Same as base"
                        onChange={(e) => updateVariantRow(idx, 'price', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        className="input-field py-1 px-2 text-xs font-semibold max-w-[90px]"
                        value={v.stock}
                        onChange={(e) => updateVariantRow(idx, 'stock', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeVariantRow(idx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove Variant"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-8 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all bg-slate-50/40"
            onClick={() => setShowVariationPicker(true)}
            role="button"
            tabIndex={0}
          >
            <FiLayers className="h-8 w-8 text-orange-400" />
            <p className="text-sm font-semibold text-slate-700">No variants added yet</p>
            <p className="text-xs text-slate-400">
              Click &quot;Add Variant&quot; to select from your saved variations (e.g. Size, Color, Weight)
            </p>
          </div>
        )}

        {/* Link to Variants Section */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Manage global variation templates (Size, Color, Weight, Material)</span>
          <Link
            to={variantsPath}
            target="_blank"
            className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:underline"
          >
            Manage Variations Section <FiExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Specifications Section */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Specifications</h3>
            <p className="text-xs text-slate-400">Technical or key highlights (e.g. Battery: 40 hours, Material: 100% Cotton)</p>
          </div>
          <button
            type="button"
            className="btn-outline gap-1 text-xs py-1.5 px-3"
            onClick={() => setSpecs([...specs, { key: '', value: '' }])}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Row
          </button>
        </div>

        {specs.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No specifications added.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="input-field text-xs flex-1"
                  value={spec.key}
                  placeholder="Key (e.g. Battery, Weight)"
                  onChange={(event) => {
                    const next = [...specs]
                    next[index] = { ...next[index], key: event.target.value }
                    setSpecs(next)
                  }}
                />
                <input
                  className="input-field text-xs flex-1"
                  value={spec.value}
                  placeholder="Value (e.g. 5000mAh, 1.2kg)"
                  onChange={(event) => {
                    const next = [...specs]
                    next[index] = { ...next[index], value: event.target.value }
                    setSpecs(next)
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                  aria-label="Remove specification"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save Action Buttons */}
      <div className="flex items-center gap-3 pb-8">
        <button type="submit" className="btn-primary py-3 px-8 text-sm font-bold shadow-md" disabled={saving}>
          {saving ? (
            <Spinner className="h-4 w-4 text-white" label="Saving…" />
          ) : isEdit ? (
            'Save Changes'
          ) : (
            'Create Product'
          )}
        </button>
        <button type="button" className="btn-outline py-3 px-6 text-sm" onClick={() => navigate(listPath)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
