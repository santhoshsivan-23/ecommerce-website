import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteBrand, fetchBrands, saveBrand } from '@/features/catalog/categorySlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { Brand } from '@/types'

interface FormState {
  name: string
  logo: string
  description: string
  isActive: boolean
}

const emptyForm: FormState = { name: '', logo: '', description: '', isActive: true }

export default function AdminBrands() {
  const dispatch = useAppDispatch()
  const brands = useAppSelector((state) => state.catalog.brands)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dispatch(fetchBrands({ includeInactive: true })).finally(() => setLoading(false))
  }, [dispatch])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id)
    setForm({
      name: brand.name,
      logo: brand.logo ?? '',
      description: brand.description ?? '',
      isActive: brand.isActive,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (form.name.trim().length < 2) {
      setErrors({ name: 'Brand name is required' })
      return
    }

    setSaving(true)
    const result = await dispatch(
      saveBrand({
        id: editingId ?? undefined,
        body: {
          name: form.name.trim(),
          logo: form.logo.trim() || null,
          description: form.description.trim() || null,
          isActive: form.isActive,
        },
      })
    )
    setSaving(false)

    if (saveBrand.fulfilled.match(result)) {
      notify.success(editingId ? 'Brand updated' : 'Brand created')
      setShowForm(false)
      setEditingId(null)
      dispatch(fetchBrands({ includeInactive: true }))
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the brand')
    }
  }

  const handleDelete = async (brand: Brand) => {
    const result = await dispatch(deleteBrand(brand.id))
    if (deleteBrand.fulfilled.match(result)) notify.success('Brand deleted')
    else notifyApiError(result.payload)
  }

  if (loading) return <PageLoader label="Loading brands…" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Brands</h2>
        <button type="button" className="btn-primary gap-2" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add brand
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-5" noValidate>
          <h3 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit brand' : 'New brand'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="brand-name">Name *</label>
              <input
                id="brand-name"
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Aurora"
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>

            <div>
              <ImageUpload
                mode="single"
                label="Brand Logo"
                hint="Upload logo from device (PNG, JPG, WEBP, SVG)"
                value={form.logo}
                onChange={(url) => setForm({ ...form, logo: url })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="brand-description">Description</label>
              <textarea
                id="brand-description"
                rows={2}
                className="input-field"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="accent-brand-600"
              />
              Active
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save brand'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <div key={brand.id} className="card flex items-center gap-3 p-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
              {brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-cover" /> : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{brand.name}</p>
              <p className="truncate text-xs text-slate-400">/{brand.slug}</p>
              {!brand.isActive ? (
                <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  Inactive
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                onClick={() => openEdit(brand)}
                aria-label={`Edit ${brand.name}`}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => handleDelete(brand)}
                aria-label={`Delete ${brand.name}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
