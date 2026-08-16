import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { OrderSource } from '@/types'

export type TaxAppliesTo = 'seller' | 'customer' | 'both'

export interface TaxSettings {
  enabled: boolean
  /** Percentage rate, e.g. 10 means 10% */
  rate: number
  appliesTo: TaxAppliesTo
}

const STORAGE_KEY = 'admin_tax_settings'

export function loadFromStorage(): TaxSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaxSettings>
      const parsedRate = typeof parsed.rate === 'number' ? parsed.rate : Number(parsed.rate)
      return {
        enabled: parsed.enabled !== false,
        rate: !isNaN(parsedRate) ? parsedRate : 18,
        appliesTo: parsed.appliesTo ?? 'both',
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { enabled: true, rate: 18, appliesTo: 'both' }
}

export function saveToStorage(settings: TaxSettings) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  } catch {
    // ignore storage errors
  }
}

const initialState: TaxSettings = loadFromStorage()

const taxSettingsSlice = createSlice({
  name: 'taxSettings',
  initialState,
  reducers: {
    updateTaxSettings(state, action: PayloadAction<Partial<TaxSettings>>) {
      if (typeof action.payload.enabled === 'boolean') {
        state.enabled = action.payload.enabled
      }
      if (action.payload.rate !== undefined) {
        state.rate = Number(action.payload.rate) || 0
      }
      if (action.payload.appliesTo) {
        state.appliesTo = action.payload.appliesTo
      }
      saveToStorage({
        enabled: state.enabled,
        rate: state.rate,
        appliesTo: state.appliesTo,
      })
    },
    syncTaxSettings(state) {
      const latest = loadFromStorage()
      state.enabled = latest.enabled
      state.rate = latest.rate
      state.appliesTo = latest.appliesTo
    },
  },
})

export const { updateTaxSettings, syncTaxSettings } = taxSettingsSlice.actions
export default taxSettingsSlice.reducer

/** Selector for the full tax config. */
export const selectTaxSettings = (state: RootState): TaxSettings => {
  if (state.taxSettings && typeof state.taxSettings.rate === 'number') {
    return state.taxSettings
  }
  return loadFromStorage()
}

/**
 * Compute the tax amount for a given order total and source.
 * Tax is back-calculated from the inclusive total: tax = total × rate / (100 + rate)
 */
export function computeTax(
  orderTotal: number,
  orderSource: OrderSource | string | undefined | null,
  settings: TaxSettings | undefined | null
): number {
  const activeSettings = settings && typeof settings.rate === 'number' ? settings : loadFromStorage()

  if (!activeSettings || !activeSettings.rate || activeSettings.rate <= 0) return 0
  if (activeSettings.enabled === false) return 0

  const source = orderSource || 'customer'

  const applies =
    activeSettings.appliesTo === 'both' ||
    (activeSettings.appliesTo === 'seller' && source === 'seller') ||
    (activeSettings.appliesTo === 'customer' && source === 'customer')

  if (!applies) return 0

  return Math.round((orderTotal * activeSettings.rate) / (100 + activeSettings.rate))
}
