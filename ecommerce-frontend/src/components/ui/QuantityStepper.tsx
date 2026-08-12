import { MinusIcon, PlusIcon } from './Icons'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  disabled?: boolean
  onChange: (next: number) => void
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next))

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        className="px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </button>

      <input
        type="number"
        className="w-12 border-x border-slate-200 py-1.5 text-center text-sm font-medium outline-none"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isNaN(next)) onChange(clamp(next))
        }}
        aria-label="Quantity"
      />

      <button
        type="button"
        className="px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
