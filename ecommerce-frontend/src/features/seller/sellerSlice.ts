import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type {
  ApiEnvelope,
  ApiFailure,
  CreateSellerOrderInput,
  DraftQuote,
  InventoryProduct,
  OrderStatus,
  Pagination,
  SellerCustomer,
  SellerOrder,
  SellerOrderQuery,
  SellerStats,
  StockMovement,
} from '@/types'

interface SellerState {
  stats: SellerStats | null
  statsStatus: 'idle' | 'loading' | 'succeeded' | 'failed'

  inventory: InventoryProduct[]
  inventoryPagination: Pagination
  inventoryStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  lowStockThreshold: number

  history: StockMovement[]
  historyProduct: { id: number; name: string; stock: number } | null
  historyStatus: 'idle' | 'loading' | 'succeeded' | 'failed'

  orders: SellerOrder[]
  ordersPagination: Pagination
  ordersStatus: 'idle' | 'loading' | 'succeeded' | 'failed'

  currentOrder: SellerOrder | null
  currentOrderStatus: 'idle' | 'loading' | 'succeeded' | 'failed'

  customers: SellerCustomer[]
  draftQuote: DraftQuote | null

  error: string | null
}

const emptyPagination: Pagination = { total: 0, page: 1, limit: 20, totalPages: 0 }

const initialState: SellerState = {
  stats: null,
  statsStatus: 'idle',

  inventory: [],
  inventoryPagination: emptyPagination,
  inventoryStatus: 'idle',
  lowStockThreshold: 5,

  history: [],
  historyProduct: null,
  historyStatus: 'idle',

  orders: [],
  ordersPagination: { ...emptyPagination, limit: 15 },
  ordersStatus: 'idle',

  currentOrder: null,
  currentOrderStatus: 'idle',

  customers: [],
  draftQuote: null,

  error: null,
}

/** Drops empty values so the request URL stays readable. */
function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return
    params[key] = value as string | number
  })
  return params
}

export const fetchSellerStats = createAsyncThunk<
  SellerStats,
  { range?: string; from?: string; to?: string } | void,
  { rejectValue: ApiFailure }
>('seller/fetchStats', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<SellerStats>>('/seller/stats', {
      params: query ? cleanParams(query) : undefined,
    })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchInventory = createAsyncThunk<
  { products: InventoryProduct[]; pagination: Pagination; lowStockThreshold: number },
  { q?: string; stockLevel?: string; page?: number; limit?: number } | void,
  { rejectValue: ApiFailure }
>('seller/fetchInventory', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<
      ApiEnvelope<{
        products: InventoryProduct[]
        pagination: Pagination
        lowStockThreshold: number
      }>
    >('/seller/inventory', { params: query ? cleanParams(query) : undefined })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const adjustStock = createAsyncThunk<
  { productId: number; variantId: number | null; productStock: number; newStock: number; change: number },
  { productId: number; variantId?: number | null; adjustment?: number; stock?: number; reason?: string },
  { rejectValue: ApiFailure }
>('seller/adjustStock', async ({ productId, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<
      ApiEnvelope<{
        productId: number
        variantId: number | null
        productStock: number
        newStock: number
        change: number
      }>
    >(`/seller/inventory/${productId}`, body)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchStockHistory = createAsyncThunk<
  { product: { id: number; name: string; stock: number }; movements: StockMovement[] },
  number,
  { rejectValue: ApiFailure }
>('seller/fetchStockHistory', async (productId, { rejectWithValue }) => {
  try {
    const { data } = await api.get<
      ApiEnvelope<{ product: { id: number; name: string; stock: number }; movements: StockMovement[] }>
    >(`/seller/inventory/${productId}/history`)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchSellerOrders = createAsyncThunk<
  { orders: SellerOrder[]; pagination: Pagination },
  SellerOrderQuery | void,
  { rejectValue: ApiFailure }
>('seller/fetchOrders', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ orders: SellerOrder[]; pagination: Pagination }>>(
      '/seller/orders',
      { params: query ? cleanParams(query) : undefined }
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchSellerOrder = createAsyncThunk<SellerOrder, number, { rejectValue: ApiFailure }>(
  'seller/fetchOrder',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ order: SellerOrder }>>(`/seller/orders/${id}`)
      return data.data.order
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const updateSellerOrderStatus = createAsyncThunk<
  SellerOrder,
  { id: number; status: OrderStatus; note?: string },
  { rejectValue: ApiFailure }
>('seller/updateOrderStatus', async ({ id, status, note }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ order: SellerOrder }>>(
      `/seller/orders/${id}/status`,
      { status, note }
    )
    return data.data.order
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchSellerCustomers = createAsyncThunk<
  SellerCustomer[],
  { q?: string } | void,
  { rejectValue: ApiFailure }
>('seller/fetchCustomers', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ customers: SellerCustomer[] }>>(
      '/seller/customers',
      { params: query ? cleanParams(query) : undefined }
    )
    return data.data.customers
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const createSellerCustomer = createAsyncThunk<
  SellerCustomer,
  { name: string; email: string; phone?: string },
  { rejectValue: ApiFailure }
>('seller/createCustomer', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<{ customer: SellerCustomer }>>('/seller/customers', body)
    return data.data.customer
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/** Prices a draft order on the server before it is created. */
export const quoteDraftOrder = createAsyncThunk<
  DraftQuote,
  { items: Array<{ productId: number; variantId: number | null; quantity: number }>; couponCode?: string | null },
  { rejectValue: ApiFailure }
>('seller/quoteDraft', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<DraftQuote>>('/seller/orders/quote', body)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const createSellerOrder = createAsyncThunk<
  SellerOrder,
  CreateSellerOrderInput,
  { rejectValue: ApiFailure }
>('seller/createOrder', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<{ order: SellerOrder }>>('/seller/orders', body)
    return data.data.order
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

const sellerSlice = createSlice({
  name: 'seller',
  initialState,
  reducers: {
    clearDraftQuote(state) {
      state.draftQuote = null
    },
    clearCurrentSellerOrder(state) {
      state.currentOrder = null
      state.currentOrderStatus = 'idle'
    },
    resetSeller() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerStats.pending, (state) => {
        state.statsStatus = 'loading'
      })
      .addCase(fetchSellerStats.fulfilled, (state, action) => {
        state.statsStatus = 'succeeded'
        state.stats = action.payload
      })
      .addCase(fetchSellerStats.rejected, (state, action) => {
        state.statsStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load seller stats'
      })

      .addCase(fetchInventory.pending, (state) => {
        state.inventoryStatus = 'loading'
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.inventoryStatus = 'succeeded'
        state.inventory = action.payload.products
        state.inventoryPagination = action.payload.pagination
        state.lowStockThreshold = action.payload.lowStockThreshold
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.inventoryStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load inventory'
      })

      .addCase(adjustStock.fulfilled, (state, action) => {
        const item = state.inventory.find((p) => p.id === action.payload.productId)
        if (item) item.stock = action.payload.productStock
      })

      .addCase(fetchStockHistory.pending, (state) => {
        state.historyStatus = 'loading'
      })
      .addCase(fetchStockHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded'
        state.historyProduct = action.payload.product
        state.history = action.payload.movements
      })
      .addCase(fetchStockHistory.rejected, (state) => {
        state.historyStatus = 'failed'
        state.historyProduct = null
        state.history = []
      })

      .addCase(fetchSellerOrders.pending, (state) => {
        state.ordersStatus = 'loading'
      })
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.ordersStatus = 'succeeded'
        state.orders = action.payload.orders
        state.ordersPagination = action.payload.pagination
      })
      .addCase(fetchSellerOrders.rejected, (state, action) => {
        state.ordersStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load seller orders'
      })

      .addCase(fetchSellerOrder.pending, (state) => {
        state.currentOrderStatus = 'loading'
      })
      .addCase(fetchSellerOrder.fulfilled, (state, action) => {
        state.currentOrderStatus = 'succeeded'
        state.currentOrder = action.payload
      })
      .addCase(fetchSellerOrder.rejected, (state, action) => {
        state.currentOrderStatus = 'failed'
        state.currentOrder = null
        state.error = action.payload?.message ?? 'Could not load this order'
      })

      .addCase(updateSellerOrderStatus.fulfilled, (state, action) => {
        state.currentOrder = action.payload
        const index = state.orders.findIndex((order) => order.id === action.payload.id)
        if (index !== -1) state.orders[index] = action.payload
      })

      .addCase(fetchSellerCustomers.fulfilled, (state, action) => {
        state.customers = action.payload
      })

      .addCase(createSellerCustomer.fulfilled, (state, action) => {
        state.customers.unshift(action.payload)
      })

      .addCase(quoteDraftOrder.fulfilled, (state, action) => {
        state.draftQuote = action.payload
      })
      .addCase(quoteDraftOrder.rejected, (state) => {
        state.draftQuote = null
      })

      .addCase(createSellerOrder.fulfilled, (state) => {
        state.draftQuote = null
      })
  },
})

export const { clearDraftQuote, clearCurrentSellerOrder, resetSeller } = sellerSlice.actions
export default sellerSlice.reducer
