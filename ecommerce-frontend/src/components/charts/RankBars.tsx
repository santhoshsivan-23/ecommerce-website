export interface RankRow {
  label: string
  value: number
  /** Optional second line under the label, e.g. the seller behind a product. */
  hint?: string
}

interface RankBarsProps {
  rows: RankRow[]
  formatValue: (value: number) => string
  color?: string
  emptyMessage?: string
}

/**
 * Magnitude across named categories, ranked. Horizontal because category names
 * are long, and one hue because there is one measure — the length is the story.
 * The value rides the tip of each bar, so no hover is needed to read it.
 */
export function RankBars({
  rows,
  formatValue,
  color = 'var(--viz-series-1)',
  emptyMessage = 'Nothing to rank yet.',
}: RankBarsProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={`${row.label}-${row.hint ?? ''}`} className="grid grid-cols-[1fr_auto] gap-x-3">
          <p className="truncate text-sm text-slate-700" title={row.label}>
            {row.label}
          </p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatValue(row.value)}
          </p>

          <div className="col-span-2 mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / max) * 100)}%`,
                  background: color,
                }}
              />
            </div>
            {row.hint ? (
              <span className="shrink-0 text-[11px] text-slate-400">{row.hint}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
