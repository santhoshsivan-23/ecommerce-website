import type { OrderStatus, PaymentStatus } from '@/types'

/** The forward progression an order moves through, used by the tracker. */
export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

/** Tailwind classes for a status pill. */
export function orderStatusClasses(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700'
    case 'shipped':
      return 'bg-indigo-50 text-indigo-700'
    case 'processing':
      return 'bg-amber-50 text-amber-700'
    case 'confirmed':
      return 'bg-sky-50 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function paymentStatusClasses(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700'
    case 'refunded':
      return 'bg-slate-100 text-slate-600'
    case 'failed':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-amber-50 text-amber-700'
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
