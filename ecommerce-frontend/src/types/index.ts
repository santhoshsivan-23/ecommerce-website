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
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'parentId'>
  brand?: Pick<Brand, 'id' | 'name' | 'slug'> | null
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

export type StatsRange = 'all' | 'today' | 'week' | 'month' | 'custom'

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
  orderCount: number
  revenue: number
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
