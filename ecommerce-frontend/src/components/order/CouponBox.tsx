import { useEffect, useState } from 'react'
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
  const [publicCoupons, setPublicCoupons] = useState<
    Array<{ id: number; code: string; description: string | null; discountType: string; discountValue: number }>
  >([])

  useEffect(() => {
    fetch('/api/coupons/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.coupons)) {
          setPublicCoupons(data.data.coupons)
        }
      })
      .catch(() => {})
  }, [])

  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      notify.warning('Enter a coupon code first')
      return
    }
    await applySpecificCode(code.trim())
  }

  const applySpecificCode = async (targetCode: string) => {
    setApplying(true)
    const result = await dispatch(applyCoupon(targetCode.trim().toUpperCase()))
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
    <div className="card p-4 space-y-4 border-slate-200">
      <form onSubmit={handleApply}>
        <label className="label" htmlFor="coupon">Promo Code</label>
        <div className="flex gap-2">
          <input
            id="coupon"
            className="input-field uppercase font-mono"
            placeholder="Enter promo code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" className="btn-outline shrink-0 font-semibold" disabled={applying}>
            {applying ? <Spinner className="h-4 w-4" /> : 'Apply'}
          </button>
        </div>
      </form>

      {/* Available Coupons List (Public Coupons with Toggle ON) */}
      {publicCoupons.length > 0 ? (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-bold text-zinc-900 mb-2">Available Coupons</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {publicCoupons.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-orange-200/80 bg-orange-50/50"
              >
                <div>
                  <p className="font-mono font-bold text-xs text-orange-900">{c.code}</p>
                  <p className="text-[11px] text-orange-700">
                    {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={applying}
                  onClick={() => applySpecificCode(c.code)}
                  className="btn-outline text-[11px] py-1 px-2.5 border-orange-300 text-orange-700 hover:bg-orange-100 font-bold shrink-0"
                >
                  Apply Coupon
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
