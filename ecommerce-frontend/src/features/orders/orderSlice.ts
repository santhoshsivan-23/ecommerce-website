import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type {
  AdminOrderQuery,
  ApiEnvelope,
  ApiFailure,
  CheckoutSummary,
  Order,
  OrderStats,
  OrderStatus,
  Pagination,
  PaymentStatus,
  PlaceOrderInput,
} from '@/types'

interface OrderState {
  checkout: CheckoutSummary | null
  checkoutStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  placing: boolean

  myOrders: Order[]
  myPagination: Pagination

  current: Order | null
  detailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'

  adminOrders: Order[]
  adminPagination: Pagination
  adminStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  stats: OrderStats | null

  listStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const emptyPagination: Pagination = { total: 0, page: 1, limit: 10, totalPages: 0 }

const initialState: OrderState = {
  checkout: null,
  checkoutStatus: 'idle',
  placing: false,
  myOrders: [],
  myPagination: emptyPagination,
  current: null,
  detailStatus: 'idle',
  adminOrders: [],
  adminPagination: { ...emptyPagination, limit: 15 },
  adminStatus: 'idle',
  stats: null,
  listStatus: 'idle',
  error: null,
}

function cleanParams(query: object) {
  const params: Record<string, string | number> = {}
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params[key] = value as string | number
  })
  return params
}

export const fetchCheckoutSummary = createAsyncThunk<
  CheckoutSummary,
  { coupon?: string | null } | void,
  { rejectValue: ApiFailure }
>('orders/fetchCheckoutSummary', async (args, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<CheckoutSummary>>('/orders/checkout-summary', {
      params: args && args.coupon ? { coupon: args.coupon } : undefined,
    })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const placeOrder = createAsyncThunk<Order, PlaceOrderInput, { rejectValue: ApiFailure }>(
  'orders/placeOrder',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiEnvelope<{ order: Order }>>('/orders', payload)
      return data.data.order
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const fetchMyOrders = createAsyncThunk<
  { orders: Order[]; pagination: Pagination },
  { status?: string; page?: number } | void,
  { rejectValue: ApiFailure }
>('orders/fetchMyOrders', async (args, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ orders: Order[]; pagination: Pagination }>>(
      '/orders',
      { params: cleanParams(args || {}) }
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchOrder = createAsyncThunk<Order, string, { rejectValue: ApiFailure }>(
  'orders/fetchOrder',
  async (idOrNumber, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ order: Order }>>(`/orders/${idOrNumber}`)
      return data.data.order
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const cancelOrder = createAsyncThunk<
  Order,
  { id: number; reason?: string },
  { rejectValue: ApiFailure }
>('orders/cancelOrder', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ order: Order }>>(`/orders/${id}/cancel`, {
      reason,
    })
    return data.data.order
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/* --------------------------------- Admin ---------------------------------- */

export const fetchAdminOrders = createAsyncThunk<
  { orders: Order[]; pagination: Pagination },
  AdminOrderQuery,
  { rejectValue: ApiFailure }
>('orders/fetchAdminOrders', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ orders: Order[]; pagination: Pagination }>>(
      '/admin/orders',
      { params: cleanParams(query) }
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchAdminOrder = createAsyncThunk<Order, number, { rejectValue: ApiFailure }>(
  'orders/fetchAdminOrder',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ order: Order }>>(`/admin/orders/${id}`)
      return data.data.order
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const updateOrderStatus = createAsyncThunk<
  Order,
  { id: number; status: OrderStatus; note?: string },
  { rejectValue: ApiFailure }
>('orders/updateStatus', async ({ id, status, note }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ order: Order }>>(`/admin/orders/${id}/status`, {
      status,
      note,
    })
    return data.data.order
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const updatePaymentStatus = createAsyncThunk<
  Order,
  { id: number; paymentStatus: PaymentStatus },
  { rejectValue: ApiFailure }
>('orders/updatePaymentStatus', async ({ id, paymentStatus }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ order: Order }>>(
      `/admin/orders/${id}/payment-status`,
      { paymentStatus }
    )
    return data.data.order
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchOrderStats = createAsyncThunk<OrderStats, void, { rejectValue: ApiFailure }>(
  'orders/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<OrderStats>>('/admin/orders/stats')
      return data.data
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCurrentOrder(state) {
      state.current = null
      state.detailStatus = 'idle'
    },
    resetOrders() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    /** Keeps whichever list is on screen in step after a status change. */
    const replaceInLists = (state: OrderState, order: Order) => {
      state.current = order
      const inAdmin = state.adminOrders.findIndex((o) => o.id === order.id)
      if (inAdmin !== -1) state.adminOrders[inAdmin] = order
      const inMine = state.myOrders.findIndex((o) => o.id === order.id)
      if (inMine !== -1) state.myOrders[inMine] = order
    }

    builder
      .addCase(fetchCheckoutSummary.pending, (state) => {
        state.checkoutStatus = 'loading'
      })
      .addCase(fetchCheckoutSummary.fulfilled, (state, action) => {
        state.checkoutStatus = 'succeeded'
        state.checkout = action.payload
      })
      .addCase(fetchCheckoutSummary.rejected, (state, action) => {
        state.checkoutStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load your checkout'
      })

      .addCase(placeOrder.pending, (state) => {
        state.placing = true
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placing = false
        state.current = action.payload
        state.myOrders.unshift(action.payload)
        // The cart became an order, so the stale checkout must not be reused.
        state.checkout = null
        state.checkoutStatus = 'idle'
      })
      .addCase(placeOrder.rejected, (state) => {
        state.placing = false
      })

      .addCase(fetchMyOrders.pending, (state) => {
        state.listStatus = 'loading'
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.listStatus = 'succeeded'
        state.myOrders = action.payload.orders
        state.myPagination = action.payload.pagination
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.listStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load your orders'
      })

      .addCase(fetchOrder.pending, (state) => {
        state.detailStatus = 'loading'
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.current = null
        state.error = action.payload?.message ?? 'Could not load this order'
      })

      .addCase(fetchAdminOrder.pending, (state) => {
        state.detailStatus = 'loading'
      })
      .addCase(fetchAdminOrder.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.current = action.payload
      })
      .addCase(fetchAdminOrder.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.current = null
        state.error = action.payload?.message ?? 'Could not load this order'
      })

      .addCase(cancelOrder.fulfilled, (state, action) => {
        replaceInLists(state, action.payload)
      })

      .addCase(fetchAdminOrders.pending, (state) => {
        state.adminStatus = 'loading'
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.adminStatus = 'succeeded'
        state.adminOrders = action.payload.orders
        state.adminPagination = action.payload.pagination
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.adminStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load orders'
      })

      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        replaceInLists(state, action.payload)
      })
      .addCase(updatePaymentStatus.fulfilled, (state, action) => {
        replaceInLists(state, action.payload)
      })

      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.stats = action.payload
      })
  },
})

export const { clearCurrentOrder, resetOrders } = orderSlice.actions
export default orderSlice.reducer
