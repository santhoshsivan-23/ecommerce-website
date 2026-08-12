import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, toApiFailure } from '@/api/client'
import type { ApiEnvelope, ApiFailure, CartPayload } from '@/types'

interface CartState extends CartPayload {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  /** Ids of lines with a request in flight, so only that row shows a spinner. */
  pendingItemIds: number[]
  error: string | null
}

const emptySummary = {
  itemCount: 0,
  subtotal: 0,
  productDiscount: 0,
  couponDiscount: 0,
  discount: 0,
  itemsTotal: 0,
  deliveryCharge: 0,
  total: 0,
  freeDeliveryThreshold: 500,
}

const initialState: CartState = {
  cartId: 0,
  items: [],
  summary: emptySummary,
  coupon: null,
  couponError: null,
  hasUnavailableItems: false,
  status: 'idle',
  pendingItemIds: [],
  error: null,
}

export const fetchCart = createAsyncThunk<
  CartPayload,
  { coupon?: string | null } | void,
  { rejectValue: ApiFailure }
>('cart/fetchCart', async (args, { rejectWithValue }) => {
  try {
    const { data } = await api.get<ApiEnvelope<CartPayload>>('/cart', {
      params: args && args.coupon ? { coupon: args.coupon } : undefined,
    })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

/** Validates a coupon against the current cart and returns the repriced cart. */
export const applyCoupon = createAsyncThunk<CartPayload, string, { rejectValue: ApiFailure }>(
  'cart/applyCoupon',
  async (code, { rejectWithValue }) => {
    try {
      const { data } = await api.post<ApiEnvelope<CartPayload>>('/cart/coupon', { code })
      return data.data
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const addToCart = createAsyncThunk<
  CartPayload,
  { productId: number; variantId?: number | null; quantity?: number },
  { rejectValue: ApiFailure }
>('cart/addToCart', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<CartPayload>>('/cart/items', payload)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const updateCartItem = createAsyncThunk<
  CartPayload,
  { itemId: number; quantity: number },
  { rejectValue: ApiFailure }
>('cart/updateCartItem', async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<ApiEnvelope<CartPayload>>(`/cart/items/${itemId}`, { quantity })
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

export const removeCartItem = createAsyncThunk<CartPayload, number, { rejectValue: ApiFailure }>(
  'cart/removeCartItem',
  async (itemId, { rejectWithValue }) => {
    try {
      const { data } = await api.delete<ApiEnvelope<CartPayload>>(`/cart/items/${itemId}`)
      return data.data
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const clearCart = createAsyncThunk<CartPayload, void, { rejectValue: ApiFailure }>(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.delete<ApiEnvelope<CartPayload>>('/cart')
      return data.data
    } catch (error) {
      return rejectWithValue(toApiFailure(error))
    }
  }
)

export const moveWishlistItemToCart = createAsyncThunk<
  CartPayload,
  { productId: number; variantId?: number | null; quantity?: number },
  { rejectValue: ApiFailure }
>('cart/moveFromWishlist', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiEnvelope<CartPayload>>('/cart/move-from-wishlist', payload)
    return data.data
  } catch (error) {
    return rejectWithValue(toApiFailure(error))
  }
})

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart() {
      return initialState
    },
    /** Drops the applied coupon; the next fetch reprices without it. */
    clearCoupon(state) {
      state.coupon = null
      state.couponError = null
    },
  },
  extraReducers: (builder) => {
    const applyCart = (state: CartState, action: { payload: CartPayload }) => {
      state.status = 'succeeded'
      state.cartId = action.payload.cartId
      state.items = action.payload.items
      state.summary = action.payload.summary
      state.coupon = action.payload.coupon
      state.couponError = action.payload.couponError
      state.hasUnavailableItems = action.payload.hasUnavailableItems
      state.error = null
    }

    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCart.fulfilled, applyCart)
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load your cart'
      })

      .addCase(addToCart.fulfilled, applyCart)
      .addCase(clearCart.fulfilled, applyCart)
      .addCase(moveWishlistItemToCart.fulfilled, applyCart)
      .addCase(applyCoupon.fulfilled, applyCart)

      .addCase(updateCartItem.pending, (state, action) => {
        state.pendingItemIds.push(action.meta.arg.itemId)
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.pendingItemIds = state.pendingItemIds.filter((id) => id !== action.meta.arg.itemId)
        applyCart(state, action)
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.pendingItemIds = state.pendingItemIds.filter((id) => id !== action.meta.arg.itemId)
      })

      .addCase(removeCartItem.pending, (state, action) => {
        state.pendingItemIds.push(action.meta.arg)
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.pendingItemIds = state.pendingItemIds.filter((id) => id !== action.meta.arg)
        applyCart(state, action)
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.pendingItemIds = state.pendingItemIds.filter((id) => id !== action.meta.arg)
      })
  },
})

export const { resetCart, clearCoupon } = cartSlice.actions
export default cartSlice.reducer
