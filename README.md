# ShopKart — E-Commerce (Phase 1 + Phase 2 + Phase 3)

Customer shopping, product management, checkout, orders and a seller panel, built as two apps:

- **`ecommerce-backend`** — Express 5 REST API on MySQL/MariaDB via Sequelize
- **`ecommerce-frontend`** — React 19 + TypeScript (`.tsx`), Redux Toolkit, React Router, Tailwind CSS, react-toastify

---

## Prerequisites

- Node.js 20+
- A running MySQL or MariaDB server (XAMPP, WAMP, Laragon or a standalone install)

The API creates the database itself; you only need the server running and valid credentials.

## Setup

```bash
# 1. Backend
cd ecommerce-backend
npm install
cp .env.example .env      # then edit DB_USER / DB_PASSWORD if yours differ
npm run seed              # creates the schema and demo data

# 2. Frontend
cd ../ecommerce-frontend
npm install
```

`.env` defaults to a local server on `127.0.0.1:3306` with user `root` and an empty password, which is the usual XAMPP setup.

## Running

Two terminals:

```bash
cd ecommerce-backend  && npm run dev     # http://localhost:5000
cd ecommerce-frontend && npm run dev     # http://localhost:5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to port 5000, so there is no CORS setup to do locally.

## Demo accounts

| Role     | Email                | Password       | Owns                                 |
| -------- | -------------------- | -------------- | ------------------------------------ |
| Customer | `customer@shop.com`  | `Customer@123` | —                                    |
| Admin    | `admin@shop.com`     | `Admin@123`    | everything                           |
| Seller   | `seller@shop.com`    | `Seller@123`   | Aurora, NovaTech, Vertex, UrbanEdge   |
| Seller   | `seller2@shop.com`   | `Seller@123`   | Zenith, PeakForm, CasaLuxe, Lumen     |

The login screen has buttons that fill these in. Two sellers exist so the ownership
rules are visible: neither can see or touch the other's products, inventory or orders.

Demo coupons: **WELCOME10** (10% off, minimum ₹1,000, capped at ₹500) and **FLAT200** (₹200 off, minimum ₹2,000).

`npm run seed` rebuilds the schema from scratch — it drops existing tables, so don't run it against data you want to keep.

---

## The full flow

Customer:

```
Register / Login → Home → Categories → Product listing → Search / Filter
   → Product details → Wishlist / Cart → Manage quantity → Manage address
   → Checkout → Select address → Select payment → Review → Place order
   → Stock updated → Order history → Track order
```

Seller:

```
Seller login → Dashboard → Manage products → Manage inventory
   → View customer orders → Process orders
   OR
   → Create direct order → Select customer → Select products → Select payment
   → Order created → Stock updated → Sales updated
```

## What Phase 1 covers

**Authentication & roles** — Registration, login, logout, profile editing and password change. JWT is issued as both an httpOnly cookie and a bearer token. Three roles: `customer`, `seller`, `admin`. Route guards run on both sides: `restrictTo()` middleware on the API, `<ProtectedRoute roles={[...]}>` in the client. Customers cannot reach admin screens, and staff accounts cannot use the cart or wishlist.

**Catalogue** — Categories nest one level deep (category → subcategory). Products carry images, variants (size/colour with their own stock and optional price override), a specification list, stock, price and an optional discount price. Admins can create, edit, delete, and enable/disable products; disabled products disappear from the storefront immediately but stay visible in the admin list.

**Browsing** — Home page with categories, featured products and latest arrivals. Listing page with pagination and combinable filters (category, brand, price range, availability, size, colour, rating) plus sorting by newest, popularity, price ascending/descending, rating and name. Search spans product name, description, brand name and category name, with a proper empty state when nothing matches. All filter state lives in the URL, so views are shareable and the back button works.

**Product details** — Image gallery, pricing with discount, live stock label, variant pickers that grey out unavailable combinations, quantity stepper bounded by real stock, specifications table, and related products.

**Wishlist** — Add, remove, list, and move an item into the cart. Duplicates are blocked by a unique index, not just a check.

**Cart** — Add, remove, change quantity, clear. Every write revalidates that the product is active, the variant belongs to the product and is active, and the quantity fits available stock. Lines that become unbuyable are flagged in place rather than silently dropped.

**Addresses** — Add, edit, delete, and choose a default. Exactly one default is maintained at all times; deleting the default promotes another.

## What Phase 2 covers

**Checkout** — A three-step review page: delivery address, payment method, then the items with their quantities and prices, alongside the full money breakdown. Nothing is charged until the customer confirms.

**Order calculation** — One calculator (`utils/pricing.js` + `services/cartService.js`) prices the cart, the checkout preview and the order itself, so the three can never disagree:

```
product total → apply product discounts → apply coupon → add delivery charge → final total
```

The server recomputes this from the database when the order is placed and ignores whatever the client sent. Delivery is free above ₹500.

**Payment methods** — Managed by the admin. **Cash is permanent**: the API refuses to disable or delete it, and the admin UI disables those controls, so there is always at least one way to pay. Admins can add, edit, enable/disable and delete other methods (Google Pay, PhonePe and UPI are seeded). Customers only ever receive active methods — disable PhonePe and it vanishes from checkout on the next load.

**Payment status** — There is no payment gateway in this phase, so the chosen method alone decides what gets recorded. Each method carries a `settlesImmediately` flag: Google Pay and PhonePe record `payment_status = paid` on placement, while cash records `pending` and is settled automatically when the order is marked delivered.

**Order creation** — Placing an order snapshots everything that must survive later catalogue edits: product name, brand, variant, SKU, image, unit price and original price per line, plus the delivery address, payment method name and code, and every total. Orders get a readable reference like `ORD-20260811-00007`.

**Stock update** — Order creation runs in one transaction that locks the product and variant rows (`SELECT … FOR UPDATE`), re-checks stock against the locked values, then decrements it. Two people checking out the last unit at once cannot both succeed. Cancelling an order returns the stock.

**Order history and details** — Customers get a filterable list of their orders and a detail page with items, prices, address, payment method, payment status, order status and totals.

**Order tracking** — `Order placed → Confirmed → Processing → Shipped → Delivered`, drawn from a recorded status history so each step shows when it happened. Cancelled orders show the reason instead.

**Admin order management** — List every order with search (order number, customer name, email, phone) and filters (order status, payment status, payment method, date range), plus sorting. Open an order to see the customer, items, payment and history, advance its status, or cancel it. Status moves are validated server-side: an order cannot skip from pending to delivered, and delivered or cancelled orders are terminal.

**Coupons** — Percentage or fixed-amount, with minimum order value, maximum discount cap, expiry, usage limit and an active flag. Validated when applied *and* again when the order is placed, so an expired or exhausted code cannot slip through. Managed from the admin console.

## What Phase 3 covers

**Seller panel** — Sellers sign in and land at `/seller`, a workspace entirely separate from the admin console. Every screen is scoped to the signed-in seller: their products, their inventory, their orders, their revenue. The API enforces this, not just the UI — `assertCanManage()` guards every product write, and one seller attempting to edit, disable, delete or restock another's product gets a 403.

**Dashboard** — Total and active products, total/pending/completed orders, units sold, revenue, out-of-stock and low-stock counts, plus a low-stock watchlist. Filterable by today, this week, this month or a custom date range. Revenue counts only the seller's own order lines, so on a shared order each seller sees their own share rather than the whole basket.

**Product management** — Sellers add, edit, delete and enable/disable their own listings with the same form the admin uses, including images, pricing, discounts, category, variants, SKUs and specifications. Anything a seller creates is owned by them automatically.

**Inventory** — A stock-focused view with search and in/low/out filters. Stock can be moved relatively (`+10`, `-3`) or set to an exact value, per product or per variant, with an optional reason. Every change is refused if it would take stock negative.

**Stock history** — `stock_movements` is an append-only ledger. Opening stock, manual adjustments, sales and cancellation restocks all write a row recording the change, the resulting level, the reason and who made it. That ledger is what the seller's history dialog shows.

**Customer orders** — An order reaches a seller when it contains one of their products. They see the order number, customer, delivery address, payment method and status — but only their own lines, with their own subtotal. On a shared order the other seller's items are never exposed.

**Order processing** — Sellers advance their orders through `pending → confirmed → processing → shipped → delivered`, with the same server-side transition rules the admin uses; skipping steps is rejected. On a shared order the status is locked to the admin, since advancing it would speak for the other seller too — the UI explains this rather than silently hiding the buttons.

**Direct orders** — A seller can raise an order themselves: pick a customer, search their own catalogue, choose variants and quantities, review, pick a payment method, and create. Every draft change is priced by the server, so the total shown is the total charged.

**Order source** — Orders record `orderSource` (`customer` or `seller`) plus `createdById`, so storefront checkouts and seller-raised orders stay distinguishable everywhere, and the seller's order list can filter on it.

**Shared rules** — Seller orders reuse the exact Phase 2 machinery: the same calculation, the same `SELECT … FOR UPDATE` stock locking, the same payment-status behaviour (cash pending, Google Pay and PhonePe paid). `services/orderService.js` holds that logic once and both checkout paths call into it.

### Data relationships

```
Customer ──< Address
Customer ──< WishlistItem >── Product
Customer ──1 Cart ──< CartItem >── Product / ProductVariant
Customer ──< Order ──< OrderItem >── Product / ProductVariant
                └──< OrderStatusHistory
Order >── PaymentMethod
Order >── Coupon
Order >── Address (snapshotted onto the order)
Seller   ──< Product ──< OrderItem   (sellerId is snapshotted onto each line)
Seller   ──< StockMovement            (append-only stock ledger)
Seller   ──< Order                    (direct orders, via createdById)
Category ──< Category (subcategories)
Category ──< Product >── Brand
Product  ──< ProductImage
Product  ──< ProductVariant
```

---

## API reference

All responses share the shape `{ success, message?, data, errors? }`.

### Auth — `/api/auth`

| Method  | Path               | Access    | Purpose                    |
| ------- | ------------------ | --------- | -------------------------- |
| `POST`  | `/register`        | public    | Create a customer account  |
| `POST`  | `/login`           | public    | Log in                     |
| `POST`  | `/logout`          | public    | Clear the auth cookie      |
| `GET`   | `/me`              | signed in | Current profile            |
| `PATCH` | `/me`              | signed in | Update name/phone/avatar   |
| `PATCH` | `/change-password` | signed in | Change password            |

### Catalogue

| Method   | Path                        | Access       | Purpose                                     |
| -------- | --------------------------- | ------------ | ------------------------------------------- |
| `GET`    | `/api/categories`           | public       | Category tree with subcategories            |
| `GET`    | `/api/categories/:idOrSlug` | public       | One category                                |
| `POST`   | `/api/categories`           | admin        | Create                                      |
| `PATCH`  | `/api/categories/:id`       | admin        | Update                                      |
| `DELETE` | `/api/categories/:id`       | admin        | Delete (blocked while in use)               |
| `GET`    | `/api/brands`               | public       | List brands                                 |
| `POST`   | `/api/brands`               | admin        | Create                                      |
| `PATCH`  | `/api/brands/:id`           | admin        | Update                                      |
| `DELETE` | `/api/brands/:id`           | admin        | Delete (blocked while in use)               |
| `GET`    | `/api/products`             | public       | List with search, filters, sort, pagination |
| `GET`    | `/api/products/filters`     | public       | Filter options for the sidebar              |
| `GET`    | `/api/products/:idOrSlug`   | public       | Details plus related products               |
| `POST`   | `/api/products`             | admin/seller | Create                                      |
| `PATCH`  | `/api/products/:id`         | admin/seller | Update                                      |
| `PATCH`  | `/api/products/:id/status`  | admin/seller | Enable or disable                           |
| `DELETE` | `/api/products/:id`         | admin/seller | Delete                                      |

`GET /api/products` query parameters: `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `size`, `color`, `rating`, `featured`, `sort`, `page`, `limit`, `includeInactive` (admin only).

`sort` accepts `newest`, `oldest`, `price_asc`, `price_desc`, `popular`, `rating`, `name_asc`.

### Cart, wishlist and addresses

| Method   | Path                           | Access   | Purpose                          |
| -------- | ------------------------------ | -------- | -------------------------------- |
| `GET`    | `/api/cart`                    | customer | Cart with priced lines and totals |
| `POST`   | `/api/cart/items`              | customer | Add an item                      |
| `PATCH`  | `/api/cart/items/:id`          | customer | Change quantity                  |
| `DELETE` | `/api/cart/items/:id`          | customer | Remove a line                    |
| `DELETE` | `/api/cart`                    | customer | Clear the cart                   |
| `POST`   | `/api/cart/coupon`             | customer | Validate and apply a coupon      |
| `POST`   | `/api/cart/move-from-wishlist` | customer | Move a wishlist item to the cart |
| `GET`    | `/api/wishlist`                | customer | List wishlist                    |
| `POST`   | `/api/wishlist`                | customer | Add a product                    |
| `DELETE` | `/api/wishlist/:productId`     | customer | Remove a product                 |
| `GET`    | `/api/addresses`               | customer | List addresses                   |
| `POST`   | `/api/addresses`               | customer | Add an address                   |
| `PATCH`  | `/api/addresses/:id`           | customer | Edit an address                  |
| `PATCH`  | `/api/addresses/:id/default`   | customer | Set the default                  |
| `DELETE` | `/api/addresses/:id`           | customer | Delete an address                |

### Payments, coupons and orders

| Method   | Path                                    | Access       | Purpose                                        |
| -------- | --------------------------------------- | ------------ | ---------------------------------------------- |
| `GET`    | `/api/payment-methods`                  | public       | Active methods (admins may add `?includeInactive=true`) |
| `POST`   | `/api/payment-methods`                  | admin        | Add a method                                   |
| `PATCH`  | `/api/payment-methods/:id`              | admin        | Edit a method                                  |
| `PATCH`  | `/api/payment-methods/:id/status`       | admin        | Enable or disable (refused for cash)           |
| `DELETE` | `/api/payment-methods/:id`              | admin        | Delete (refused for cash or if used)           |
| `GET`    | `/api/coupons`                          | admin        | List coupons                                   |
| `POST`   | `/api/coupons`                          | admin        | Create a coupon                                |
| `PATCH`  | `/api/coupons/:id`                      | admin        | Update a coupon                                |
| `DELETE` | `/api/coupons/:id`                      | admin        | Delete (refused if used by an order)           |
| `GET`    | `/api/orders/checkout-summary`          | customer     | Priced cart, addresses and payment options     |
| `POST`   | `/api/orders`                           | customer     | Place an order                                 |
| `GET`    | `/api/orders`                           | customer     | Order history                                  |
| `GET`    | `/api/orders/:idOrNumber`               | customer     | Order details with tracking                    |
| `PATCH`  | `/api/orders/:id/cancel`                | customer     | Cancel while pending or confirmed              |
| `GET`    | `/api/admin/orders`                     | admin        | All orders with search and filters             |
| `GET`    | `/api/admin/orders/stats`               | admin        | Counts by status and payment method, revenue   |
| `GET`    | `/api/admin/orders/:id`                 | admin        | Full order including the customer              |
| `PATCH`  | `/api/admin/orders/:id/status`          | admin        | Advance or cancel an order                     |
| `PATCH`  | `/api/admin/orders/:id/payment-status`  | admin        | Override the payment status                    |

`GET /api/admin/orders` query parameters: `q`, `status`, `paymentStatus`, `paymentMethod`, `from`, `to`, `sort`, `page`, `limit`.

Order statuses: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`.
Payment statuses: `pending`, `paid`, `failed`, `refunded`.
Order sources: `customer`, `seller`.

### Seller panel — `/api/seller`

Every route is seller-only and scoped to the signed-in seller.

| Method  | Path                                | Purpose                                                     |
| ------- | ----------------------------------- | ----------------------------------------------------------- |
| `GET`   | `/stats`                            | Dashboard counters, revenue and low-stock list               |
| `GET`   | `/inventory`                        | Stock view with search and stock-level filters               |
| `PATCH` | `/inventory/:productId`             | Adjust stock relatively or set an exact value                |
| `GET`   | `/inventory/:productId/history`     | Stock ledger for one product                                 |
| `GET`   | `/customers`                        | Customers available when raising a direct order              |
| `GET`   | `/orders`                           | Orders containing this seller's products                     |
| `GET`   | `/orders/:id`                       | One order, reduced to this seller's lines                    |
| `PATCH` | `/orders/:id/status`                | Advance or cancel (single-seller orders only)                |
| `POST`  | `/orders/quote`                     | Price a draft order before creating it                       |
| `POST`  | `/orders`                           | Create a direct order for a customer                         |

`GET /seller/stats` accepts `range` (`all`, `today`, `week`, `month`) or `from`/`to` for a custom window.
`GET /seller/orders` accepts `q`, `status`, `paymentStatus`, `source`, `from`, `to`, `page`, `limit`.
`GET /seller/inventory` accepts `q`, `stockLevel` (`in`, `low`, `out`), `page`, `limit`.

Sellers also use the shared product routes, where `GET /api/products?mine=true` scopes the
catalogue to their own listings and every write is checked against ownership.

---

## Project layout

```
ecommerce-backend/
  server.js                 boot: connect, sync, listen
  src/
    app.js                  express app and route mounting
    config/db.js            Sequelize instance, database bootstrap
    models/                 User, Category, Brand, Product, ProductImage,
                            ProductVariant, Cart, CartItem, WishlistItem,
                            Address, PaymentMethod, Coupon, Order, OrderItem,
                            OrderStatusHistory, StockMovement,
                            index.js (associations)
    services/
      orderService.js       pricing, coupons, stock locking, snapshots — the one
                            place order maths lives, shared by customer checkout
                            and seller-created orders
      cartService.js        loads a cart and hands it to orderService
    controllers/            one per resource, plus sellerController
    routes/                 express routers with express-validator rules
    middleware/             auth (protect/optionalAuth/restrictTo), error, validate
    utils/                  ApiError, asyncHandler, token, pricing, slug
    seed/seed.js            demo catalogue, accounts, payment methods, coupons

ecommerce-frontend/
  src/
    app/                    store.ts, typed hooks
    api/client.ts           axios instance, token storage, error normaliser
    features/               auth, catalog, products, cart, wishlist, address,
                            orders, payments, seller slices
    components/             layout, routing guards, product, order, ui
    pages/                  storefront pages + pages/admin/* + pages/seller/*
    types/                  shared API types
    utils/                  price/stock formatting, order labels, toast helpers
```

## Conventions worth knowing

- **State**: every server resource lives in a Redux Toolkit slice with `createAsyncThunk`. Thunks always reject with `ApiFailure` (`{ message, errors?, status? }`), so components handle failure the same way everywhere.
- **Feedback**: react-toastify for all alerts. `notifyApiError()` expands field validation errors into a readable message; `toFieldErrors()` maps the same payload onto inline form errors.
- **Prices**: MySQL returns `DECIMAL` as a string, so the models expose numeric getters. The effective price is `discountPrice` when set and non-zero, otherwise `price`. All order maths happens server-side.
- **Slugs**: generated from the name and de-duplicated with a numeric suffix, so URLs stay readable (`vertex-ultrabook-14`, `vertex-ultrabook-14-2`).
- **History integrity**: orders never join back to live catalogue rows for display. Deleting a product nulls the reference but leaves the order line intact. Order lines also snapshot `sellerId`, so a seller's order history survives a product being reassigned or removed.
- **Ownership**: seller scoping is enforced in the API, never only in the UI. `assertCanManage()` guards product writes and the `/api/seller/*` routes filter by the signed-in seller, so hiding a button is a convenience, not the control.

## Not implemented

No real payment gateway — selecting Google Pay or PhonePe records the method and marks the order paid without contacting a provider. There are also no product reviews, returns/refund workflow, invoices or shipment tracking numbers. Sellers cannot self-register: seller accounts are created by the seed or by an admin.
