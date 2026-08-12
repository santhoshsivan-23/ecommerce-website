export type Role = 'customer' | 'seller' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: Role
  avatar: string | null
  isActive: boolean
  createdAt?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: number | null
  isActive: boolean
  sortOrder: number
  children?: Category[]
  parent?: Pick<Category, 'id' | 'name' | 'slug'> | null
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo: string | null
  description: string | null
  isActive: boolean
}

export interface ProductImage {
  id: number
  productId: number
  url: string
  alt: string | null
  isPrimary: boolean
  sortOrder: number
}

export interface ProductVariant {
  id: number
  productId: number
  sku: string | null
  size: string | null
  color: string | null
  price: number | null
  discountPrice: number | null
  stock: number
  image: string | null
  isActive: boolean
}

export interface Specification {
  key: string
  value: string
}

export interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  discountPrice: number | null
  stock: number
  categoryId: number
  brandId: number | null
  isActive: boolean
  isFeatured: boolean
  rating: number
  numReviews: number
  soldCount: number
  specifications: Specification[]
  createdAt: string
  sellerId: number | null
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'parentId'>
  brand?: Pick<Brand, 'id' | 'name' | 'slug'> | null
  /** Who lists the product. Null for catalogue entries the admin owns directly. */
  seller?: Pick<User, 'id' | 'name'> | null
  images?: ProductImage[]
  variants?: ProductVariant[]
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'rating'
  | 'name_asc'

export interface ProductQuery {
  q?: string
  category?: string
  brand?: string
  minPrice?: number | string
  maxPrice?: number | string
  inStock?: boolean
  size?: string
  color?: string
  rating?: number
  featured?: boolean
  sort?: SortOption
  page?: number
  limit?: number
  includeInactive?: boolean
  /** Sellers only: restrict the listing to the signed-in seller's own products. */
  mine?: boolean
  /** Admin: show only the products belonging to one seller. */
  sellerId?: number | string
}

export interface FilterOptions {
  brands: Array<{ id: number; name: string; slug: string; productCount: number }>
  priceRange: { min: number; max: number }
  sizes: string[]
  colors: string[]
}

export interface CartLine {
  id: number
  quantity: number
  productId: number
  variantId: number | null
  /** Pre-joined "Colour / Size" label, or null for products without variants. */
  variantLabel: string | null
  product: {
    id: number
    name: string
    slug: string
    isActive: boolean
    brand?: Pick<Brand, 'id' | 'name' | 'slug'> | null
    image: string | null
  }
  variant: { id: number; size: string | null; color: string | null; sku: string | null } | null
  originalPrice: number
  effectivePrice: number
  lineTotal: number
  availableStock: number
  isAvailable: boolean
  issues: string[]
}

/** Server-computed money for a cart or checkout: the client never recalculates it. */
export interface CartSummary {
  itemCount: number
  subtotal: number
  productDiscount: number
  couponDiscount: number
  discount: number
  itemsTotal: number
  deliveryCharge: number
  total: number
  freeDeliveryThreshold: number
}

export interface AppliedCoupon {
  id: number
  code: string
  description: string | null
  discountType: 'percent' | 'fixed'
  discountValue: number
}

export interface CartPayload {
  cartId: number
  items: CartLine[]
  summary: CartSummary
  coupon: AppliedCoupon | null
  couponError: string | null
  hasUnavailableItems: boolean
}

export interface WishlistEntry {
  id: number
  addedAt: string
  product: Product
}

export type AddressLabel = 'home' | 'work' | 'other'

export interface Address {
  id: number
  userId: number
  label: AddressLabel
  fullName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  landmark: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

export type AddressInput = Omit<Address, 'id' | 'userId' | 'isDefault'> & { isDefault?: boolean }

/* --------------------------- Phase 2: payments & orders -------------------------- */

export interface PaymentMethod {
  id: number
  name: string
  code: string
  description: string | null
  instructions: string | null
  icon: string | null
  isActive: boolean
  /** Cash: can never be disabled or deleted. */
  isPermanent: boolean
  /** True records the order as paid on placement; false leaves it pending. */
  settlesImmediately: boolean
  sortOrder: number
}

export interface Coupon {
  id: number
  code: string
  description: string | null
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrderValue: number
  maxDiscount: number | null
  startsAt: string | null
  expiresAt: string | null
  usageLimit: number | null
  usedCount: number
  isActive: boolean
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItem {
  id: number
  orderId: number
  productId: number | null
  variantId: number | null
  /** Snapshotted owner of the line, so a mixed order can be split by seller. */
  sellerId: number | null
  /** Admin order detail only: the seller behind this line. */
  seller?: Pick<User, 'id' | 'name'> | null
  productName: string
  productSlug: string | null
  brandName: string | null
  variantLabel: string | null
  sku: string | null
  image: string | null
  originalPrice: number
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderStatusEvent {
  id: number
  orderId: number
  status: OrderStatus
  note: string | null
  createdAt: string
  changedBy?: { id: number; name: string; role: Role } | null
}

export interface Order {
  id: number
  orderNumber: string
  userId: number

  /** Where the order came from: storefront checkout, or a seller raising it. */
  orderSource: OrderSource
  /** The seller who created a direct order; null for storefront checkouts. */
  createdById: number | null

  subtotal: number
  productDiscount: number
  couponDiscount: number
  discount: number
  deliveryCharge: number
  total: number

  couponId: number | null
  couponCode: string | null

  paymentMethodId: number | null
  paymentMethodCode: string
  paymentMethodName: string
  paymentStatus: PaymentStatus
  status: OrderStatus

  addressId: number | null
  shippingFullName: string
  shippingPhone: string
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  shippingLandmark: string | null
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string

  customerNote: string | null
  cancelReason: string | null

  placedAt: string
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null

  items: OrderItem[]
  statusHistory?: OrderStatusEvent[]
  paymentMethod?: Pick<PaymentMethod, 'id' | 'name' | 'code' | 'icon'> | null
  coupon?: Pick<Coupon, 'id' | 'code' | 'discountType' | 'discountValue'> | null
  customer?: { id: number; name: string; email: string; phone: string | null }
  /** Admin order detail only: the seller who raised a direct order. */
  createdBy?: Pick<User, 'id' | 'name'> & { role: Role } | null

  canBeCancelledByCustomer: boolean
  /** Admin only: which statuses this order may move to next. */
  allowedNextStatuses?: OrderStatus[]
}

export interface CheckoutSummary extends CartPayload {
  addresses: Address[]
  paymentMethods: PaymentMethod[]
  canPlaceOrder: boolean
}

export interface PlaceOrderInput {
  addressId: number
  paymentMethodId: number
  couponCode?: string | null
  customerNote?: string
}

export interface AdminOrderQuery {
  q?: string
  status?: OrderStatus | ''
  paymentStatus?: PaymentStatus | ''
  paymentMethod?: string
  /** Phase 4: storefront checkout vs an order a seller raised directly. */
  source?: OrderSource | ''
  /** Phase 4: only orders containing this seller's lines. */
  sellerId?: number | string
  customerId?: number | string
  from?: string
  to?: string
  sort?: 'newest' | 'oldest' | 'total_desc' | 'total_asc'
  page?: number
  limit?: number
}

/* --------------------------------- Phase 3 --------------------------------- */

export type OrderSource = 'customer' | 'seller'

export interface SellerStats {
  range: string
  products: { total: number; active: number; outOfStock: number; lowStock: number }
  orders: {
    total: number
    pending: number
    shipped: number
    completed: number
    cancelled: number
    byStatus: Partial<Record<OrderStatus, number>>
  }
  sales: { revenue: number; unitsSold: number }
  lowStockProducts: Array<{
    id: number
    name: string
    slug: string
    stock: number
    isActive: boolean
  }>
  lowStockThreshold: number
}

export type StatsRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'

export interface InventoryProduct {
  id: number
  name: string
  slug: string
  stock: number
  isActive: boolean
  price: number
  discountPrice: number | null
  brand?: Pick<Brand, 'id' | 'name'> | null
  category?: Pick<Category, 'id' | 'name'> | null
  variants?: ProductVariant[]
  images?: ProductImage[]
}

export type StockMovementType = 'initial' | 'adjustment' | 'order' | 'cancellation'

export interface StockMovement {
  id: number
  productId: number
  variantId: number | null
  type: StockMovementType
  quantityChange: number
  resultingStock: number
  reason: string | null
  orderId: number | null
  createdAt: string
  createdBy?: { id: number; name: string; role: Role } | null
  variant?: Pick<ProductVariant, 'id' | 'size' | 'color' | 'sku'> | null
  order?: { id: number; orderNumber: string | null } | null
}

/** An order as a seller sees it: only their own lines, with their own subtotal. */
export interface SellerOrder extends Omit<Order, 'allowedNextStatuses'> {
  sellerItemCount: number
  sellerSubtotal: number
  isSoleSeller: boolean
  canUpdateStatus: boolean
  allowedNextStatuses: OrderStatus[]
}

export interface SellerCustomer {
  id: number
  name: string
  email: string
  phone: string | null
  addresses?: Address[]
}

/** One line of a draft order the seller is building. */
export interface DraftLine {
  productId: number
  variantId: number | null
  quantity: number
  name: string
  variantLabel: string | null
  image: string | null
  unitPrice: number
  availableStock: number
}

export interface DraftQuote {
  items: CartLine[]
  summary: CartSummary
  coupon: AppliedCoupon | null
  couponError: string | null
  hasUnavailableItems: boolean
}

export interface CreateSellerOrderInput {
  customerId: number
  addressId?: number | null
  items: Array<{ productId: number; variantId: number | null; quantity: number }>
  paymentMethodId: number
  couponCode?: string | null
  note?: string
  shippingAddress?: {
    fullName: string
    phone: string
    addressLine1: string
    addressLine2?: string
    landmark?: string
    city: string
    state: string
    postalCode: string
    country?: string
  }
}

export interface SellerOrderQuery {
  q?: string
  status?: OrderStatus | ''
  paymentStatus?: PaymentStatus | ''
  source?: OrderSource | ''
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface OrderStats {
  byStatus: Partial<Record<OrderStatus, number>>
  byPaymentMethod: Record<string, number>
  bySource: Partial<Record<OrderSource, number>>
  orderCount: number
  revenue: number
}

/* ----------------------- Phase 4: admin, reports, analytics ---------------------- */

/**
 * The whole admin panel keeps two money figures apart and never mixes them:
 *   sales   — value of every live (non-cancelled) order, i.e. business written
 *   revenue — value of the orders whose payment has actually been settled
 */
export interface AdminDashboard {
  range: string
  customers: { total: number; active: number; inactive: number; joinedInRange: number }
  sellers: { total: number; active: number; inactive: number; joinedInRange: number }
  admins: { total: number }
  products: {
    total: number
    active: number
    disabled: number
    outOfStock: number
    lowStock: number
    inventoryValue: number
  }
  orders: {
    total: number
    pending: number
    shipped: number
    completed: number
    cancelled: number
    byStatus: Partial<Record<OrderStatus, number>>
  }
  sales: { totalSales: number; revenue: number; unitsSold: number; averageOrderValue: number }
  bySource: Partial<Record<OrderSource, { count: number; value: number }>>
  byPaymentMethod: Array<{ code: string; name: string; count: number; value: number }>
  lowStockProducts: Array<{
    id: number
    name: string
    slug: string
    stock: number
    isActive: boolean
    seller?: Pick<User, 'id' | 'name'> | null
  }>
  recentOrders: Array<
    Pick<
      Order,
      | 'id'
      | 'orderNumber'
      | 'total'
      | 'status'
      | 'paymentStatus'
      | 'orderSource'
      | 'placedAt'
      | 'shippingFullName'
    > & { customer?: Pick<User, 'id' | 'name'> | null }
  >
  topProducts: ProductPerformance[]
  lowStockThreshold: number
}

export interface AdminCustomer {
  id: number
  name: string
  email: string
  phone: string | null
  avatar?: string | null
  isActive: boolean
  createdAt: string
  orderCount: number
  cancelledOrders: number
  totalSpent: number
  lastOrderAt: string | null
  addresses?: Address[]
}

export interface CustomerDetail {
  customer: AdminCustomer
  ordersByStatus: Partial<Record<OrderStatus, number>>
  purchaseHistory: Array<{
    productId: number | null
    productName: string
    quantity: number
    spent: number
    lastBoughtAt: string | null
  }>
}

export interface AdminSeller {
  id: number
  name: string
  email: string
  phone: string | null
  isActive: boolean
  createdAt: string
  productCount: number
  activeProducts: number
  orderCount: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  unitsSold: number
  sales: number
  revenue: number
}

export interface SellerDetail {
  seller: AdminSeller | undefined
  range: string
  topProducts: ProductPerformance[]
  recentOrders: Array<
    Pick<Order, 'id' | 'orderNumber' | 'total' | 'status' | 'paymentStatus' | 'orderSource' | 'placedAt'> & {
      customer?: Pick<User, 'id' | 'name'> | null
    }
  >
  byCategory: Array<{ category: Pick<Category, 'id' | 'name'>; count: number }>
}

export interface SellerInput {
  name: string
  email: string
  phone?: string | null
  password?: string
  isActive?: boolean
}

/** An order row as the admin's seller detail screen shows it. */
export interface SellerOrderSummary {
  id: number
  orderNumber: string
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethodName: string
  orderSource: OrderSource
  placedAt: string
  shippingFullName: string
  customer?: Pick<User, 'id' | 'name' | 'email'> | null
  sellerSubtotal: number
  sellerItemCount: number
}

export interface AdminInventoryProduct extends InventoryProduct {
  soldCount: number
  lastMovementAt: string | null
  seller?: Pick<User, 'id' | 'name'> | null
}

export interface InventoryOverview {
  products: AdminInventoryProduct[]
  summary: {
    products: number
    outOfStock: number
    lowStock: number
    units: number
    inventoryValue: number
  }
  lowStockThreshold: number
  pagination: Pagination
}

export interface AttributeUsage {
  value: string
  variantCount: number
  productCount: number
  stock: number
}

export interface AttributeOverview {
  sizes: AttributeUsage[]
  colors: AttributeUsage[]
  summary: {
    products: number
    withVariants: number
    withoutVariants: number
    variants: number
  }
}

/* --------------------------------- Reports --------------------------------- */

export type ReportGroupBy = 'day' | 'week' | 'month' | 'year'

/** Every report accepts the same window, so one control bar drives all of them. */
export interface ReportQuery {
  range?: StatsRange
  from?: string
  to?: string
  groupBy?: ReportGroupBy
  sellerId?: number | string
  categoryId?: number | string
  source?: OrderSource | ''
  q?: string
  limit?: number
}

export interface SalesRow {
  period: string
  orders: number
  units: number
  sales: number
  revenue: number
  discount: number
}

export interface SalesReport {
  groupBy: ReportGroupBy
  range: string
  rows: SalesRow[]
  totals: {
    orders: number
    units: number
    sales: number
    revenue: number
    discount: number
    averageOrderValue: number
  }
}

export interface ProductPerformance {
  id: number
  name: string
  slug: string
  stock: number
  price: number
  discountPrice: number | null
  isActive: boolean
  unitsSold: number
  revenue: number
  orderCount: number
  seller?: Pick<User, 'id' | 'name'> | null
  category?: Pick<Category, 'id' | 'name'> | null
  brand?: Pick<Brand, 'id' | 'name'> | null
}

export interface ProductReport {
  range: string
  bestSelling: ProductPerformance[]
  lowSelling: ProductPerformance[]
  totals: { unitsSold: number; revenue: number }
}

export interface SellerReport {
  range: string
  sellers: AdminSeller[]
  totals: { sellers: number; orders: number; unitsSold: number; sales: number; revenue: number }
}

export interface PaymentMethodPerformance {
  code: string
  name: string
  orderCount: number
  sales: number
  revenue: number
  paidCount: number
  pendingCount: number
  refundedCount: number
  failedCount: number
}

export interface PaymentReport {
  range: string
  methods: PaymentMethodPerformance[]
  byStatus: Partial<Record<PaymentStatus, number>>
  totals: { orders: number; sales: number; revenue: number }
}

export interface OrderSourceRow {
  source: OrderSource
  orderCount: number
  sales: number
  revenue: number
  cancelledCount: number
  /** Percentage of all orders in the window, to one decimal place. */
  share: number
}

export interface OrderSourceReport {
  range: string
  sources: OrderSourceRow[]
  totals: { orders: number; sales: number }
  byCreator: Array<{ id: number; name: string; orderCount: number; sales: number }>
}

export interface GrowthRow {
  period: string
  joined: number
  /** Running total, so the line climbs rather than resetting each period. */
  total: number
}

export interface Analytics {
  groupBy: ReportGroupBy
  range: string
  salesTrend: SalesRow[]
  orderTrend: Array<{ period: string; orders: number }>
  statusDistribution: Array<{ status: OrderStatus; count: number }>
  paymentUsage: Array<{ code: string; name: string; orderCount: number; sales: number }>
  orderSources: OrderSourceRow[]
  customerGrowth: GrowthRow[]
  sellerGrowth: GrowthRow[]
  topProducts: Array<{
    id: number
    name: string
    unitsSold: number
    revenue: number
    seller?: Pick<User, 'id' | 'name'> | null
  }>
  totals: { orders: number; units: number; sales: number; revenue: number; discount: number }
}

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  errors?: Array<{ field: string; message: string }>
}

/** Normalised failure shape that every thunk rejects with. */
export interface ApiFailure {
  message: string
  errors?: Array<{ field: string; message: string }>
  status?: number
}
