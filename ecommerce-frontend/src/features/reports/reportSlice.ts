import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import { cleanParams } from '@/features/admin/adminSlice'
import type {
  Analytics,
  ApiEnvelope,
  ApiFailure,
  OrderSourceReport,
  PaymentReport,
  ProductReport,
  ReportQuery,
  SalesReport,
  SellerReport,
} from '@/types'

type Status = 'idle' | 'loading' | 'succeeded' | 'failed'

interface ReportState {
  sales: SalesReport | null
  products: ProductReport | null
  sellers: SellerReport | null
  payments: PaymentReport | null
  orderSource: OrderSourceReport | null
  analytics: Analytics | null

  status: Status
  analyticsStatus: Status
  error: string | null
}

const initialState: ReportState = {
  sales: null,
  products: null,
  sellers: null,
  payments: null,
  orderSource: null,
  analytics: null,
  status: 'idle',
  analyticsStatus: 'idle',
  error: null,
}

/** Every report is the same GET with the same window, so one helper covers all. */
function reportThunk<T>(name: string, path: string) {
  return createAsyncThunk<T, ReportQuery | void, { rejectValue: ApiFailure }>(
    `reports/${name}`,
    async (query, { rejectWithValue }) => {
      try {
        const { data } = await api.get<ApiEnvelope<T>>(`/admin/reports/${path}`, {
          params: query ? cleanParams(query) : undefined,
        })
        return data.data
      } catch (error) {
        return rejectWithValue(toApiFailure(error))
      }
    }
  )
}

export const fetchSalesReport = reportThunk<SalesReport>('sales', 'sales')
export const fetchProductReport = reportThunk<ProductReport>('products', 'products')
export const fetchSellerReport = reportThunk<SellerReport>('sellers', 'sellers')
export const fetchPaymentReport = reportThunk<PaymentReport>('payments', 'payments')
export const fetchOrderSourceReport = reportThunk<OrderSourceReport>('orderSource', 'order-source')
export const fetchAnalytics = reportThunk<Analytics>('analytics', 'analytics')

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    resetReports() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesReport.fulfilled, (state, action) => {
        state.sales = action.payload
      })
      .addCase(fetchProductReport.fulfilled, (state, action) => {
        state.products = action.payload
      })
      .addCase(fetchSellerReport.fulfilled, (state, action) => {
        state.sellers = action.payload
      })
      .addCase(fetchPaymentReport.fulfilled, (state, action) => {
        state.payments = action.payload
      })
      .addCase(fetchOrderSourceReport.fulfilled, (state, action) => {
        state.orderSource = action.payload
      })

      .addCase(fetchAnalytics.pending, (state) => {
        state.analyticsStatus = 'loading'
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.analyticsStatus = 'succeeded'
        state.analytics = action.payload
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.analyticsStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load analytics'
      })

      // The five tabular reports share one loading flag: only one is on screen
      // at a time, so tracking them separately would add state nothing reads.
      .addMatcher(
        (action) =>
          action.type.startsWith('reports/') &&
          action.type.endsWith('/pending') &&
          !action.type.includes('analytics'),
        (state) => {
          state.status = 'loading'
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith('reports/') &&
          action.type.endsWith('/fulfilled') &&
          !action.type.includes('analytics'),
        (state) => {
          state.status = 'succeeded'
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith('reports/') &&
          action.type.endsWith('/rejected') &&
          !action.type.includes('analytics'),
        (state, action) => {
          state.status = 'failed'
          state.error =
            (action as { payload?: ApiFailure }).payload?.message ?? 'Could not load the report'
        }
      )
  },
})

export const { resetReports } = reportSlice.actions
export default reportSlice.reducer
