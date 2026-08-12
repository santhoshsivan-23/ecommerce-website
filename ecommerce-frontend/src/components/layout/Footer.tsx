import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-brand-600">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">S</span>
            ShopKart
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Electronics, fashion, home and fitness essentials delivered to your door.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Shop</h3>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/products" className="hover:text-brand-600">All products</Link></li>
            <li><Link to="/products?featured=true" className="hover:text-brand-600">Featured</Link></li>
            <li><Link to="/products?sort=newest" className="hover:text-brand-600">New arrivals</Link></li>
            <li><Link to="/products?sort=popular" className="hover:text-brand-600">Popular</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Account</h3>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/profile" className="hover:text-brand-600">My profile</Link></li>
            <li><Link to="/orders" className="hover:text-brand-600">My orders</Link></li>
            <li><Link to="/cart" className="hover:text-brand-600">My cart</Link></li>
            <li><Link to="/wishlist" className="hover:text-brand-600">My wishlist</Link></li>
            <li><Link to="/addresses" className="hover:text-brand-600">My addresses</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Demo accounts</h3>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>customer@shop.com / Customer@123</li>
            <li>admin@shop.com / Admin@123</li>
            <li>seller@shop.com / Seller@123</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ShopKart. Phase 1 demo build.
      </div>
    </footer>
  )
}
