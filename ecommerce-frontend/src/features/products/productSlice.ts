import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type {
  ApiEnvelope,
  ApiFailure,
  FilterOptions,
  Pagination,
  Product,
  ProductQuery,
} from '@/types'

interface ProductState {
  items: Product[]
  pagination: Pagination
  featured: Product[]
  current: Product | null
  related: Product[]
  filterOptions: FilterOptions | null
  listStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  detailStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: ProductState = {
  items: [],
  pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
  featured: [],
  current: null,
  related: [],
  filterOptions: null,
  listStatus: 'idle',
  detailStatus: 'idle',
  error: null,
}

/** Drops empty values so the request URL stays readable and cacheable. */
function cleanParams(query: ProductQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {}
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return
    params[key] = value as string | number | boolean
  })
  return params
}

export const fetchProducts = createAsyncThunk<
  { products: Product[]; pagination: Pagination },
  ProductQuery,
  { rejectValue: ApiFailure }
>('products/fetchProducts', async (query, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ products: Product[]; pagination: Pagination }>>(
      '/products',
      { params: cleanParams(query) }
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchFeaturedProducts = createAsyncThunk<Product[], void, { rejectValue: ApiFailure }>(
  'products/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ products: Product[] }>>('/products', {
        params: { featured: true, limit: 8, sort: 'popular' },
      })
      return data.data.products
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const fetchProduct = createAsyncThunk<
  { product: Product; related: Product[] },
  string,
  { rejectValue: ApiFailure }
>('products/fetchProduct', async (idOrSlug, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ product: Product; related: Product[] }>>(
      `/products/${idOrSlug}`
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const fetchFilterOptions = createAsyncThunk<
  FilterOptions,
  { category?: string } | void,
  { rejectValue: ApiFailure }
>('products/fetchFilterOptions', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<FilterOptions>>('/products/filters', {
      params: params && params.category ? { category: params.category } : undefined,
    })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const saveProduct = createAsyncThunk<
  Product,
  { id?: number; body: Record<string, unknown> },
  { rejectValue: ApiFailure }
>('products/saveProduct', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ product: Product }>>(`/products/${id}`, body)
      : await api.post<ApiEnvelope<{ product: Product }>>('/products', body)
    return data.data.product
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const toggleProductStatus = createAsyncThunk<
  Product,
  { id: number; isActive: boolean },
  { rejectValue: ApiFailure }
>('products/toggleStatus', async ({ id, isActive }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<{ product: Product }>>(`/products/${id}/status`, {
      isActive,
    })
    return data.data.product
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deleteProduct = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/products/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrentProduct(state) {
      state.current = null
      state.related = []
      state.detailStatus = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.listStatus = 'loading'
        state.error = null
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.listStatus = 'succeeded'
        state.items = action.payload.products
        state.pagination = action.payload.pagination
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.listStatus = 'failed'
        state.error = action.payload?.message ?? 'Could not load products'
      })

      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featured = action.payload
      })

      .addCase(fetchProduct.pending, (state) => {
        state.detailStatus = 'loading'
        state.error = null
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded'
        state.current = action.payload.product
        state.related = action.payload.related
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.detailStatus = 'failed'
        state.current = null
        state.error = action.payload?.message ?? 'Could not load this product'
      })

      .addCase(fetchFilterOptions.fulfilled, (state, action) => {
        state.filterOptions = action.payload
      })

      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload.id)
        if (index !== -1) state.items[index].isActive = action.payload.isActive
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload)
        state.pagination.total = Math.max(0, state.pagination.total - 1)
      })
  },
})

export const { clearCurrentProduct } = productSlice.actions
export default productSlice.reducer
