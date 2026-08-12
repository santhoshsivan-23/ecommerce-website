import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { applyCoupon, clearCoupon, fetchCart } from '@/features/cart/cartSlice'
import { Spinner } from '@/components/ui/Spinner'
import { CloseIcon } from '@/components/ui/Icons'
import { notify, notifyApiError } from '@/utils/notify'

interface CouponBoxProps {
  /** Lets the checkout page reprice itself when the coupon changes. */
  onChange?: (code: string | null) => void
}

export function CouponBox({ onChange }: CouponBoxProps) {
  const dispatch = useAppDispatch()
  const coupon = useAppSelector((state) => state.cart.coupon)

  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)

  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      notify.warning('Enter a coupon code first')
      return
    }

    setApplying(true)
    const result = await dispatch(applyCoupon(code.trim().toUpperCase()))
    setApplying(false)

    if (applyCoupon.fulfilled.match(result)) {
      notify.success(`Coupon ${result.payload.coupon?.code} applied`)
      setCode('')
      onChange?.(result.payload.coupon?.code ?? null)
    } else {
      notifyApiError(result.payload, 'That coupon could not be applied')
    }
  }

  const handleRemove = async () => {
    dispatch(clearCoupon())
    await dispatch(fetchCart())
    notify.info('Coupon removed')
    onChange?.(null)
  }

  if (coupon) {
    return (
      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{coupon.code} applied</p>
          {coupon.description ? (
            <p className="text-xs text-slate-500">{coupon.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <CloseIcon className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleApply} className="card p-4">
      <label className="label" htmlFor="coupon">Have a coupon?</label>
      <div className="flex gap-2">
        <input
          id="coupon"
          className="input-field uppercase"
          placeholder="WELCOME10"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="submit" className="btn-outline shrink-0" disabled={applying}>
          {applying ? <Spinner className="h-4 w-4" /> : 'Apply'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">Try WELCOME10 or FLAT200.</p>
    </form>
  )
}
