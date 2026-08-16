import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { fetchTaxSettings, saveTaxSettings, selectTaxSettings } from '@/features/admin/taxSettingsSlice'
import type { TaxAppliesTo } from '@/features/admin/taxSettingsSlice'
import { notify, notifyApiError } from '@/utils/notify'
import { formatPrice } from '@/utils/format'
import { FiPercent, FiSave, FiInfo, FiCheckCircle } from 'react-icons/fi'
import { Spinner } from '@/components/ui/Spinner'

const APPLIES_TO_OPTIONS: { value: TaxAppliesTo; label: string; description: string }[] = [
  {
    value: 'seller',
    label: 'Seller Orders Only',
    description: 'Apply tax only on orders raised directly by sellers.',
  },
  {
    value: 'customer',
    label: 'Customer Orders Only',
    description: 'Apply tax only on orders placed by customers via the storefront.',
  },
  {
    value: 'both',
    label: 'Both Order Types',
    description: 'Apply tax on all orders regardless of source.',
  },
]

export default function AdminTaxSettings() {
  const dispatch = useAppDispatch()
  const saved = useAppSelector(selectTaxSettings)

  const [form, setForm] = useState({ ...saved })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchTaxSettings())
  }, [dispatch])

  useEffect(() => {
    setForm({ ...saved })
  }, [saved])

  const handleSave = async () => {
    setIsSaving(true)
    const payload = {
      ...form,
      enabled: form.enabled ?? true,
    }
    const result = await dispatch(saveTaxSettings(payload))
    setIsSaving(false)

    if (saveTaxSettings.fulfilled.match(result)) {
      notify.success('Tax settings saved and applied globally')
    } else {
      notifyApiError(result.payload, 'Failed to save tax settings')
    }
  }

  // Example preview using a ₹1000 order
  const exampleTotal = 1000
  const taxAmount = form.enabled && form.rate > 0 ? Math.round((exampleTotal * form.rate) / (100 + form.rate)) : 0
  const preBase = exampleTotal - taxAmount

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tax Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure the tax percentage and select where tax is applied. Configured tax is automatically
          calculated and displayed in seller-created orders, customer-created orders, and admin order views.
        </p>
      </div>

      {/* Enable toggle */}
      <section className="card p-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">Enable Tax Calculation</p>
            {form.enabled ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <FiCheckCircle className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Disabled
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Turn on to display and calculate tax across the selected order sources.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
          className={`relative h-7 w-12 rounded-full transition-colors duration-200 focus:outline-none ${
            form.enabled ? 'bg-orange-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
              form.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </section>

      {/* Rate & Applicability */}
      <section className="card p-6 flex flex-col gap-5">
        <div>
          <label className="label text-base" htmlFor="tax-rate">Tax Rate (%)</label>
          <p className="text-xs text-slate-400 mb-2">
            Standard tax percentage (e.g. 18 for 18% GST).
          </p>
          <div className="relative max-w-xs">
            <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input-field pr-8 max-w-xs font-semibold text-base"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: Math.max(0, Math.min(100, Number(e.target.value))) })}
            />
          </div>
        </div>

        {/* Applicability */}
        <div>
          <p className="label text-base mb-2">Apply Tax To</p>
          <div className="flex flex-col gap-2.5">
            {APPLIES_TO_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                  form.appliesTo === opt.value
                    ? 'border-orange-400 bg-orange-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="appliesTo"
                  value={opt.value}
                  checked={form.appliesTo === opt.value}
                  onChange={() => setForm({ ...form, appliesTo: opt.value })}
                  className="accent-orange-600 mt-1 shrink-0"
                />
                <div>
                  <p className="font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-sm text-slate-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Live Preview */}
      {form.enabled && form.rate > 0 ? (
        <section className="card p-6 border-l-4 border-orange-500 bg-orange-50/30">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-bold text-orange-900">
              Live Preview – Calculation on a sample {formatPrice(exampleTotal)} order
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Base amount (ex-tax)</dt>
              <dd className="font-medium text-slate-800">{formatPrice(preBase)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Applicable Tax ({form.rate}%)</dt>
              <dd className="font-bold text-orange-700">{formatPrice(taxAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-orange-200 pt-2 font-bold text-slate-900">
              <dt>Total Amount</dt>
              <dd className="text-orange-900">{formatPrice(exampleTotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Active on: <strong>{APPLIES_TO_OPTIONS.find((o) => o.value === form.appliesTo)?.label}</strong>
          </p>
        </section>
      ) : null}

      {/* Save */}
      <div>
        <button
          type="button"
          className="btn-primary gap-2 text-sm px-6 py-3"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Spinner className="h-4 w-4 text-white" label="Saving…" />
          ) : (
            <>
              <FiSave className="h-4 w-4" />
              Save Tax Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
