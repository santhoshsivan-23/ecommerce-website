import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { loadSession, sessionExpired } from '@/features/auth/authSlice'
import { fetchCategories } from '@/features/catalog/categorySlice'
import { fetchCart, resetCart } from '@/features/cart/cartSlice'
import { fetchWishlist, resetWishlist } from '@/features/wishlist/wishlistSlice'
import { setUnauthorizedHandler } from '@/api/client'
import { notify } from '@/utils/notify'

import { Layout } from '@/components/layout/Layout'
import { GuestRoute, ProtectedRoute } from '@/components/routing/ProtectedRoute'

import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ProductList from '@/pages/ProductList'
import ProductDetails from '@/pages/ProductDetails'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Orders from '@/pages/Orders'
import OrderDetails from '@/pages/OrderDetails'
import Wishlist from '@/pages/Wishlist'
import Addresses from '@/pages/Addresses'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'
import Forbidden from '@/pages/Forbidden'

import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminProductForm from '@/pages/admin/AdminProductForm'
import AdminCategories from '@/pages/admin/AdminCategories'
import AdminBrands from '@/pages/admin/AdminBrands'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminOrderDetails from '@/pages/admin/AdminOrderDetails'
import AdminPaymentMethods from '@/pages/admin/AdminPaymentMethods'
import AdminCoupons from '@/pages/admin/AdminCoupons'

import SellerLayout from '@/pages/seller/SellerLayout'
import SellerDashboard from '@/pages/seller/SellerDashboard'
import SellerProducts from '@/pages/seller/SellerProducts'
import SellerInventory from '@/pages/seller/SellerInventory'
import SellerOrders from '@/pages/seller/SellerOrders'
import SellerOrderDetails from '@/pages/seller/SellerOrderDetails'
import SellerCreateOrder from '@/pages/seller/SellerCreateOrder'

/** Returns to the top of the page whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  useEffect(() => {
    dispatch(loadSession())
    dispatch(fetchCategories())

    // A token rejected mid-session should clear local state, not leave a ghost login.
    setUnauthorizedHandler(() => {
      dispatch(sessionExpired())
      dispatch(resetCart())
      dispatch(resetWishlist())
      notify.warning('Your session has expired. Please log in again.')
    })
  }, [dispatch])

  // Cart and wishlist only exist for customers, so load them once one signs in.
  useEffect(() => {
    if (user?.role === 'customer') {
      dispatch(fetchCart())
      dispatch(fetchWishlist())
    }
  }, [dispatch, user?.id, user?.role])

  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/forbidden" element={<Forbidden />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:orderNumber" element={<OrderDetails />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/addresses" element={<Addresses />} />
          </Route>

          {/* Sellers have their own panel, so the admin console is admin-only. */}
          <Route element={<ProtectedRoute roles={['seller']} />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="orders/new" element={<SellerCreateOrder />} />
              <Route path="orders/:id" element={<SellerOrderDetails />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="products/new" element={<AdminProductForm listPath="/seller/products" />} />
              <Route
                path="products/:id/edit"
                element={<AdminProductForm listPath="/seller/products" />}
              />
              <Route path="inventory" element={<SellerInventory />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id/edit" element={<AdminProductForm />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetails />} />
              <Route path="payment-methods" element={<AdminPaymentMethods />} />
              <Route path="coupons" element={<AdminCoupons />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        theme="light"
      />
    </>
  )
}
