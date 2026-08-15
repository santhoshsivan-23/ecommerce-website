import { NavLink } from 'react-router-dom'
import { FiHome, FiPackage, FiMapPin, FiHeart } from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/orders', label: 'My Orders', icon: FiPackage, end: false },
  { to: '/addresses', label: 'My Addresses', icon: FiMapPin, end: false },
  { to: '/wishlist', label: 'My Wishlist', icon: FiHeart, end: false },
]

export function MobileBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 lg:hidden shadow-lg">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-zinc-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
