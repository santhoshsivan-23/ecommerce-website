import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { resetCart } from '@/features/cart/cartSlice'
import { resetWishlist } from '@/features/wishlist/wishlistSlice'
import { resetAddresses } from '@/features/address/addressSlice'
import { notify } from '@/utils/notify'
import { CartIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon, CloseIcon } from '@/components/ui/Icons'

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

  // Keep the search box in step with the URL when navigating back and forth.
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
  const topCategories = categories.slice(0, 6)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <MenuIcon /> : <MenuIcon />}
        </button>

        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-600">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">S</span>
          <span className="hidden sm:inline">ShopKart</span>
        </Link>

        <form onSubmit={handleSearch} className="relative ml-auto flex-1 lg:ml-6 lg:max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for products, brands and more"
            className="input-field pl-9"
            aria-label="Search products"
          />
        </form>

        <nav className="flex items-center gap-1">
          {isCustomer ? (
            <>
              <NavLink
                to="/wishlist"
                className="relative hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block"
                aria-label="Wishlist"
              >
                <HeartIcon />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                ) : null}
              </NavLink>

              <NavLink
                to="/cart"
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Cart"
              >
                <CartIcon />
                {cartCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
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
                className="flex items-center gap-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <UserIcon />
                <span className="hidden max-w-24 truncate text-sm font-medium md:inline">
                  {user.name.split(' ')[0]}
                </span>
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                      {user.role}
                    </span>
                  </div>

                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                    My profile
                  </Link>

                  {isCustomer ? (
                    <>
                      <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                        My orders
                      </Link>
                      <Link to="/addresses" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                        My addresses
                      </Link>
                      <Link to="/wishlist" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                        My wishlist
                      </Link>
                    </>
                  ) : null}

                  {user.role === 'admin' ? (
                    <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                      Admin console
                    </Link>
                  ) : null}

                  {user.role === 'seller' ? (
                    <>
                      <Link to="/seller" className="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                        Seller panel
                      </Link>
                      <Link
                        to="/seller/orders/new"
                        className="block px-4 py-2 text-sm hover:bg-slate-50"
                        role="menuitem"
                      >
                        Create order
                      </Link>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    role="menuitem"
                  >
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

      <div className="hidden border-t border-slate-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-slate-600 hover:text-brand-600'
              }`
            }
          >
            All products
          </NavLink>
          {topCategories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-brand-600"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Browse</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded p-1 text-slate-500"
              aria-label="Close menu"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <Link to="/products" className="block px-4 py-2 text-sm hover:bg-slate-50">
            All products
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="block px-4 py-2 text-sm hover:bg-slate-50"
            >
              {category.name}
            </Link>
          ))}
          {isCustomer ? (
            <Link to="/wishlist" className="block px-4 py-2 text-sm hover:bg-slate-50 sm:hidden">
              Wishlist ({wishlistCount})
            </Link>
          ) : null}
          {!user ? (
            <Link to="/login" className="block px-4 py-2 text-sm hover:bg-slate-50 sm:hidden">
              Log in
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
