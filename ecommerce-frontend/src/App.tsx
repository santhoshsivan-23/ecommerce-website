import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { loadSession, sessionExpired } from '@/features/auth/authSlice'
import { fetchCategories } from '@/features/catalog/categorySlice'
import { fetchCart, resetCart } from '@/features/cart/cartSlice'
import { fetchWishlist, resetWishlist } from '@/features/wishlist/wishlistSlice'
import { syncTaxSettings } from '@/features/admin/taxSettingsSlice'
import { setUnauthorizedHandler } from '@/api/client'
import { notify } from '@/utils/notify'

import { Layout } from '@/components/layout/Layout'
import { AdminGuestRoute, GuestRoute, ProtectedRoute, SellerGuestRoute } from '@/components/routing/ProtectedRoute'

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

import AdminRegister from '@/pages/admin/AdminRegister'
import AdminLogin from '@/pages/admin/AdminLogin'
import SellerLogin from '@/pages/seller/SellerLogin'

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
import AdminCustomers from '@/pages/admin/AdminCustomers'
import AdminCustomerDetails from '@/pages/admin/AdminCustomerDetails'
import AdminSellers from '@/pages/admin/AdminSellers'
import AdminSellerDetails from '@/pages/admin/AdminSellerDetails'
import AdminInventory from '@/pages/admin/AdminInventory'
import AdminAttributes from '@/pages/admin/AdminAttributes'
import AdminReports from '@/pages/admin/AdminReports'
import AdminAnalytics from '@/pages/admin/AdminAnalytics'
import AdminTaxSettings from '@/pages/admin/AdminTaxSettings'

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

    // Keep tax settings synchronized across multiple browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'admin_tax_settings') {
        dispatch(syncTaxSettings())
      }
    }
    window.addEventListener('storage', handleStorage)

    // A token rejected mid-session should clear local state, not leave a ghost login.
    setUnauthorizedHandler(() => {
      dispatch(sessionExpired())
      dispatch(resetCart())
      dispatch(resetWishlist())
      notify.warning('Your session has expired. Please log in again.')
    })

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
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

          <Route element={<AdminGuestRoute />}>
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/login" element={<AdminLogin />} />
          </Route>

          <Route element={<SellerGuestRoute />}>
            <Route path="/seller/login" element={<SellerLogin />} />
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

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Dedicated Seller Portal (No Customer Header/Footer) */}
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

        {/* Dedicated Admin Console (No Customer Header/Footer) */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetails />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="sellers/:id" element={<AdminSellerDetails />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attributes" element={<AdminAttributes />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
            <Route path="payment-methods" element={<AdminPaymentMethods />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="tax-settings" element={<AdminTaxSettings />} />
          </Route>
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
