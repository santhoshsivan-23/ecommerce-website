import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type {
  AdminCustomer,
  AdminDashboard,
  AdminSeller,
  ApiEnvelope,
  ApiFailure,
  AttributeOverview,
  CustomerDetail,
  InventoryOverview,
  Order,
  Pagination,
  ReportQuery,
  SellerDetail,
  SellerInput,
  SellerOrderSummary,
  StockMovement,
} from '@/types'

type Status = 'idle' | 'loading' | 'succeeded' | 'failed'

interface AdminState {
  dashboard: AdminDashboard | null
  dashboardStatus: Status

  customers: AdminCustomer[]
  customerPagination: Pagination
  customersStatus: Status
  customerDetail: CustomerDetail | null
  customerOrders: Order[]
  customerOrderPagination: Pagination
  detailStatus: Status

  sellers: AdminSeller[]
  sellerPagination: Pagination
  sellersStatus: Status
  sellerDetail: SellerDetail | null
  sellerOrders: SellerOrderSummary[]
  sellerOrderPagination: Pagination

  inventory: InventoryOverview | null
  inventoryStatus: Status
  history: StockMovement[]
  historyProduct: { id: number; name: string; stock: number } | null

  attributes: AttributeOverview | null

  error: string | null
}

const emptyPagination: Pagination = { total: 0, page: 1, limit: 20, totalPages: 0 }

const initialState: AdminState = {
  dashboard: null,
  dashboardStatus: 'idle',

  customers: [],
  customerPagination: emptyPagination,
  customersStatus: 'idle',
  customerDetail: null,
  customerOrders: [],
  customerOrderPagination: { ...emptyPagination, limit: 10 },
  detailStatus: 'idle',

  sellers: [],
  sellerPagination: emptyPagination,
  sellersStatus: 'idle',
  sellerDetail: null,
  sellerOrders: [],
  sellerOrderPagination: { ...emptyPagination, limit: 10 },

  inventory: null,
  inventoryStatus: 'idle',
  history: [],
  historyProduct: null,

  attributes: null,

  error: null,
}

/** Drops empty values so the request URL stays readable. */
export function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return
    params[key] = value as string | number
  })
  return params
}

/** Wraps a GET so every thunk rejects with the same normalised failure shape. */
async function get<T>(url: string, params?: object): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, {
    params: params ? cleanParams(params) : undefined,
  })
  return data.data
}

/* -------------------------------- Dashboard -------------------------------- */

export const fetchAdminDashboard = createAsyncThunk<
  AdminDashboard,
  ReportQuery | void,
  { rejectValue: ApiFailure }
>('admin/fetchDashboard', async (query, { rejectWithValue }) => {
  try {
    return await get<AdminDashboard>('/admin/stats', query || undefined)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/* -------------------------------- Customers -------------------------------- */

export const fetchCustomers = createAsyncThunk<
  { customers: AdminCustomer[]; pagination: Pagination },
  { q?: string; status?: string; sort?: string; page?: number; limit?: number } | void,
  { rejectValue: ApiFailure }
>('admin/fetchCustomers', async (query, { rejectWithValue }) => {
  try {
    return await get('/admin/customers', query || undefined)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchCustomerDetail = createAsyncThunk<
  CustomerDetail,
  number,
  { rejectValue: ApiFailure }
>('admin/fetchCustomerDetail', async (id, { rejectWithValue }) => {
  try {
    return await get<CustomerDetail>(`/admin/customers/${id}`)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchCustomerOrders = createAsyncThunk<
  { orders: Order[]; pagination: Pagination },
  { id: number; status?: string; page?: number },
  { rejectValue: ApiFailure }
>('admin/fetchCustomerOrders', async ({ id, ...query }, { rejectWithValue }) => {
  try {
    return await get(`/admin/customers/${id}/orders`, query)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const setCustomerStatus = createAsyncThunk<
  { id: number; isActive: boolean; message: string },
  { id: number; isActive: boolean },
  { rejectValue: ApiFailure }
>('admin/setCustomerStatus', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ customer: { id: number; isActive: boolean } }>>(
      `/admin/customers/${id}/status`,
      { isActive }
    )
    return { ...data.data.customer, message: data.message || 'Customer updated' }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/* --------------------------------- Sellers --------------------------------- */

export const fetchSellers = createAsyncThunk<
  { sellers: AdminSeller[]; pagination: Pagination },
  ({ q?: string; status?: string; sort?: string; page?: number } & ReportQuery) | void,
  { rejectValue: ApiFailure }
>('admin/fetchSellers', async (query, { rejectWithValue }) => {
  try {
    return await get('/admin/sellers', query || undefined)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchSellerDetail = createAsyncThunk<
  SellerDetail,
  { id: number } & ReportQuery,
  { rejectValue: ApiFailure }
>('admin/fetchSellerDetail', async ({ id, ...query }, { rejectWithValue }) => {
  try {
    return await get<SellerDetail>(`/admin/sellers/${id}`, query)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchSellerOrdersForAdmin = createAsyncThunk<
  { orders: SellerOrderSummary[]; pagination: Pagination },
  { id: number; status?: string; page?: number } & ReportQuery,
  { rejectValue: ApiFailure }
>('admin/fetchSellerOrders', async ({ id, ...query }, { rejectWithValue }) => {
  try {
    return await get(`/admin/sellers/${id}/orders`, query)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const saveSeller = createAsyncThunk<
  { seller: AdminSeller; message: string; isNew: boolean },
  { id?: number; body: SellerInput },
  { rejectValue: ApiFailure }
>('admin/saveSeller', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ seller: AdminSeller }>>(`/admin/sellers/${id}`, body)
      : await api.post<ApiEnvelope<{ seller: AdminSeller }>>('/admin/sellers', body)
    return { seller: data.data.seller, message: data.message || 'Saved', isNew: !id }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const setSellerStatus = createAsyncThunk<
  { id: number; isActive: boolean; message: string },
  { id: number; isActive: boolean },
  { rejectValue: ApiFailure }
>('admin/setSellerStatus', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ seller: { id: number; isActive: boolean } }>>(
      `/admin/sellers/${id}/status`,
      { isActive }
    )
    return { ...data.data.seller, message: data.message || 'Seller updated' }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/* -------------------------------- Inventory -------------------------------- */

export const fetchAdminInventory = createAsyncThunk<
  InventoryOverview,
  { q?: string; sellerId?: string; categoryId?: string; stockLevel?: string; page?: number } | void,
  { rejectValue: ApiFailure }
>('admin/fetchInventory', async (query, { rejectWithValue }) => {
  try {
    return await get<InventoryOverview>('/admin/inventory', query || undefined)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchAdminStockHistory = createAsyncThunk<
  { product: { id: number; name: string; stock: number }; movements: StockMovement[] },
  number,
  { rejectValue: ApiFailure }
>('admin/fetchStockHistory', async (productId, { rejectWithValue }) => {
  try {
    return await get(`/admin/inventory/${productId}/history`)
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const adjustAdminStock = createAsyncThunk<
  { productId: number; variantId: number | null; productStock: number; newStock: number; change: number; message: string },
  { productId: number; variantId?: number | null; adjustment?: number; stock?: number; reason?: string },
  { rejectValue: ApiFailure }
>('admin/adjustStock', async ({ productId, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<
      ApiEnvelope<{
        productId: number
        variantId: number | null
        productStock: number
        newStock: number
        change: number
      }>
    >(`/admin/inventory/${productId}`, body)
    return { ...data.data, message: data.message || 'Stock updated' }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/* -------------------------------- Attributes ------------------------------- */

export const fetchAttributes = createAsyncThunk<AttributeOverview, void, { rejectValue: ApiFailure }>(
  'admin/fetchAttributes',
  async (_, { rejectWithValue }) => {
    try {
      return await get<AttributeOverview>('/admin/attributes')
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

/** Trading figures a seller starts life with, before any orders exist. */
const emptySellerFigures = {
  productCount: 0,
  activeProducts: 0,
  orderCount: 0,
  pendingOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  unitsSold: 0,
  sales: 0,
  revenue: 0,
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearCustomerDetail(state) {
      state.customerDetail = null
      state.customerOrders = []
      state.detailStatus = 'idle'
    },
    clearSellerDetail(state) {
      state.sellerDetail = null
      state.sellerOrders = []
      state.detailStatus = 'idle'
    },
    resetAdmin() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.dashboardStatus = 'loading'
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = 'succeeded'
        state.dashboard = action.payload
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.dashboardStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load the dashboard'
      })

      .addCase(fetchCustomers.pending, (state) => {
        state.customersStatus = 'loading'
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.customersStatus = 'succeeded'
        state.customers = action.payload.customers
        state.customerPagination = action.payload.pagination
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.customersStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load customers'
      })

      .addCase(fetchCustomerDetail.pending, (state) => {
        state.detailStatus = 'loading'
      })
      .addCase(fetchCustomerDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.customerDetail = action.payload
      })
      .addCase(fetchCustomerDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.customerDetail = null
        state.error = action.payload?.message ?? 'Could not load this customer'
      })

      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.customerOrders = action.payload.orders
        state.customerOrderPagination = action.payload.pagination
      })

      .addCase(setCustomerStatus.fulfilled, (state, action) => {
        const row = state.customers.find((customer) => customer.id === action.payload.id)
        if (row) row.isActive = action.payload.isActive
        if (state.customerDetail?.customer.id === action.payload.id) {
          state.customerDetail.customer.isActive = action.payload.isActive
        }
      })

      .addCase(fetchSellers.pending, (state) => {
        state.sellersStatus = 'loading'
      })
      .addCase(fetchSellers.fulfilled, (state, action) => {
        state.sellersStatus = 'succeeded'
        state.sellers = action.payload.sellers
        state.sellerPagination = action.payload.pagination
      })
      .addCase(fetchSellers.rejected, (state, action) => {
        state.sellersStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load sellers'
      })

      .addCase(fetchSellerDetail.pending, (state) => {
        state.detailStatus = 'loading'
      })
      .addCase(fetchSellerDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.sellerDetail = action.payload
      })
      .addCase(fetchSellerDetail.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.sellerDetail = null
        state.error = action.payload?.message ?? 'Could not load this seller'
      })

      .addCase(fetchSellerOrdersForAdmin.fulfilled, (state, action) => {
        state.sellerOrders = action.payload.orders
        state.sellerOrderPagination = action.payload.pagination
      })

      .addCase(saveSeller.fulfilled, (state, action) => {
        const index = state.sellers.findIndex((seller) => seller.id === action.payload.seller.id)
        // A newly created seller has no trading figures yet, so the list row is
        // filled in with zeroes until the next refresh.
        if (index === -1) state.sellers.unshift({ ...emptySellerFigures, ...action.payload.seller })
        else state.sellers[index] = { ...state.sellers[index], ...action.payload.seller }
      })

      .addCase(setSellerStatus.fulfilled, (state, action) => {
        const row = state.sellers.find((seller) => seller.id === action.payload.id)
        if (row) row.isActive = action.payload.isActive
        if (state.sellerDetail?.seller && state.sellerDetail.seller.id === action.payload.id) {
          state.sellerDetail.seller.isActive = action.payload.isActive
        }
      })

      .addCase(fetchAdminInventory.pending, (state) => {
        state.inventoryStatus = 'loading'
      })
      .addCase(fetchAdminInventory.fulfilled, (state, action) => {
        state.inventoryStatus = 'succeeded'
        state.inventory = action.payload
      })
      .addCase(fetchAdminInventory.rejected, (state, action) => {
        state.inventoryStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load the inventory'
      })

      .addCase(fetchAdminStockHistory.fulfilled, (state, action) => {
        state.history = action.payload.movements
        state.historyProduct = action.payload.product
      })

      .addCase(adjustAdminStock.fulfilled, (state, action) => {
        // Patch the row in place so the table does not have to refetch.
        const row = state.inventory?.products.find((item) => item.id === action.payload.productId)
        if (row) {
          row.stock = action.payload.productStock
          if (action.payload.variantId && row.variants) {
            const variant = row.variants.find((v) => v.id === action.payload.variantId)
            if (variant) variant.stock = action.payload.newStock
          }
        }
      })

      .addCase(fetchAttributes.fulfilled, (state, action) => {
        state.attributes = action.payload
      })
  },
})

export const { clearCustomerDetail, clearSellerDetail, resetAdmin } = adminSlice.actions
export default adminSlice.reducer
