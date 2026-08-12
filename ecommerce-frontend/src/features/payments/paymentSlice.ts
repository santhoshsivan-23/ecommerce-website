import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type { ApiEnvelope, ApiFailure, Coupon, PaymentMethod } from '@/types'

interface PaymentState {
  methods: PaymentMethod[]
  coupons: Coupon[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PaymentState = {
  methods: [],
  coupons: [],
  status: 'idle',
  error: null,
}

export const fetchPaymentMethods = createAsyncThunk<
  PaymentMethod[],
  { includeInactive?: boolean } | void,
  { rejectValue: ApiFailure }
>('payments/fetchMethods', async (args, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ paymentMethods: PaymentMethod[] }>>(
      '/payment-methods',
      { params: args && args.includeInactive ? { includeInactive: true } : undefined }
    )
    return data.data.paymentMethods
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const savePaymentMethod = createAsyncThunk<
  PaymentMethod,
  { id?: number; body: Partial<PaymentMethod> },
  { rejectValue: ApiFailure }
>('payments/saveMethod', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ paymentMethod: PaymentMethod }>>(
          `/payment-methods/${id}`,
          body
        )
      : await api.post<ApiEnvelope<{ paymentMethod: PaymentMethod }>>('/payment-methods', body)
    return data.data.paymentMethod
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const togglePaymentMethod = createAsyncThunk<
  PaymentMethod,
  { id: number; isActive: boolean },
  { rejectValue: ApiFailure }
>('payments/toggleMethod', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ paymentMethod: PaymentMethod }>>(
      `/payment-methods/${id}/status`,
      { isActive }
    )
    return data.data.paymentMethod
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deletePaymentMethod = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'payments/deleteMethod',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/payment-methods/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

/* --------------------------------- Coupons -------------------------------- */

export const fetchCoupons = createAsyncThunk<Coupon[], void, { rejectValue: ApiFailure }>(
  'payments/fetchCoupons',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ coupons: Coupon[] }>>('/coupons')
      return data.data.coupons
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const saveCoupon = createAsyncThunk<
  Coupon,
  { id?: number; body: Partial<Coupon> },
  { rejectValue: ApiFailure }
>('payments/saveCoupon', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ coupon: Coupon }>>(`/coupons/${id}`, body)
      : await api.post<ApiEnvelope<{ coupon: Coupon }>>('/coupons', body)
    return data.data.coupon
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deleteCoupon = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'payments/deleteCoupon',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/coupons/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const upsertMethod = (state: PaymentState, method: PaymentMethod) => {
      const index = state.methods.findIndex((m) => m.id === method.id)
      if (index === -1) state.methods.push(method)
      else state.methods[index] = method
      state.methods.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    }

    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.methods = action.payload
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load payment methods'
      })

      .addCase(savePaymentMethod.fulfilled, (state, action) => {
        upsertMethod(state, action.payload)
      })
      .addCase(togglePaymentMethod.fulfilled, (state, action) => {
        upsertMethod(state, action.payload)
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.methods = state.methods.filter((m) => m.id !== action.payload)
      })

      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.coupons = action.payload
      })
      .addCase(saveCoupon.fulfilled, (state, action) => {
        const index = state.coupons.findIndex((c) => c.id === action.payload.id)
        if (index === -1) state.coupons.unshift(action.payload)
        else state.coupons[index] = action.payload
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.coupons = state.coupons.filter((c) => c.id !== action.payload)
      })
  },
})

export default paymentSlice.reducer
