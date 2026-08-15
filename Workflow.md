# Part II — Complete Application Workflow

A step-by-step, user-facing description of how a user navigates the application across all four phases. These are functional workflows — what the user sees and does on each screen — not code-level flows.

---

## Phase 1 — Customer Shopping

### 1.1 Registration

```
Open ShopKart home page
  ↓
Click "Register" / "Sign Up"
  ↓
Enter name
  ↓
Enter email
  ↓
Enter password (min 6 characters, must contain a number)
  ↓
Enter phone (optional)
  ↓
Click Register
  ↓
Account created → automatically logged in
  ↓
Redirected to Home / Dashboard
```

### 1.2 Login

```
Open ShopKart home page
  ↓
Click "Login"
  ↓
Enter email
  ↓
Enter password
  ↓
Click Login
  ↓
System verifies credentials
  ↓
Success → Dashboard / Home
  OR
Error → "Invalid email or password"
  OR
Error → "This account has been disabled"
```

### 1.3 Home / Dashboard

```
Logged in as Customer
  ↓
Home page displays:
  • Category tiles (Electronics, Fashion, etc.)
  • Featured products carousel
  • Latest arrivals
  ↓
Click a category → Category listing page
  OR
Click a product → Product details page
  OR
Click "Shop Now" → All products listing
```

### 1.4 Category Browsing

```
Home page
  ↓
Click a top-level category (e.g. "Electronics")
  ↓
See subcategories (Smartphones, Laptops, Headphones, etc.)
  ↓
Click a subcategory (e.g. "Smartphones")
  ↓
Product listing page filtered to that category
```

### 1.5 Product Listing — Search & Filter

```
Product listing page
  ↓
Search bar: type product name, brand, or keyword
  ↓
Results update (searches name, description, brand, category)
  ↓
Apply filters from the sidebar:
  • Category
  • Brand (multi-select)
  • Price range (min – max)
  • In stock only
  • Size (multi-select)
  • Colour (multi-select)
  • Minimum rating
  • Featured only
  ↓
Sort by: newest, oldest, price low→high, price high→low, popular, rating, name A→Z
  ↓
Pagination: navigate between pages
  ↓
Click a product card → Product details page
```

### 1.6 Product Details

```
Product listing
  ↓
Click on a product card
  ↓
Product details page shows:
  • Image gallery (click to enlarge)
  • Product name, brand, category
  • Price and discount price (if any)
  • Stock availability label
  • Variant pickers (size, colour) — unavailable combos are greyed out
  • Quantity stepper (bounded by real stock)
  • Specifications table
  • Related products from the same category
  ↓
Click "Add to Wishlist" (heart icon) → saved to wishlist
  OR
Select variant (if any) → Click "Add to Cart" → added to cart
  OR
Click a related product → its detail page
```

### 1.7 Wishlist

```
Click wishlist icon (navbar) or navigate to Wishlist page
  ↓
See all saved products with current price, stock and image
  ↓
Click "Move to Cart" on an item
  ↓
Item removed from wishlist and added to cart
  OR
Click remove (X) → item removed from wishlist
  OR
Click "Clear Wishlist" → all items removed
  OR
Click a product → its detail page
```

### 1.8 Cart

```
Click cart icon (navbar) or navigate to Cart page
  ↓
See all cart items:
  • Product name, image, variant, price
  • Quantity stepper (adjust up/down, bounded by stock)
  • Line total
  • Unavailable items flagged with issues ("Only 2 left in stock")
  ↓
Change quantity → totals recalculate live
  ↓
Remove an item (X) → item removed, totals update
  ↓
Enter coupon code → Click "Apply"
  ↓
Coupon validated → discount reflected in totals
  OR Coupon error shown ("This coupon has expired", etc.)
  ↓
View price breakdown:
  • Subtotal (original prices)
  • Product discount
  • Coupon discount
  • Delivery charge (free above ₹500)
  • Total
  ↓
Click "Clear Cart" → all items removed
  OR
Click "Proceed to Checkout" → Checkout page
```

### 1.9 Address Management

```
Navigate to Addresses page (profile or during checkout)
  ↓
See saved addresses (default first)
  ↓
Click "Add New Address"
  ↓
Enter: full name, phone, address line 1, address line 2, landmark, city, state, postal code, country, label (home/work/other)
  ↓
Optionally mark as default
  ↓
Click Save → address added
  ↓
Edit an existing address → update fields → Save
  ↓
Set a different address as default → old default is cleared
  ↓
Delete an address → if it was the default, another is promoted
```

---

## Phase 2 — Checkout & Orders

### 2.1 Checkout

```
Cart page → Click "Proceed to Checkout"
  ↓
Checkout page loads (server-priced: cart, addresses, payment methods)
  ↓
Step 1: Select delivery address
  • Choose from saved addresses
  • Or add a new address
  ↓
Step 2: Select payment method
  • Cash on Delivery
  • Google Pay
  • PhonePe
  • (any active method the admin has configured)
  ↓
Step 3: Review order
  • Items with quantities, prices, variant labels
  • Full price breakdown (subtotal, product discount, coupon discount, delivery, total)
  • Coupon field (enter and apply, or shows already applied)
  • Customer note (optional, max 500 characters)
  ↓
Click "Place Order"
  ↓
System re-validates stock, address, payment method and coupon from the database
  ↓
Order placed successfully
  ↓
Cart cleared
  ↓
Stock decremented
  ↓
Order confirmation page with order number (e.g. ORD-20260812-00221)
```

### 2.2 Payment Status Behaviour

```
Payment method selected at checkout
  ↓
If Google Pay / PhonePe (settlesImmediately = true):
  → Payment status = "paid" immediately
  ↓
If Cash on Delivery (settlesImmediately = false):
  → Payment status = "pending"
  → Settled automatically when order is marked "delivered"
```

### 2.3 Order History

```
Navigate to "My Orders" page
  ↓
See all orders:
  • Order number, date, total, status, payment status
  • Items with images, names, quantities, prices
  ↓
Filter by status (pending, confirmed, processing, shipped, delivered, cancelled)
  ↓
Pagination through order pages
  ↓
Click an order → Order detail page
```

### 2.4 Order Tracking

```
Order detail page
  ↓
See full order information:
  • Order number, date placed
  • Items with product images, names, variants, quantities, prices
  • Delivery address
  • Payment method and payment status
  • Full price breakdown
  • Customer note
  ↓
Status timeline:
  Order Placed → Confirmed → Processing → Shipped → Delivered
  Each step shows when it happened and who advanced it
  ↓
If cancelled: shows cancel reason instead of remaining steps
```

### 2.5 Order Cancellation

```
Order detail page (order status is "pending" or "confirmed")
  ↓
Click "Cancel Order"
  ↓
Enter cancellation reason (optional, defaults to "Cancelled by customer")
  ↓
Confirm cancellation
  ↓
Order status → "cancelled"
  ↓
Stock returned to inventory
  ↓
If payment was "paid" → payment status → "refunded"
  ↓
Note: Orders that are "processing", "shipped" or "delivered" cannot be cancelled online
```

### 2.6 Profile Management

```
Click avatar / profile icon
  ↓
View profile: name, email, phone, avatar
  ↓
Edit profile: change name, phone, avatar
  ↓
Change password: enter current password → enter new password → Save
  ↓
New token issued (session survives)
```

### 2.7 Logout

```
Click "Logout"
  ↓
Auth cookie cleared
  ↓
Token removed from client
  ↓
Redirected to login page
```

---

## Phase 3 — Seller System

### 3.1 Seller Login

```
Open ShopKart login page
  ↓
Enter seller email (e.g. seller@shop.com)
  ↓
Enter password
  ↓
Click Login
  ↓
System detects role = "seller"
  ↓
Redirected to Seller Dashboard (/seller)
```

### 3.2 Seller Dashboard

```
Seller Dashboard loads
  ↓
Select date range: today, this week, this month, or custom from/to
  ↓
Dashboard displays:
  • Total products (active, out-of-stock, low-stock)
  • Total orders (pending, shipped, completed, cancelled)
  • Revenue and units sold
  • Low-stock watchlist
  ↓
Revenue counts only this seller's order lines
  ↓
Click "View Inventory" → Inventory page
  OR
Click "View Orders" → Orders page
  OR
Click a low-stock product → Inventory adjustment
```

### 3.3 Seller Product Management

```
Navigate to "My Products"
  ↓
See own product listing with search
  ↓
Products show: name, category, brand, price, stock, status (active/disabled)
  ↓
Click "Add Product"
  ↓
Product form:
  • Name, description, price, discount price
  • Category (dropdown), brand (dropdown)
  • Stock quantity
  • Images (URLs)
  • Specifications (key-value pairs)
  • Variants (size, colour, SKU, stock, price override)
  • Active / Featured toggles
  ↓
Save → product created, owned by this seller
  ↓
Edit a product → same form, pre-filled
  ↓
Enable / Disable → product shows/hides from storefront
  ↓
Delete → product removed (past order lines survive)
```

### 3.4 Seller Inventory Management

```
Navigate to "Inventory"
  ↓
See products sorted by stock (lowest first)
  ↓
Filter: search by name, stock level (in stock / low stock / out of stock)
  ↓
Each product shows: name, current stock, variants (if any), image
  ↓
Click "Adjust Stock" on a product
  ↓
Choose: relative adjustment (+10, -3) or absolute value (set to 50)
  ↓
Optionally target a specific variant
  ↓
Enter reason (optional)
  ↓
Save → stock updated, movement recorded in ledger
  ↓
Click "View History" → stock movement timeline
  ↓
History shows: adjustments, order sales, cancellation restocks
  Each entry: change, resulting stock, reason, who, when
```

### 3.5 Seller Customer Orders

```
Navigate to "Orders"
  ↓
See orders containing this seller's products
  ↓
Filter: search (order number, customer name, phone), status, payment status, source (customer/seller), date range
  ↓
Each order shows:
  • Order number, customer, date, status
  • Only this seller's items (not other sellers' lines)
  • Seller's subtotal and item count
  ↓
Click an order → Order detail page
  ↓
Detail shows: items, customer info, delivery address, payment method, status timeline
```

### 3.6 Seller Order Processing

```
Order detail page (seller is the sole seller for this order)
  ↓
See allowed next statuses
  ↓
Click "Confirm" / "Processing" / "Ship" / "Deliver" / "Cancel"
  ↓
Enter optional note
  ↓
Status advanced:
  pending → confirmed → processing → shipped → delivered
  ↓
On delivery: cash orders auto-settle (payment status → "paid")
  ↓
On cancellation: stock returned, payment refunded if applicable
  ↓
Note: Shared orders (multi-seller) → status locked, admin must advance
  → "This order also contains other sellers' products, so only an admin can change its status"
```

### 3.7 Seller Direct Order Creation

```
Navigate to "Create Order"
  ↓
Step 1: Select Customer
  • Search by name, email or phone
  • Select from results (customer with their saved addresses)
  ↓
Step 2: Select Products
  • Search own catalogue
  • Select products, choose variants, set quantities
  • Each change re-prices the draft via the server
  ↓
Step 3: Delivery Address
  • Choose from customer's saved addresses
  • Or enter a new address manually
  ↓
Step 4: Payment Method
  • Select from active methods (Cash, Google Pay, PhonePe, etc.)
  ↓
Step 5: Review
  • All items with prices, quantities
  • Full price breakdown
  • Optionally apply a coupon
  • Enter a customer note
  ↓
Click "Create Order"
  ↓
Order created → stock decremented → order number assigned
  ↓
Order source recorded as "seller" with createdById
```

### 3.8 Seller Sales & Revenue

```
Seller Dashboard
  ↓
View revenue: sum of this seller's order lines (not the whole order total)
  ↓
View units sold
  ↓
Shared orders: each seller sees only their own share
  ↓
Date range filters apply to all figures
```

---

## Phase 4 — Admin & Analytics

### 4.1 Admin Login

```
Open ShopKart login page
  ↓
Enter admin email (admin@shop.com)
  ↓
Enter password
  ↓
Click Login
  ↓
System detects role = "admin"
  ↓
Redirected to Admin Dashboard (/admin)
```

### 4.2 Admin Dashboard

```
Admin Dashboard loads
  ↓
Select date range: today, this week, this month, this year, all time, or custom from/to
  ↓
Dashboard displays:
  • Customers: total, active, inactive, joined in range
  • Sellers: total, active, inactive, joined in range
  • Products: total, active, disabled, out-of-stock, low-stock, inventory value
  • Orders: total, pending, shipped, completed, cancelled, by status
  • Sales: total sales, revenue, units sold, average order value
  • By source: customer vs seller split (count + value)
  • By payment method: orders + value per method
  • Low-stock alerts
  • Recent orders
  • Top-selling products
```

### 4.3 Customer Management

```
Navigate to "Customers"
  ↓
See customer list: name, email, phone, status, order count, total spent, last order
  ↓
Search by name, email, or phone
  ↓
Filter: active / inactive
  ↓
Sort: newest, name, orders (desc), spend (desc)
  ↓
Click a customer → Customer detail page
  ↓
Detail shows:
  • Profile and contact info
  • Saved addresses
  • Order counts by status
  • Purchase history (top products by quantity and spend)
  ↓
Click "View Orders" → customer's order list
  ↓
Toggle status: Activate / Deactivate
  → Deactivated customer cannot sign in (token rejected immediately)
```

### 4.4 Seller Management

```
Navigate to "Sellers"
  ↓
See seller list: name, email, status, products, orders, sales, revenue
  ↓
Search, filter (active/inactive), sort (sales, revenue, orders, products, newest, name)
  ↓
Click "Add Seller"
  ↓
Enter: name, email, password, phone
  ↓
Seller account created (sellers cannot self-register)
  ↓
Click a seller → Seller detail page
  ↓
Detail shows:
  • Full performance metrics (products, orders, units, sales, revenue)
  • Top-selling products
  • Product categories breakdown
  • Recent orders
  ↓
Edit seller details / reset password
  ↓
Toggle status: Activate / Deactivate
  → Deactivated seller cannot sign in; their products stay listed until disabled
  ↓
Click "View Products" → seller's product catalogue
  ↓
Click "View Orders" → seller's orders (with their share of each)
```

### 4.5 Admin Product Management

```
Navigate to "Products"
  ↓
See all products across every seller
  ↓
Search, filter by category/seller, sort
  ↓
Each row shows: name, seller, category, brand, price, stock, status
  ↓
Click "Add Product"
  ↓
Product form (same as seller form) + "Sold by" field to assign the owning seller
  ↓
Edit any product → change details, reassign to another seller
  ↓
Enable / Disable → product shows/hides from storefront
  ↓
Delete → product removed
```

### 4.6 Category, Subcategory & Brand Management

```
Navigate to "Categories"
  ↓
See category tree: top-level categories with their subcategories
  ↓
Add top-level category: name, description, image, sort order
  ↓
Add subcategory: name, parent category, image
  • Categories nest one level deep only
  ↓
Edit a category → change name, description, image, status, sort order
  ↓
Disable a category → products stay but category hidden from navigation
  ↓
Delete a category:
  • Blocked if it has subcategories ("Remove or reassign the subcategories first")
  • Blocked if products use it ("3 product(s) still use this category")
  ↓
Navigate to "Brands"
  ↓
Add / Edit / Delete brands
  • Delete blocked if products reference it
```

### 4.7 Order Management

```
Navigate to "Orders"
  ↓
See every order (customer and seller sourced)
  ↓
Search: order number, customer name, email, phone
  ↓
Filter: status, payment status, payment method, order source, seller, customer, date range
  ↓
Sort: newest, oldest, total (desc/asc)
  ↓
Each order shows: order number, customer, total, status, payment, source, date
  ↓
Click an order → Order detail page
  ↓
Detail shows:
  • Customer info, delivery address
  • Items with seller per line
  • Source (customer checkout vs seller direct) and who created it
  • Payment method, payment status
  • Full price breakdown
  • Status timeline with who advanced each step
  ↓
Advance status: pending → confirmed → processing → shipped → delivered
  ↓
Cancel an order (with reason)
  → Stock returned, payment refunded if applicable
  ↓
Override payment status: mark as paid, pending, failed, or refunded
```

### 4.8 Payment Method Management

```
Navigate to "Payment Methods"
  ↓
See all methods: Cash on Delivery, Google Pay, PhonePe, UPI, etc.
  ↓
Each shows: name, code, description, status, settlesImmediately flag
  ↓
Add new method: name, code, description, instructions, icon, active flag, sort order
  ↓
Edit a method → update details
  ↓
Enable / Disable → disabled methods vanish from checkout
  ↓
Delete → blocked if orders reference it; use disable instead
  ↓
Cash on Delivery is permanent: cannot be disabled or deleted
```

### 4.9 Coupon Management

```
Navigate to "Coupons"
  ↓
See all coupons: code, type (percent/fixed), value, min order, usage count, status
  ↓
Add coupon:
  • Code, description, discount type (percent/fixed), discount value
  • Min order value, max discount cap
  • Start date, expiry date
  • Usage limit, active flag
  ↓
Edit a coupon → update any field
  ↓
Delete → blocked if orders have used it ("Deactivate it instead")
```

### 4.10 Inventory Overview

```
Navigate to "Inventory"
  ↓
See stock across every seller
  ↓
Filter: search, seller, category, stock level (in/low/out)
  ↓
Portfolio summary: total products, out-of-stock, low-stock, total units, inventory value
  ↓
Each product shows: name, seller, category, stock, last movement date
  ↓
Click "Adjust Stock" → same form as seller (relative or absolute)
  → Movement recorded with the admin who made it
  ↓
Click "View History" → full stock ledger for that product
```

### 4.11 Sales Reports

```
Navigate to "Reports" → "Sales"
  ↓
Select date range and grouping (day / week / month / year)
  ↓
See chart/table of: orders, units sold, sales, revenue, discount per period
  ↓
Totals row: overall orders, units, sales, revenue, average order value
  ↓
Optionally narrow to one seller
```

### 4.12 Product Reports

```
Navigate to "Reports" → "Products"
  ↓
Best-selling products: ordered by units sold (desc)
  • Each shows: name, seller, category, units sold, revenue, stock
  ↓
Low-selling products: ordered by units sold (asc)
  • Products that sold nothing in the window still appear
  ↓
Filter by seller, category, search
```

### 4.13 Seller Reports

```
Navigate to "Reports" → "Sellers"
  ↓
See every seller side by side:
  • Products, orders, units sold, sales, revenue
  • Pending, completed, cancelled counts
  ↓
Sort by sales, revenue, orders, products, name
  ↓
Totals row: combined across all sellers
```

### 4.14 Payment Reports

```
Navigate to "Reports" → "Payments"
  ↓
See breakdown by payment method:
  • Orders, sales, revenue per method
  • Split by payment status (paid, pending, refunded, failed)
  ↓
Overall payment status distribution
```

### 4.15 Order-Source Reports

```
Navigate to "Reports" → "Order Source"
  ↓
Customer checkouts vs seller direct orders:
  • Order count, sales, revenue, cancelled count, share (%)
  ↓
Which seller raised the direct orders (name, count, sales)
```

### 4.16 Business Analytics

```
Navigate to "Analytics"
  ↓
Select date range and grouping
  ↓
Charts and tables:
  • Sales trend (line chart: sales/revenue per period)
  • Order trend (bar chart: orders per period)
  • Order status distribution (doughnut/pie)
  • Payment method usage (bar)
  • Order source split (customer vs seller)
  • Customer growth (running total over time)
  • Seller growth (running total over time)
  • Top-selling products (rank)
  ↓
Each chart has a data table that can be toggled open
```

### 4.17 Admin Permissions & Security

```
All admin routes:
  • Protected by restrictTo('admin') middleware
  • Sellers and customers get 403 "This action is restricted to: admin."
  ↓
All seller routes:
  • Protected by restrictTo('seller')
  • Admins and customers get 403
  ↓
Ownership enforcement:
  • Sellers can only access their own products, inventory, orders
  • One seller editing another's product → 403 "This product belongs to another seller"
  ↓
Account deactivation:
  • Deactivated accounts are rejected on the NEXT request (not just at login)
  • "This account has been disabled"
  ↓
Token validation:
  • Expired or invalid token → 401 "Your session is invalid or has expired"
  • No token → 401 "You are not logged in"
```

### 4.18 Logout

```
Any role (customer, seller, admin)
  ↓
Click "Logout"
  ↓
POST /api/auth/logout
  ↓
Auth cookie cleared
  ↓
Client removes stored token
  ↓
Redirected to login page
  ↓
All protected routes now return 401
```

---
