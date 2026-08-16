import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FiGrid,
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiUserCheck,
  FiShoppingBag,
  FiPackage,
  FiLayers,
  FiFolder,
  FiTag,
  FiList,
  FiCreditCard,
  FiPercent,
  FiMenu,
  FiX,
  FiShield,
  FiUser,
  FiKey,
  FiLogOut,
  FiChevronDown,
  FiDollarSign,
} from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { resetCart } from '@/features/cart/cartSlice'
import { resetWishlist } from '@/features/wishlist/wishlistSlice'
import { resetAddresses } from '@/features/address/addressSlice'
import { notify } from '@/utils/notify'
import { ShopNameLogo } from '@/components/ui/ShopNameLogo'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2, end: false },
      { to: '/admin/reports', label: 'Reports', icon: FiTrendingUp, end: false },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: FiUsers, end: false },
      { to: '/admin/sellers', label: 'Sellers', icon: FiUserCheck, end: false },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag, end: false },
      { to: '/admin/products', label: 'Products', icon: FiPackage, end: false },
      { to: '/admin/inventory', label: 'Inventory', icon: FiLayers, end: false },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/admin/categories', label: 'Categories', icon: FiFolder, end: false },
      { to: '/admin/brands', label: 'Brands', icon: FiTag, end: false },
      { to: '/admin/variants', label: 'Variants', icon: FiLayers, end: false },
      { to: '/admin/attributes', label: 'Attributes', icon: FiList, end: false },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/payment-methods', label: 'Payment Methods', icon: FiCreditCard, end: false },
      { to: '/admin/coupons', label: 'Coupons', icon: FiPercent, end: false },
      { to: '/admin/tax-settings', label: 'Tax Settings', icon: FiDollarSign, end: false },
    ],
  },
]

export default function AdminLayout() {
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
    notify.success('Logged out of Admin Console')
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-zinc-900">
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* INDEPENDENTLY SCROLLABLE LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-600 font-extrabold text-white text-base shadow-xs">
              <FiShield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-zinc-900">Admin Console</h2>
              <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">Business Owner</p>
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

        {/* Scrollable Navigation Options */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar-orange p-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-600 font-bold text-white text-xs">
              {user?.name?.charAt(0) || 'A'}
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
        {/* DEDICATED ADMIN TOP HEADER BAR */}
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
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 border-l border-slate-200 pl-3">Admin Control Center</span>
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
                {user?.name?.charAt(0) || 'A'}
              </div>
              <span className="hidden max-w-32 truncate sm:inline">{user?.name}</span>
              <span className="hidden rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 sm:inline-block">
                Admin
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
                  <span className="mt-1.5 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    Business Owner
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
