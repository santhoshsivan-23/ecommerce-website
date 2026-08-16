import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type { ApiEnvelope, ApiFailure } from '@/types'

export interface Variation {
  id: number
  name: string
  title: string
  values: string[]
  createdAt?: string
  updatedAt?: string
}

interface VariationState {
  items: Variation[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: ApiFailure | null
}

const initialState: VariationState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchVariations = createAsyncThunk<
  Variation[],
  void,
  { rejectValue: ApiFailure }
>('variations/fetchVariations', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ variations: Variation[] }>>('/variations')
    return (data.data?.variations || []).map((v) => ({
      ...v,
      title: v.name || v.title,
    }))
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const createVariation = createAsyncThunk<
  Variation,
  { title: string; values: string[] },
  { rejectValue: ApiFailure }
>('variations/createVariation', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<{ variation: Variation }>>('/variations', payload)
    const v = data.data.variation
    return {
      ...v,
      title: v.name || v.title,
    }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const updateVariation = createAsyncThunk<
  Variation,
  { id: number; title?: string; values?: string[] },
  { rejectValue: ApiFailure }
>('variations/updateVariation', async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.put<ApiEnvelope<{ variation: Variation }>>(`/variations/${id}`, body)
    const v = data.data.variation
    return {
      ...v,
      title: v.name || v.title,
    }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deleteVariation = createAsyncThunk<
  number,
  number,
  { rejectValue: ApiFailure }
>('variations/deleteVariation', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/variations/${id}`)
    return id
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

const variationSlice = createSlice({
  name: 'variations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVariations.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchVariations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
        state.error = null
      })
      .addCase(fetchVariations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? { message: 'Could not load variations' }
      })
      .addCase(createVariation.fulfilled, (state, action) => {
        state.items.push(action.payload)
        state.items.sort((a, b) => a.name.localeCompare(b.name))
      })
      .addCase(updateVariation.fulfilled, (state, action) => {
        const index = state.items.findIndex((v) => v.id === action.payload.id)
        if (index !== -1) {
          state.items[index] = action.payload
          state.items.sort((a, b) => a.name.localeCompare(b.name))
        }
      })
      .addCase(deleteVariation.fulfilled, (state, action) => {
        state.items = state.items.filter((v) => v.id !== action.payload)
      })
  },
})

export default variationSlice.reducer
