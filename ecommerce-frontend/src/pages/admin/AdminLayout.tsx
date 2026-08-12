import { NavLink, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

/**
 * The admin's reach, grouped the way the console is actually used: what you
 * watch, who you manage, what you sell, and what you configure.
 */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', end: true },
      { to: '/admin/analytics', label: 'Analytics', end: false },
      { to: '/admin/reports', label: 'Reports', end: false },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/customers', label: 'Customers', end: false },
      { to: '/admin/sellers', label: 'Sellers', end: false },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/admin/orders', label: 'Orders', end: false },
      { to: '/admin/products', label: 'Products', end: false },
      { to: '/admin/inventory', label: 'Inventory', end: false },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/admin/categories', label: 'Categories', end: false },
      { to: '/admin/brands', label: 'Brands', end: false },
      { to: '/admin/attributes', label: 'Attributes', end: false },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/payment-methods', label: 'Payment methods', end: false },
      { to: '/admin/coupons', label: 'Coupons', end: false },
    ],
  },
]

export default function AdminLayout() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin console</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.name} ({user?.role}) · full visibility across every customer, seller
          and order
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[204px_1fr]">
        <nav className="card h-fit p-2" aria-label="Admin sections">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
