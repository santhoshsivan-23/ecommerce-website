import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  fetchVariations,
  createVariation,
  updateVariation,
  deleteVariation,
} from '@/features/variants/variationSlice'
import type { Variation } from '@/features/variants/variationSlice'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { notify, notifyApiError, toFieldErrors } from '@/utils/notify'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiSearch,
  FiLayers,
  FiTag,
  FiZap,
} from 'react-icons/fi'

interface AdminVariantsProps {
  isSeller?: boolean
}

export default function AdminVariants({ isSeller = false }: AdminVariantsProps) {
  const dispatch = useAppDispatch()
  const { items: variations, status } = useAppSelector((state) => state.variations)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null)

  // Modal Form State
  const [title, setTitle] = useState('')
  const [newValueInput, setNewValueInput] = useState('')
  const [values, setValues] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    dispatch(fetchVariations())
  }, [dispatch])

  const openCreateModal = () => {
    setEditingVariation(null)
    setTitle('')
    setNewValueInput('')
    setValues([])
    setErrors({})
    setModalOpen(true)
  }

  const openEditModal = (variation: Variation) => {
    setEditingVariation(variation)
    setTitle(variation.title || variation.name)
    setNewValueInput('')
    setValues([...variation.values])
    setErrors({})
    setModalOpen(true)
  }

  const handleAddValue = () => {
    const trimmed = newValueInput.trim()
    if (!trimmed) return

    // Allow comma-separated pasting/typing
    const splitValues = trimmed
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && !values.some((existing) => existing.toLowerCase() === v.toLowerCase()))

    if (splitValues.length === 0) {
      setNewValueInput('')
      return
    }

    setValues([...values, ...splitValues])
    setNewValueInput('')
    if (errors.values) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.values
        return next
      })
    }
  }

  const handleRemoveValue = (indexToRemove: number) => {
    setValues(values.filter((_, idx) => idx !== indexToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddValue()
    }
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!title.trim()) next.title = 'Variation title is required (e.g. Size, Color)'
    if (values.length === 0) next.values = 'Add at least one variation value'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    let result
    if (editingVariation) {
      result = await dispatch(
        updateVariation({
          id: editingVariation.id,
          title: title.trim(),
          values,
        })
      )
    } else {
      result = await dispatch(
        createVariation({
          title: title.trim(),
          values,
        })
      )
    }
    setSaving(false)

    if (createVariation.fulfilled.match(result) || updateVariation.fulfilled.match(result)) {
      notify.success(editingVariation ? 'Variation updated successfully' : 'Variation created successfully')
      setModalOpen(false)
    } else {
      setErrors(toFieldErrors(result.payload))
      notifyApiError(result.payload, 'Could not save variation')
    }
  }

  const handleDelete = async (id: number) => {
    const result = await dispatch(deleteVariation(id))
    setDeletingId(null)
    if (deleteVariation.fulfilled.match(result)) {
      notify.success('Variation removed')
    } else {
      notifyApiError(result.payload, 'Could not delete variation')
    }
  }

  const addPreset = (presetTitle: string, presetValues: string[]) => {
    setTitle(presetTitle)
    setValues(presetValues)
    setErrors({})
  }

  const filteredVariations = variations.filter((v) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const matchTitle = (v.title || v.name).toLowerCase().includes(q)
    const matchValues = v.values.some((val) => val.toLowerCase().includes(q))
    return matchTitle || matchValues
  })

  if (status === 'loading' && variations.length === 0) {
    return <PageLoader label="Loading variations…" />
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {isSeller ? 'Seller Custom Variations' : 'Product Variations'}
            </h1>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
              {variations.length} {variations.length === 1 ? 'Variation' : 'Variations'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Define reusable variation titles (e.g. Size, Color, Weight, Material) and their possible values.
            These variations can be selected directly when adding or editing products.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary gap-2 self-start sm:self-auto py-2.5 px-4 shadow-sm"
          onClick={openCreateModal}
        >
          <FiPlus className="h-4 w-4" />
          Create Variation
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search variations by title (e.g. Size) or values (e.g. Red, Medium)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Variations List */}
      {filteredVariations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVariations.map((variation) => (
            <div
              key={variation.id}
              className="card flex flex-col justify-between p-5 transition-all hover:shadow-md border-slate-200"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <FiLayers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{variation.title || variation.name}</h3>
                      <p className="text-xs text-slate-400">
                        {variation.values.length} {variation.values.length === 1 ? 'value' : 'values'} configured
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(variation)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Edit variation"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(variation.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete variation"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Values Pills */}
                <div className="pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Values:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar-orange pr-1">
                    {variation.values.map((val, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        <FiTag className="h-3 w-3 text-orange-500" />
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Reusable in Add Product</span>
                <button
                  type="button"
                  onClick={() => openEditModal(variation)}
                  className="font-semibold text-orange-600 hover:underline"
                >
                  Manage Values →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 mb-3">
            <FiLayers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {search ? 'No variations match your search' : 'No variations created yet'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {search
              ? 'Try searching with a different variation title or value.'
              : 'Create custom variation templates like Size, Color, Material, or Weight to use when adding products.'}
          </p>
          {!search ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary gap-2 mt-5 mx-auto"
            >
              <FiPlus className="h-4 w-4" />
              Create First Variation
            </button>
          ) : null}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingVariation ? 'Edit Variation' : 'Create Custom Variation'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              {/* Presets suggestions for new variations */}
              {!editingVariation ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <FiZap className="h-3.5 w-3.5 text-amber-500" />
                    Quick Presets:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => addPreset('Size', ['Small', 'Medium', 'Large', 'XL', 'XXL'])}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-transparent transition-all"
                    >
                      + Size (S, M, L, XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPreset('Color', ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow'])}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-transparent transition-all"
                    >
                      + Color (Red, Blue...)
                    </button>
                    <button
                      type="button"
                      onClick={() => addPreset('Weight', ['250g', '500g', '1kg', '2kg', '5kg'])}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-transparent transition-all"
                    >
                      + Weight (250g, 500g...)
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Title Field */}
              <div>
                <label className="label" htmlFor="var-title">
                  Variation Title *
                </label>
                <input
                  id="var-title"
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Size, Color, Weight, Material, Storage"
                  autoFocus
                />
                {errors.title ? <p className="field-error">{errors.title}</p> : null}
              </div>

              {/* Values Tag/Chip Input */}
              <div>
                <label className="label" htmlFor="var-value-input">
                  Variation Values *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Type a value and press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200">Enter</kbd> or click <strong>Add</strong>. Comma-separated values are also supported.
                </p>

                <div className="flex gap-2">
                  <input
                    id="var-value-input"
                    type="text"
                    className="input-field flex-1"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Small, Medium, Large"
                  />
                  <button
                    type="button"
                    className="btn-outline px-4 shrink-0 font-semibold"
                    onClick={handleAddValue}
                  >
                    Add
                  </button>
                </div>
                {errors.values ? <p className="field-error">{errors.values}</p> : null}

                {/* Values Chips List */}
                <div className="mt-3 min-h-16 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  {values.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {values.map((val, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 shadow-2xs animate-in zoom-in-95 duration-150"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => handleRemoveValue(idx)}
                            className="rounded-full p-0.5 text-orange-500 hover:bg-orange-200/60 hover:text-orange-900 transition-colors"
                            aria-label={`Remove ${val}`}
                          >
                            <FiX className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-3">
                      No values added yet. Add values like &quot;Small&quot;, &quot;Medium&quot;, &quot;Large&quot;.
                    </p>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              {title && values.length > 0 ? (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Preview in Product Dropdown:
                  </p>
                  <p className="font-bold text-slate-800 text-sm">
                    {title} <span className="font-normal text-slate-500">({values.join(', ')})</span>
                  </p>
                </div>
              ) : null}

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary gap-1.5 px-5"
                  disabled={saving}
                >
                  {saving ? (
                    <Spinner className="h-4 w-4 text-white" label="Saving…" />
                  ) : (
                    <>
                      <FiCheck className="h-4 w-4" />
                      {editingVariation ? 'Save Changes' : 'Save Variation'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <FiTrash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete this variation?</h3>
            <p className="mt-1 text-xs text-slate-500">
              This will remove the variation template from the dropdown list. Existing products already created will retain their saved variants.
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <button
                type="button"
                className="btn-outline text-xs px-4"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 border-none"
                onClick={() => handleDelete(deletingId)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
