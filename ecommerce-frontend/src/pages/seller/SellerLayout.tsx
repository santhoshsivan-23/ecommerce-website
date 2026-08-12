import { NavLink, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

const NAV_ITEMS = [
  { to: '/seller', label: 'Dashboard', end: true },
  { to: '/seller/orders', label: 'Orders', end: false },
  { to: '/seller/orders/new', label: 'Create order', end: false },
  { to: '/seller/products', label: 'My products', end: false },
  { to: '/seller/inventory', label: 'Inventory', end: false },
]

export default function SellerLayout() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Seller panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {user?.name} · you only ever see your own products and orders
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="card h-fit p-2">
          {NAV_ITEMS.map((item) => (
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
        </nav>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
