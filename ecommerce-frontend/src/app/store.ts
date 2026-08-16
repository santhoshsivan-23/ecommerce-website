import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import catalogReducer from '@/features/catalog/categorySlice'
import productReducer from '@/features/products/productSlice'
import cartReducer from '@/features/cart/cartSlice'
import wishlistReducer from '@/features/wishlist/wishlistSlice'
import addressReducer from '@/features/address/addressSlice'
import orderReducer from '@/features/orders/orderSlice'
import paymentReducer from '@/features/payments/paymentSlice'
import sellerReducer from '@/features/seller/sellerSlice'
import adminReducer from '@/features/admin/adminSlice'
import reportReducer from '@/features/reports/reportSlice'
import taxSettingsReducer from '@/features/admin/taxSettingsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    products: productReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    address: addressReducer,
    orders: orderReducer,
    payments: paymentReducer,
    seller: sellerReducer,
    admin: adminReducer,
    reports: reportReducer,
    taxSettings: taxSettingsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
