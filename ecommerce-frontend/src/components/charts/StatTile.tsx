import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { linePath } from './chartUtils'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: string
  to?: string
  /** Renders the value at hero size. Use once per screen at most. */
  hero?: boolean
  /** 12-ish point trend line under the value, in the de-emphasis hue. */
  trend?: number[]
  tone?: 'default' | 'warning' | 'danger'
}

const TONE_CLASSES = {
  default: 'text-slate-900',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
} as const

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null

  const width = 96
  const height = 24
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1

  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - ((value - min) / span) * (height - 4) - 2,
  }))

  return (
    <svg width={width} height={height} className="mt-2" aria-hidden="true">
      <path
        d={linePath(points)}
        fill="none"
        stroke="var(--viz-neutral)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill="var(--viz-series-1)"
      />
    </svg>
  )
}

/** A headline number. The number is the chart — never a one-bar bar chart. */
export function StatTile({
  label,
  value,
  hint,
  to,
  hero = false,
  trend,
  tone = 'default',
}: StatTileProps) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${hero ? 'text-4xl' : 'text-2xl'} ${TONE_CLASSES[tone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {trend && trend.length > 1 ? <Sparkline values={trend} /> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className="viz-root card p-4 transition-shadow hover:shadow-md">
        {body}
      </Link>
    )
  }

  return <div className="viz-root card p-4">{body}</div>
}
