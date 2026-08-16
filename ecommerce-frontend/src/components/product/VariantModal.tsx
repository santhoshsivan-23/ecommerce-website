import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchAttributes } from '@/features/admin/adminSlice'
import { FiX, FiCheck } from 'react-icons/fi'
import { TrashIcon } from '@/components/ui/Icons'

export interface VariantRow {
  size: string
  color: string
  sku: string
  price: string
  stock: string
}

export type AttributeType = 'size' | 'color' | 'both' | 'custom'

interface VariantModalProps {
  variant?: VariantRow | null
  /** Index of the variant being edited; -1 for a new one */
  variantIndex?: number
  onSave: (variant: VariantRow, index: number) => void
  onClose: () => void
}

const emptyVariant: VariantRow = { size: '', color: '', sku: '', price: '', stock: '0' }

export function VariantModal({ variant, variantIndex = -1, onSave, onClose }: VariantModalProps) {
  const dispatch = useAppDispatch()
  const attributes = useAppSelector((state) => state.admin.attributes)

  const [attrType, setAttrType] = useState<AttributeType>(() => {
    if (!variant) return 'size'
    if (variant.size && variant.color) return 'both'
    if (variant.color) return 'color'
    if (variant.size) return 'size'
    return 'custom'
  })

  const [form, setForm] = useState<VariantRow>(variant ?? { ...emptyVariant })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const overlayRef = useRef<HTMLDivElement>(null)

  // Load attribute values if not yet fetched
  useEffect(() => {
    if (!attributes) dispatch(fetchAttributes())
  }, [dispatch, attributes])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sizeOptions = attributes?.sizes.map((s) => s.value) ?? []
  const colorOptions = attributes?.colors.map((c) => c.value) ?? []

  const validate = () => {
    const next: Record<string, string> = {}
    if (attrType === 'size' || attrType === 'both') {
      if (!form.size.trim()) next.size = 'Size is required'
    }
    if (attrType === 'color' || attrType === 'both') {
      if (!form.color.trim()) next.color = 'Color is required'
    }
    if (attrType === 'custom' && !form.size.trim() && !form.color.trim()) {
      next.size = 'Enter at least a size or color value'
    }
    if (Number(form.stock) < 0) next.stock = 'Stock cannot be negative'
    if (form.price && Number(form.price) < 0) next.price = 'Price cannot be negative'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    // Clear irrelevant fields based on type
    const saved: VariantRow = { ...form }
    if (attrType === 'color') saved.size = ''
    if (attrType === 'size') saved.color = ''
    onSave(saved, variantIndex)
    onClose()
  }

  const isEdit = variantIndex >= 0

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">
            {isEdit ? 'Edit Variant' : 'Add Variant'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Attribute Type */}
          <div>
            <label className="label mb-2">Attribute Type</label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(['size', 'color', 'both', 'custom'] as AttributeType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setAttrType(type); setErrors({}) }}
                  className={`rounded-lg py-2 text-xs font-semibold capitalize transition-all ${
                    attrType === type
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Size field */}
          {(attrType === 'size' || attrType === 'both' || attrType === 'custom') && (
            <div>
              <label className="label" htmlFor="v-size">Size</label>
              <div className="flex gap-2">
                {sizeOptions.length > 0 ? (
                  <select
                    id="v-size"
                    className="input-field flex-1"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  >
                    <option value="">Select size…</option>
                    {sizeOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="__custom__">Custom value…</option>
                  </select>
                ) : null}
                {(sizeOptions.length === 0 || form.size === '__custom__') && (
                  <input
                    id={sizeOptions.length > 0 ? 'v-size-custom' : 'v-size'}
                    className="input-field flex-1"
                    value={form.size === '__custom__' ? '' : form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="e.g. XL"
                  />
                )}
              </div>
              {errors.size ? <p className="field-error">{errors.size}</p> : null}
            </div>
          )}

          {/* Color field */}
          {(attrType === 'color' || attrType === 'both' || attrType === 'custom') && (
            <div>
              <label className="label" htmlFor="v-color">Color</label>
              <div className="flex gap-2">
                {colorOptions.length > 0 ? (
                  <select
                    id="v-color"
                    className="input-field flex-1"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  >
                    <option value="">Select color…</option>
                    {colorOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__custom__">Custom value…</option>
                  </select>
                ) : null}
                {(colorOptions.length === 0 || form.color === '__custom__') && (
                  <input
                    id={colorOptions.length > 0 ? 'v-color-custom' : 'v-color'}
                    className="input-field flex-1"
                    value={form.color === '__custom__' ? '' : form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="e.g. Midnight Black"
                  />
                )}
              </div>
              {errors.color ? <p className="field-error">{errors.color}</p> : null}
            </div>
          )}

          {/* SKU */}
          <div>
            <label className="label" htmlFor="v-sku">SKU <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              id="v-sku"
              className="input-field"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="e.g. HS-XL-BLK"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Price override */}
            <div>
              <label className="label" htmlFor="v-price">Price Override (₹) <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                id="v-price"
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Same as product"
              />
              {errors.price ? <p className="field-error">{errors.price}</p> : null}
            </div>

            {/* Stock */}
            <div>
              <label className="label" htmlFor="v-stock">Stock *</label>
              <input
                id="v-stock"
                type="number"
                min="0"
                className="input-field"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
              {errors.stock ? <p className="field-error">{errors.stock}</p> : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={() => { onSave({ ...emptyVariant }, variantIndex); onClose() }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              title="Remove this variant"
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary gap-1.5" onClick={handleSave}>
              <FiCheck className="h-4 w-4" />
              {isEdit ? 'Update Variant' : 'Add Variant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
