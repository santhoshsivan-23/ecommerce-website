export interface ShareSegment {
  label: string
  value: number
  color: string
}

interface ShareBarProps {
  segments: ShareSegment[]
  formatValue: (value: number) => string
  emptyMessage?: string
}

/**
 * Part-to-whole across a handful of categories: a stacked bar rather than a pie,
 * because a pie of two or three slices is harder to compare than one line of
 * lengths. Segments are separated by a gap in the surface colour, never a border.
 */
export function ShareBar({
  segments,
  formatValue,
  emptyMessage = 'No orders in this period.',
}: ShareBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  const visible = segments.filter((segment) => segment.value > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 w-full gap-0.5" role="img" aria-label="Share of orders by source">
        {visible.map((segment, index) => {
          const share = (segment.value / total) * 100
          const isFirst = index === 0
          const isLast = index === visible.length - 1

          return (
            <div
              key={segment.label}
              className="h-full"
              title={`${segment.label}: ${formatValue(segment.value)}`}
              style={{
                width: `${share}%`,
                background: segment.color,
                borderTopLeftRadius: isFirst ? 4 : 0,
                borderBottomLeftRadius: isFirst ? 4 : 0,
                borderTopRightRadius: isLast ? 4 : 0,
                borderBottomRightRadius: isLast ? 4 : 0,
              }}
            />
          )
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: segment.color }}
              />
              {segment.label}
            </span>
            <span className="tabular-nums text-slate-900">
              <span className="font-semibold">{formatValue(segment.value)}</span>
              <span className="ml-2 text-xs text-slate-400">
                {total ? Math.round((segment.value / total) * 1000) / 10 : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
