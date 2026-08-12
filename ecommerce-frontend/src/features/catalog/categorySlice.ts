import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type { ApiEnvelope, ApiFailure, Brand, Category } from '@/types'

interface CatalogState {
  categories: Category[]
  brands: Brand[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: CatalogState = {
  categories: [],
  brands: [],
  status: 'idle',
  error: null,
}

export const fetchCategories = createAsyncThunk<
  Category[],
  { includeInactive?: boolean } | void,
  { rejectValue: ApiFailure }
>('catalog/fetchCategories', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ categories: Category[] }>>('/categories', {
      params: params && params.includeInactive ? { includeInactive: true } : undefined,
    })
    return data.data.categories
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/** Flat list including subcategories, used by admin dropdowns. */
export const fetchCategoriesFlat = createAsyncThunk<Category[], void, { rejectValue: ApiFailure }>(
  'catalog/fetchCategoriesFlat',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ApiEnvelope<{ categories: Category[] }>>('/categories/flat')
      return data.data.categories
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const fetchBrands = createAsyncThunk<
  Brand[],
  { includeInactive?: boolean } | void,
  { rejectValue: ApiFailure }
>('catalog/fetchBrands', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ brands: Brand[] }>>('/brands', {
      params: params && params.includeInactive ? { includeInactive: true } : undefined,
    })
    return data.data.brands
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const saveCategory = createAsyncThunk<
  Category,
  { id?: number; body: Partial<Category> },
  { rejectValue: ApiFailure }
>('catalog/saveCategory', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ category: Category }>>(`/categories/${id}`, body)
      : await api.post<ApiEnvelope<{ category: Category }>>('/categories', body)
    return data.data.category
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deleteCategory = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'catalog/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/categories/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const saveBrand = createAsyncThunk<
  Brand,
  { id?: number; body: Partial<Brand> },
  { rejectValue: ApiFailure }
>('catalog/saveBrand', async ({ id, body }, { rejectWithValue }) => {
  try {
    const { data } = id
      ? await api.patch<ApiEnvelope<{ brand: Brand }>>(`/brands/${id}`, body)
      : await api.post<ApiEnvelope<{ brand: Brand }>>('/brands', body)
    return data.data.brand
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const deleteBrand = createAsyncThunk<number, number, { rejectValue: ApiFailure }>(
  'catalog/deleteBrand',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/brands/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load categories'
      })
      .addCase(fetchCategoriesFlat.fulfilled, (state, action) => {
        state.categories = action.payload
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.brands = action.payload
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.brands = state.brands.filter((brand) => brand.id !== action.payload)
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((category) => category.id !== action.payload)
      })
  },
})

export default catalogSlice.reducer
