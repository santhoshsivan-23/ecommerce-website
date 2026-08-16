import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { updateTaxSettings, selectTaxSettings } from '@/features/admin/taxSettingsSlice'
import type { TaxAppliesTo } from '@/features/admin/taxSettingsSlice'
import { notify } from '@/utils/notify'
import { formatPrice } from '@/utils/format'
import { FiPercent, FiSave, FiInfo } from 'react-icons/fi'

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

  const handleSave = () => {
    dispatch(updateTaxSettings(form))
    notify.success('Tax settings saved')
  }

  // Example preview using a ₹1000 order
  const exampleTotal = 1000
  const taxAmount = form.enabled ? Math.round((exampleTotal * form.rate) / (100 + form.rate)) : 0
  const preBase = exampleTotal - taxAmount

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tax Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure the tax rate and which order types it applies to. Tax is displayed as informational
          in order details and does not alter the stored order total.
        </p>
      </div>

      {/* Enable toggle */}
      <section className="card p-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">Enable Tax</p>
          <p className="text-sm text-slate-500 mt-0.5">
            When disabled, no tax is shown anywhere in the system.
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

      {/* Rate */}
      <section className={`card p-6 flex flex-col gap-4 transition-opacity ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <label className="label text-base" htmlFor="tax-rate">Tax Rate (%)</label>
          <p className="text-xs text-slate-400 mb-2">
            This is the standard tax percentage (e.g. 18 for GST 18%).
          </p>
          <div className="relative max-w-xs">
            <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="input-field pr-8 max-w-xs"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: Math.max(0, Math.min(100, Number(e.target.value))) })}
            />
          </div>
        </div>

        {/* Applicability */}
        <div>
          <p className="label text-base mb-2">Apply Tax To</p>
          <div className="flex flex-col gap-2">
            {APPLIES_TO_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                  form.appliesTo === opt.value
                    ? 'border-orange-400 bg-orange-50/60'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="appliesTo"
                  value={opt.value}
                  checked={form.appliesTo === opt.value}
                  onChange={() => setForm({ ...form, appliesTo: opt.value })}
                  className="accent-orange-600 mt-0.5 shrink-0"
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
      {form.enabled && (
        <section className="card p-6 border-l-4 border-orange-400 bg-orange-50/30">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-bold text-orange-800">Preview – How tax appears on a {formatPrice(exampleTotal)} order</p>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Base amount (ex-tax)</dt>
              <dd className="font-medium text-slate-800">{formatPrice(preBase)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tax ({form.rate}%)</dt>
              <dd className="font-medium text-orange-700">{formatPrice(taxAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-orange-200 pt-2 font-bold text-slate-900">
              <dt>Total</dt>
              <dd>{formatPrice(exampleTotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Tax is back-calculated from the inclusive order total and shown as informational only.
            Applies to: <strong>{APPLIES_TO_OPTIONS.find((o) => o.value === form.appliesTo)?.label}</strong>
          </p>
        </section>
      )}

      {/* Save */}
      <div>
        <button
          type="button"
          className="btn-primary gap-2"
          onClick={handleSave}
        >
          <FiSave className="h-4 w-4" />
          Save Tax Settings
        </button>
      </div>
    </div>
  )
}
