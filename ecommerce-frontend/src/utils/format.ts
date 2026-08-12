import type { Product, ProductVariant } from '@/types'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return currency.format(0)
  return currency.format(value)
}

/** Selling price and original price for a product, honouring the selected variant. */
export function resolvePricing(product: Product, variant?: ProductVariant | null) {
  const original = variant && variant.price !== null ? variant.price : product.price
  const discount =
    variant && variant.price !== null ? variant.discountPrice : product.discountPrice

  const effective = discount && discount > 0 ? discount : original
  const hasDiscount = effective < original
  const percentOff = hasDiscount ? Math.round(((original - effective) / original) * 100) : 0

  return { original, effective, hasDiscount, percentOff }
}

/** Units available, counting variants when the product has them. */
export function resolveStock(product: Product, variant?: ProductVariant | null): number {
  if (variant) return variant.stock
  if (product.variants && product.variants.length > 0) {
    return product.variants
      .filter((v) => v.isActive)
      .reduce((sum, v) => sum + v.stock, 0)
  }
  return product.stock
}

export function primaryImage(product: Product): string | null {
  if (!product.images || product.images.length === 0) return null
  return (product.images.find((image) => image.isPrimary) ?? product.images[0]).url
}

export function stockLabel(stock: number): { text: string; tone: 'good' | 'low' | 'out' } {
  if (stock <= 0) return { text: 'Out of stock', tone: 'out' }
  if (stock <= 5) return { text: `Only ${stock} left`, tone: 'low' }
  return { text: 'In stock', tone: 'good' }
}

export function variantLabel(variant: {
  size?: string | null
  color?: string | null
}): string {
  return [variant.color, variant.size].filter(Boolean).join(' / ')
}
