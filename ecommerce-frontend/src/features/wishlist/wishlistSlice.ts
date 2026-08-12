import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import { moveWishlistItemToCart } from '@/features/cart/cartSlice'
import type { ApiEnvelope, ApiFailure, WishlistEntry } from '@/types'

interface WishlistState {
  items: WishlistEntry[]
  /** Mirrors the server list so cards can render a filled heart instantly. */
  productIds: number[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: WishlistState = {
  items: [],
  productIds: [],
  status: 'idle',
  error: null,
}

export const fetchWishlist = createAsyncThunk<
  { items: WishlistEntry[]; productIds: number[] },
  void,
  { rejectValue: ApiFailure }
>('wishlist/fetchWishlist', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<{ items: WishlistEntry[]; productIds: number[] }>>(
      '/wishlist'
    )
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const addToWishlist = createAsyncThunk<number[], number, { rejectValue: ApiFailure }>(
  'wishlist/addToWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiEnvelope<{ productIds: number[] }>>('/wishlist', { productId })
      return data.data.productIds
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const removeFromWishlist = createAsyncThunk<
  { productIds: number[]; productId: number },
  number,
  { rejectValue: ApiFailure }
>('wishlist/removeFromWishlist', async (productId, { rejectWithValue }) => {
  try {
    const { data } = await api.delete<ApiEnvelope<{ productIds: number[] }>>(`/wishlist/${productId}`)
    return { productIds: data.data.productIds, productId }
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlist() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.productIds = action.payload.productIds
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load your wishlist'
      })

      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.productIds = action.payload
      })

      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.productIds = action.payload.productIds
        state.items = state.items.filter((item) => item.product.id !== action.payload.productId)
      })

      // Moving to the cart removes the product from the wishlist server-side.
      .addCase(moveWishlistItemToCart.fulfilled, (state, action) => {
        const productId = action.meta.arg.productId
        state.productIds = state.productIds.filter((id) => id !== productId)
        state.items = state.items.filter((item) => item.product.id !== productId)
      })
  },
})

export const { resetWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
