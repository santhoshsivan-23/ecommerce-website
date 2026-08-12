import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type { Address, AddressInput, ApiEnvelope, ApiFailure } from '@/types'

interface AddressState {
  items: Address[]
  /** Address chosen for delivery at checkout. */
  selectedId: number | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AddressState = {
  items: [],
  selectedId: null,
  status: 'idle',
  error: null,
}

export const fetchAddresses = createAsyncThunk<Address[], void, { rejectValue: ApiFailure }>(
  'address/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ addresses: Address[] }>>('/addresses')
      return data.data.addresses
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const saveAddress = createAsyncThunk<
  Address,
  { id?: number; body: Partial<AddressInput> },
  { rejectValue: ApiFailure }
>('address/saveAddress', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ address: Address }>>(`/addresses/${id}`, body)
      : await api.post<ApiEnvelope<{ address: Address }>>('/addresses', body)
    return data.data.address
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const setDefaultAddress = createAsyncThunk<Address[], number, { rejectValue: ApiFailure }>(
  'address/setDefault',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch<ApiEnvelope<{ addresses: Address[] }>>(`/addresses/${id}/default`)
      return data.data.addresses
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const deleteAddress = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'address/deleteAddress',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/addresses/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    selectAddress(state, action: { payload: number | null }) {
      state.selectedId = action.payload
    },
    resetAddresses() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    /** Keeps the delivery selection pointing at a real address. */
    const syncSelection = (state: AddressState) => {
      if (state.selectedId && state.items.some((a) => a.id === state.selectedId)) return
      state.selectedId = state.items.find((a) => a.isDefault)?.id ?? state.items[0]?.id ?? null
    }

    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
        syncSelection(state)
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load your addresses'
      })

      .addCase(saveAddress.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id)
        if (index === -1) state.items.unshift(action.payload)
        else state.items[index] = action.payload

        // Only one address can be the default at a time.
        if (action.payload.isDefault) {
          state.items = state.items.map((a) =>
            a.id === action.payload.id ? a : { ...a, isDefault: false }
          )
        }
        syncSelection(state)
      })

      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.items = action.payload
        state.selectedId = action.payload.find((a) => a.isDefault)?.id ?? state.selectedId
      })

      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload)
        // The server promotes a new default, so mirror that locally.
        if (state.items.length && !state.items.some((a) => a.isDefault)) {
          state.items[0] = { ...state.items[0], isDefault: true }
        }
        if (state.selectedId === action.payload) state.selectedId = null
        syncSelection(state)
      })
  },
})

export const { selectAddress, resetAddresses } = addressSlice.actions
export default addressSlice.reducer
