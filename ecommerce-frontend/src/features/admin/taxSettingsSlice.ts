import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { OrderSource, ApiFailure } from '@/types'
import { api, toApiFailure } from '@/api/client'

export type TaxAppliesTo = 'seller' | 'customer' | 'both'

export interface TaxSettings {
  enabled: boolean
  /** Percentage rate, e.g. 18 means 18% */
  rate: number
  appliesTo: TaxAppliesTo
}

export const TAX_STORAGE_KEY = 'admin_tax_settings'
export const TAX_RATE_STORAGE_KEY = 'tax_rate'
export const APP_SETTINGS_STORAGE_KEY = 'app_settings'

export function loadFromStorage(): TaxSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(TAX_STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaxSettings>
      const parsedRate = typeof parsed.rate === 'number' ? parsed.rate : Number(parsed.rate)
      return {
        enabled: parsed.enabled !== false,
        rate: !isNaN(parsedRate) ? parsedRate : 18,
        appliesTo: parsed.appliesTo ?? 'both',
      }
    }
    const rawRate = typeof window !== 'undefined' ? localStorage.getItem(TAX_RATE_STORAGE_KEY) : null
    if (rawRate) {
      const parsedRate = Number(rawRate)
      if (!isNaN(parsedRate)) {
        return { enabled: true, rate: parsedRate, appliesTo: 'both' }
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
      localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(settings))
      localStorage.setItem(TAX_RATE_STORAGE_KEY, String(settings.rate))
      localStorage.setItem(
        APP_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          taxRate: settings.rate,
          taxEnabled: settings.enabled,
          taxAppliesTo: settings.appliesTo,
        })
      )
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Fetch latest tax settings from backend Settings API,
 * update Redux state, and persist to local storage.
 */
export const fetchTaxSettings = createAsyncThunk<
  TaxSettings,
  void,
  { rejectValue: ApiFailure }
>('taxSettings/fetchTaxSettings', async (_, { rejectWithValue }) => {
  try {
    let res
    try {
      res = await api.get('/settings')
    } catch {
      res = await api.get('/admin/settings')
    }

    const data = res.data?.data || res.data || {}
    const rawRate = data.taxRate !== undefined ? data.taxRate : data.rate
    const parsedRate = typeof rawRate === 'number' ? rawRate : Number(rawRate)
    const rate = !isNaN(parsedRate) ? parsedRate : 18

    const rawEnabled = data.taxEnabled !== undefined ? data.taxEnabled : data.enabled
    const enabled = typeof rawEnabled === 'boolean' ? rawEnabled : rawEnabled !== 'false'

    const rawAppliesTo = data.taxAppliesTo || data.appliesTo
    const appliesTo: TaxAppliesTo =
      rawAppliesTo === 'seller' || rawAppliesTo === 'customer' || rawAppliesTo === 'both'
        ? rawAppliesTo
        : 'both'

    const settings: TaxSettings = { enabled, rate, appliesTo }
    saveToStorage(settings)
    return settings
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/**
 * Save tax settings to backend database via Settings API,
 * update Redux state, and persist to local storage.
 */
export const saveTaxSettings = createAsyncThunk<
  TaxSettings,
  Partial<TaxSettings>,
  { rejectValue: ApiFailure }
>('taxSettings/saveTaxSettings', async (payload, { rejectWithValue }) => {
  try {
    const body = {
      taxRate: payload.rate,
      taxEnabled: payload.enabled,
      taxAppliesTo: payload.appliesTo,
      rate: payload.rate,
      enabled: payload.enabled,
      appliesTo: payload.appliesTo,
    }

    const { data } = await api.put('/admin/settings', body)
    const resData = data?.data || data || {}

    const rawRate = resData.taxRate !== undefined ? resData.taxRate : resData.rate !== undefined ? resData.rate : payload.rate
    const parsedRate = typeof rawRate === 'number' ? rawRate : Number(rawRate)
    const rate = !isNaN(parsedRate) ? parsedRate : (payload.rate ?? 18)

    const rawEnabled = resData.taxEnabled !== undefined ? resData.taxEnabled : resData.enabled !== undefined ? resData.enabled : payload.enabled
    const enabled = typeof rawEnabled === 'boolean' ? rawEnabled : rawEnabled !== 'false'

    const rawAppliesTo = resData.taxAppliesTo || resData.appliesTo || payload.appliesTo
    const appliesTo: TaxAppliesTo =
      rawAppliesTo === 'seller' || rawAppliesTo === 'customer' || rawAppliesTo === 'both'
        ? rawAppliesTo
        : 'both'

    const settings: TaxSettings = { enabled, rate, appliesTo }
    saveToStorage(settings)
    return settings
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaxSettings.fulfilled, (state, action) => {
        state.enabled = action.payload.enabled
        state.rate = action.payload.rate
        state.appliesTo = action.payload.appliesTo
      })
      .addCase(saveTaxSettings.fulfilled, (state, action) => {
        state.enabled = action.payload.enabled
        state.rate = action.payload.rate
        state.appliesTo = action.payload.appliesTo
      })
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
