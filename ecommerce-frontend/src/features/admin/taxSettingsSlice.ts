import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { OrderSource } from '@/types'

export type TaxAppliesTo = 'seller' | 'customer' | 'both'

export interface TaxSettings {
  enabled: boolean
  /** Percentage rate, e.g. 18 means 18 % */
  rate: number
  appliesTo: TaxAppliesTo
}

const STORAGE_KEY = 'admin_tax_settings'

function loadFromStorage(): TaxSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TaxSettings
  } catch {
    // ignore corrupt data
  }
  return { enabled: false, rate: 18, appliesTo: 'both' }
}

function saveToStorage(settings: TaxSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

const taxSettingsSlice = createSlice({
  name: 'taxSettings',
  initialState: loadFromStorage,
  reducers: {
    updateTaxSettings(state, action: PayloadAction<Partial<TaxSettings>>) {
      Object.assign(state, action.payload)
      saveToStorage({ ...state, ...action.payload })
    },
  },
})

export const { updateTaxSettings } = taxSettingsSlice.actions
export default taxSettingsSlice.reducer

/** Selector for the full tax config. */
export const selectTaxSettings = (state: RootState) => state.taxSettings

/**
 * Compute the tax amount for a given order total and source.
 * Tax is back-calculated from the inclusive total:  tax = total × rate / (100 + rate)
 */
export function computeTax(
  orderTotal: number,
  orderSource: OrderSource | undefined,
  settings: TaxSettings
): number {
  if (!settings.enabled) return 0
  if (!orderSource) return 0

  const applies =
    settings.appliesTo === 'both' ||
    (settings.appliesTo === 'seller' && orderSource === 'seller') ||
    (settings.appliesTo === 'customer' && orderSource === 'customer')

  if (!applies) return 0

  return Math.round((orderTotal * settings.rate) / (100 + settings.rate))
}
