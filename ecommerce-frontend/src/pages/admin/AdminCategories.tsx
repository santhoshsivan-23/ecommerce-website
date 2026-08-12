import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { deleteCategory, fetchCategories, saveCategory } from '@/features/catalog/categorySlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import type { Category } from '@/types'

interface FormState {
  name: string
  description: string
  image: string
  parentId: string
  isActive: boolean
  sortOrder: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  image: '',
  parentId: '',
  isActive: true,
  sortOrder: '0',
}

export default function AdminCategories() {
  const dispatch = useAppDispatch()
  const { categories, status } = useAppSelector((state) => state.catalog)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const reload = () => dispatch(fetchCategories({ includeInactive: true }))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  const openCreate = (parentId?: number) => {
    setEditingId(null)
    setForm({ ...emptyForm, parentId: parentId ? String(parentId) : '' })
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (category: Category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description ?? '',
      image: category.image ?? '',
      parentId: category.parentId ? String(category.parentId) : '',
      isActive: category.isActive,
      sortOrder: String(category.sortOrder),
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (form.name.trim().length < 2) {
      setErrors({ name: 'Category name is required' })
      return
    }

    setSaving(true)
    const result = await dispatch(
      saveCategory({
        id: editingId ?? undefined,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          image: form.image.trim() || null,
          parentId: form.parentId ? Number(form.parentId) : null,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder) || 0,
        },
      })
    )
    setSaving(false)

    if (saveCategory.fulfilled.match(result)) {
      notify.success(editingId ? 'Category updated' : 'Category created')
      setShowForm(false)
      setEditingId(null)
      reload()
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save the category')
    }
  }

  const handleDelete = async (category: Category) => {
    const result = await dispatch(deleteCategory(category.id))
    if (deleteCategory.fulfilled.match(result)) {
      notify.success('Category deleted')
      reload()
    } else {
      notifyApiError(result.payload)
    }
  }

  if (status === 'loading' && categories.length === 0) return <PageLoader label="Loading categories…" />

  const parentOptions = categories.filter((category) => !category.parentId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
        <button type="button" className="btn-primary gap-2" onClick={() => openCreate()}>
          <PlusIcon className="h-4 w-4" />
          Add category
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-5" noValidate>
          <h3 className="mb-4 font-semibold text-slate-800">
            {editingId ? 'Edit category' : 'New category'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cat-name">Name *</label>
              <input
                id="cat-name"
                className="input-field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Electronics"
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>

            <div>
              <label className="label" htmlFor="cat-parent">Parent category</label>
              <select
                id="cat-parent"
                className="input-field"
                value={form.parentId}
                onChange={(event) => setForm({ ...form, parentId: event.target.value })}
              >
                <option value="">None (top level)</option>
                {parentOptions
                  .filter((option) => option.id !== editingId)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Categories nest one level deep.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="cat-image">Image URL</label>
              <input
                id="cat-image"
                className="input-field"
                value={form.image}
                onChange={(event) => setForm({ ...form, image: event.target.value })}
                placeholder="https://example.com/category.jpg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="cat-description">Description</label>
              <textarea
                id="cat-description"
                rows={2}
                className="input-field"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="cat-sort">Sort order</label>
              <input
                id="cat-sort"
                type="number"
                className="input-field"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </div>

            <div className="flex items-end">
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
          </div>

          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" label="Saving…" /> : 'Save category'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-col gap-3">
        {categories.map((parent) => (
          <div key={parent.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded bg-slate-100">
                  {parent.image ? (
                    <img src={parent.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{parent.name}</p>
                  <p className="text-xs text-slate-500">
                    /{parent.slug} · {(parent.children ?? []).length} subcategories
                  </p>
                </div>
                {!parent.isActive ? (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                    Inactive
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline gap-1 text-xs"
                  onClick={() => openCreate(parent.id)}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Subcategory
                </button>
                <button type="button" className="btn-outline gap-1 text-xs" onClick={() => openEdit(parent)}>
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-outline gap-1 text-xs text-rose-600"
                  onClick={() => handleDelete(parent)}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            {(parent.children ?? []).length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                {(parent.children ?? []).map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{child.name}</span>
                      <span className="text-xs text-slate-400">/{child.slug}</span>
                      {!child.isActive ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          Inactive
                        </span>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        onClick={() => openEdit(child)}
                        aria-label={`Edit ${child.name}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => handleDelete(child)}
                        aria-label={`Delete ${child.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
