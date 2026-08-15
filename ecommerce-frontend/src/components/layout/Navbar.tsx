import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  FiSearch,
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiMenu,
  FiX,
  FiLogOut,
  FiPackage,
  FiMapPin,
  FiGrid,
  FiChevronDown,
} from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { resetCart } from '@/features/cart/cartSlice'
import { resetWishlist } from '@/features/wishlist/wishlistSlice'
import { resetAddresses } from '@/features/address/addressSlice'
import { notify } from '@/utils/notify'
import { ShopNameLogo } from '@/components/ui/ShopNameLogo'

export function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const user = useAppSelector((state) => state.auth.user)
  const cartCount = useAppSelector((state) => state.cart.summary.itemCount)
  const wishlistCount = useAppSelector((state) => state.wishlist.productIds.length)
  const categories = useAppSelector((state) => state.catalog.categories)

  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  // Keep the search box in sync with the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(location.pathname === '/products' ? params.get('q') || '' : '')
    setMenuOpen(false)
    setAccountOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const term = search.trim()
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : '/products')
  }

  const handleLogout = async () => {
    await dispatch(logout())
    dispatch(resetCart())
    dispatch(resetWishlist())
    dispatch(resetAddresses())
    notify.success('You have been logged out')
    navigate('/')
  }

  const isCustomer = user?.role === 'customer'
  const isStaff = user?.role === 'admin' || user?.role === 'seller'
  const isManagementRoute =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller')

  // Global search is exclusively available to Customers/storefront visitors, never on Admin/Seller interfaces.
  const showGlobalSearch = !isStaff && !isManagementRoute
  const topCategories = categories.slice(0, 6)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="rounded-xl p-2.5 text-zinc-700 hover:bg-slate-100 lg:hidden transition-colors"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>

        {/* Brand Logo with Two-Part Configurable Shop Name */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 font-extrabold text-white text-lg shadow-sm group-hover:bg-orange-700 transition-colors">
            S
          </span>
          <ShopNameLogo className="text-lg" />
        </Link>

        {/* Global Product Search (Customers only) */}
        {showGlobalSearch ? (
          <form onSubmit={handleSearch} className="relative flex-1 max-w-xl mx-2">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="input-field pl-9 pr-3 text-xs py-2 bg-slate-50 border-slate-200 focus:bg-white"
              aria-label="Search products"
            />
          </form>
        ) : (
          <div className="flex-1" />
        )}

        {/* Navigation & Action Controls (Desktop view) */}
        <nav className="hidden lg:flex items-center gap-2">
          {isCustomer ? (
            <>
              <NavLink
                to="/wishlist"
                className={({ isActive }) =>
                  `relative rounded-xl p-2.5 transition-colors ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'text-zinc-700 hover:bg-slate-100'
                  }`
                }
                aria-label="Wishlist"
              >
                <FiHeart className="h-5 w-5" />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white shadow-xs">
                    {wishlistCount}
                  </span>
                ) : null}
              </NavLink>

              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  `relative rounded-xl p-2.5 transition-colors ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'text-zinc-700 hover:bg-slate-100'
                  }`
                }
                aria-label="Cart"
              >
                <FiShoppingCart className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white shadow-xs">
                    {cartCount}
                  </span>
                ) : null}
              </NavLink>
            </>
          ) : null}

          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-slate-50 transition-colors"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-orange-100 text-orange-700 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-28 truncate md:inline">{user.name.split(' ')[0]}</span>
                <FiChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3.5 py-2.5">
                    <p className="truncate text-sm font-bold text-zinc-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                      role="menuitem"
                    >
                      <FiUser className="h-4 w-4 text-slate-400" />
                      My profile
                    </Link>

                    {isCustomer ? (
                      <>
                        <Link
                          to="/orders"
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                          role="menuitem"
                        >
                          <FiPackage className="h-4 w-4 text-slate-400" />
                          My orders
                        </Link>
                        <Link
                          to="/addresses"
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                          role="menuitem"
                        >
                          <FiMapPin className="h-4 w-4 text-slate-400" />
                          My addresses
                        </Link>
                        <Link
                          to="/wishlist"
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                          role="menuitem"
                        >
                          <FiHeart className="h-4 w-4 text-slate-400" />
                          My wishlist
                        </Link>
                      </>
                    ) : null}

                    {user.role === 'admin' ? (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-orange-700 bg-orange-50/60 hover:bg-orange-50 transition-colors mt-1"
                        role="menuitem"
                      >
                        <FiGrid className="h-4 w-4 text-orange-600" />
                        Admin console
                      </Link>
                    ) : null}

                    {user.role === 'seller' ? (
                      <>
                        <Link
                          to="/seller"
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-orange-700 bg-orange-50/60 hover:bg-orange-50 transition-colors mt-1"
                          role="menuitem"
                        >
                          <FiGrid className="h-4 w-4 text-orange-600" />
                          Seller panel
                        </Link>
                      </>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    role="menuitem"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-outline hidden sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Sub-Navigation for Categories (Customers only) */}
      {showGlobalSearch ? (
        <div className="hidden border-t border-slate-100 bg-white lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                  isActive
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-zinc-600 hover:text-orange-600 hover:border-orange-300'
                }`
              }
            >
              All Products
            </NavLink>
            {topCategories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:text-orange-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Mobile Drawer Menu */}
      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white p-4 lg:hidden">
          <div className="mb-3 flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Categories</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <Link
            to="/products"
            className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-slate-50"
          >
            All Products
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-slate-50"
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  )
}
