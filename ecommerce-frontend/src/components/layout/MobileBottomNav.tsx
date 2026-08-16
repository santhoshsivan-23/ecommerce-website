import { NavLink } from 'react-router-dom'
import { FiHome, FiPackage, FiMapPin, FiHeart, FiShoppingCart } from 'react-icons/fi'
import { useAppSelector } from '@/app/hooks'

const LEFT_NAV_ITEMS = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/orders', label: 'My Orders', icon: FiPackage, end: false },
  { to: '/addresses', label: 'My Address', icon: FiMapPin, end: false },
]

export function MobileBottomNav() {
  const cartCount = useAppSelector((state) => state.cart.summary.itemCount)
  const wishlistCount = useAppSelector((state) => state.wishlist.productIds.length)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 lg:hidden shadow-lg">
      <div className="flex items-center justify-around">
        {/* Left nav items */}
        {LEFT_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-zinc-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}

        {/* Right pair: Wishlist + Cart – equal width, shared alignment */}
        <div className="flex items-center gap-0">
          {/* Wishlist */}
          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors px-3 relative ${isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-zinc-900'
              }`
            }
          >
            <span className="relative">
              <FiHeart className="h-5 w-5" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-0.5 text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </span>
            <span>Wishlist</span>
          </NavLink>

          {/* Cart */}
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors px-3 relative ${isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-zinc-900'
              }`
            }
          >
            <span className="relative">
              <FiShoppingCart className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-0.5 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </span>
            <span>Cart</span>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
