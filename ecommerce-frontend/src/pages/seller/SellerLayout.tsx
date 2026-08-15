import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FiGrid,
  FiShoppingBag,
  FiPlusCircle,
  FiPackage,
  FiLayers,
  FiMenu,
  FiX,
  FiBriefcase,
  FiUser,
  FiKey,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { resetCart } from '@/features/cart/cartSlice'
import { resetWishlist } from '@/features/wishlist/wishlistSlice'
import { resetAddresses } from '@/features/address/addressSlice'
import { notify } from '@/utils/notify'
import { ShopNameLogo } from '@/components/ui/ShopNameLogo'

const NAV_ITEMS = [
  { to: '/seller', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/seller/orders', label: 'Orders', icon: FiShoppingBag, end: true },
  { to: '/seller/orders/new', label: 'Create Order', icon: FiPlusCircle, end: false },
  { to: '/seller/products', label: 'Products', icon: FiPackage, end: false },
  { to: '/seller/inventory', label: 'Inventory', icon: FiLayers, end: false },
]

export default function SellerLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await dispatch(logout())
    dispatch(resetCart())
    dispatch(resetWishlist())
    dispatch(resetAddresses())
    notify.success('Logged out of Seller Panel')
    navigate('/seller/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-zinc-900">
      {/* MOBILE OVERLAY */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* INDEPENDENTLY SCROLLABLE SELLER SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 font-extrabold text-white text-base shadow-xs">
              <FiBriefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-zinc-900">Seller Panel</h2>
              <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">Business Employee</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Options */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar-orange p-4 space-y-1.5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-orange-50/80 text-orange-600 border-r-4 border-orange-500 shadow-xs'
                      : 'text-zinc-600 hover:bg-slate-50 hover:text-zinc-900'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User Info Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-600 font-bold text-white text-xs">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-zinc-900">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* DEDICATED SELLER TOP HEADER BAR */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-zinc-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <ShopNameLogo className="text-base" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 border-l border-slate-200 pl-3">Store Operations Panel</span>
            </div>
          </div>

          {/* TOP-RIGHT PROFILE DROPDOWN */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="menu"
            >
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-orange-100 text-orange-700 font-bold text-xs">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <span className="hidden max-w-32 truncate sm:inline">{user?.name}</span>
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 sm:inline-block">
                Seller
              </span>
              <FiChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {profileDropdownOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {/* User details header */}
                <div className="border-b border-slate-100 px-3.5 py-3">
                  <p className="truncate text-sm font-bold text-zinc-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                    Business Employee
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                    role="menuitem"
                  >
                    <FiUser className="h-4 w-4 text-slate-400" />
                    Profile
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-slate-100 transition-colors"
                    role="menuitem"
                  >
                    <FiKey className="h-4 w-4 text-slate-400" />
                    Change Password
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  role="menuitem"
                >
                  <FiLogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
