import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchBrands, fetchCategories } from '@/features/catalog/categorySlice'
import { fetchProduct, saveProduct } from '@/features/products/productSlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'

interface VariantRow {
  size: string
  color: string
  sku: string
  price: string
  stock: string
}

interface SpecRow {
  key: string
  value: string
}

const emptyVariant: VariantRow = { size: '', color: '', sku: '', price: '', stock: '0' }

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

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    stock: '0',
    categoryId: '',
    brandId: '',
    isActive: true,
    isFeatured: false,
  })
  const [images, setImages] = useState<string[]>([''])
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [specs, setSpecs] = useState<SpecRow[]>([])

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories({ includeInactive: true }))
    if (brands.length === 0) dispatch(fetchBrands({ includeInactive: true }))
  }, [dispatch, categories.length, brands.length])

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
      isActive: current.isActive,
      isFeatured: current.isFeatured,
    })
    setImages(current.images?.length ? current.images.map((image) => image.url) : [''])
    setVariants(
      (current.variants ?? []).map((variant) => ({
        size: variant.size ?? '',
        color: variant.color ?? '',
        sku: variant.sku ?? '',
        price: variant.price !== null ? String(variant.price) : '',
        stock: String(variant.stock),
      }))
    )
    setSpecs(current.specifications ?? [])
  }, [current, id, isEdit])

  const validate = () => {
    const next: Record<string, string> = {}

    if (form.name.trim().length < 2) next.name = 'Product name is required'
    if (!form.price || Number(form.price) <= 0) next.price = 'Price must be greater than 0'
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) {
      next.discountPrice = 'Discount price must be lower than the price'
    }
    if (!form.categoryId) next.categoryId = 'Please select a category'
    if (Number(form.stock) < 0) next.stock = 'Stock cannot be negative'
    if (!images.some((url) => url.trim())) next.images = 'Add at least one image URL'

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
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          images: images.filter((url) => url.trim()),
          variants: variants
            .filter((variant) => variant.size || variant.color || variant.sku)
            .map((variant) => ({
              size: variant.size || null,
              color: variant.color || null,
              sku: variant.sku || null,
              price: variant.price ? Number(variant.price) : null,
              stock: Number(variant.stock) || 0,
            })),
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit ? 'Edit product' : 'New product'}
        </h2>
        <button type="button" className="btn-outline" onClick={() => navigate(listPath)}>
          Back to list
        </button>
      </div>

      <section className="card p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Basic details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Product name *</label>
            <input
              id="name"
              className="input-field"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Aurora Studio Headphones"
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

          <div>
            <label className="label" htmlFor="price">Price (₹) *</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
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
            <label className="label" htmlFor="stock">Stock *</label>
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
              <p className="mt-1 text-xs text-slate-400">
                This product has variants, so customers buy against variant stock.
              </p>
            ) : null}
          </div>

          <div className="flex items-end gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="accent-brand-600"
              />
              Enabled
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
                className="accent-brand-600"
              />
              Featured
            </label>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Images</h3>
          <button
            type="button"
            className="btn-outline gap-1 text-xs"
            onClick={() => setImages([...images, ''])}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add image
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-400">
          The first image is used as the primary thumbnail.
        </p>

        <div className="flex flex-col gap-3">
          {images.map((url, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <input
                className="input-field"
                value={url}
                placeholder="https://example.com/image.jpg"
                onChange={(event) => {
                  const next = [...images]
                  next[index] = event.target.value
                  setImages(next)
                }}
              />
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setImages(images.filter((_, i) => i !== index))}
                aria-label="Remove image"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {errors.images ? <p className="field-error">{errors.images}</p> : null}
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Variants</h3>
          <button
            type="button"
            className="btn-outline gap-1 text-xs"
            onClick={() => setVariants([...variants, { ...emptyVariant }])}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add variant
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-slate-500">
            No variants. Customers buy the product directly using the stock above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Colour</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Price override</th>
                  <th className="pb-2">Stock</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => {
                  const update = (patch: Partial<VariantRow>) => {
                    const next = [...variants]
                    next[index] = { ...next[index], ...patch }
                    setVariants(next)
                  }

                  return (
                    <tr key={index}>
                      <td className="py-1 pr-2">
                        <input
                          className="input-field"
                          value={variant.size}
                          placeholder="M"
                          onChange={(event) => update({ size: event.target.value })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          className="input-field"
                          value={variant.color}
                          placeholder="Black"
                          onChange={(event) => update({ color: event.target.value })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          className="input-field"
                          value={variant.sku}
                          placeholder="SKU-1"
                          onChange={(event) => update({ sku: event.target.value })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          value={variant.price}
                          placeholder="Same as product"
                          onChange={(event) => update({ price: event.target.value })}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          value={variant.stock}
                          onChange={(event) => update({ stock: event.target.value })}
                        />
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                          aria-label="Remove variant"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Specifications</h3>
          <button
            type="button"
            className="btn-outline gap-1 text-xs"
            onClick={() => setSpecs([...specs, { key: '', value: '' }])}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add row
          </button>
        </div>

        {specs.length === 0 ? (
          <p className="text-sm text-slate-500">No specifications added.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {specs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="input-field"
                  value={spec.key}
                  placeholder="Battery"
                  onChange={(event) => {
                    const next = [...specs]
                    next[index] = { ...next[index], key: event.target.value }
                    setSpecs(next)
                  }}
                />
                <input
                  className="input-field"
                  value={spec.value}
                  placeholder="40 hours"
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

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : isEdit ? 'Save changes' : 'Create product'}
        </button>
        <button type="button" className="btn-outline" onClick={() => navigate(listPath)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
