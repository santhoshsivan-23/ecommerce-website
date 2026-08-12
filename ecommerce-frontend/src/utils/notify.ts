import { toast } from 'react-toastify'
import type { ApiFailure } from '@/types'

export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
  error: (message: string) => toast.error(message),
}

/**
 * Surfaces an API failure as a toast. Field-level validation errors are listed
 * so the customer sees exactly what to fix, not just "Validation failed".
 */
export function notifyApiError(failure: ApiFailure | undefined, fallback = 'Something went wrong') {
  if (!failure) {
    toast.error(fallback)
    return
  }

  if (failure.errors && failure.errors.length > 0) {
    toast.error(failure.errors.map((e) => e.message).join('\n'))
    return
  }

  toast.error(failure.message || fallback)
}

/** Maps a validation error list into the shape form components render. */
export function toFieldErrors(failure: ApiFailure | undefined): Record<string, string> {
  if (!failure?.errors) return {}
  return failure.errors.reduce<Record<string, string>>((acc, item) => {
    if (!acc[item.field]) acc[item.field] = item.message
    return acc
  }, {})
}
