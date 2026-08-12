import { StarIcon } from './Icons'

interface RatingProps {
  value: number
  count?: number
  size?: 'sm' | 'md'
}

export function Rating({ value, count, size = 'sm' }: RatingProps) {
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  const rounded = Math.round(value)

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex text-amber-400" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} className={starClass} filled={star <= rounded} />
        ))}
      </span>
      <span className={`text-slate-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {value.toFixed(1)}
        {count !== undefined ? ` (${count})` : ''}
      </span>
    </span>
  )
}
