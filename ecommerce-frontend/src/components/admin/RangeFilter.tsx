import type { ReactNode } from 'react'
import type { StatsRange } from '@/types'

export interface RangeState {
  range: StatsRange
  from: string
  to: string
}

export const DEFAULT_RANGE: RangeState = { range: 'all', from: '', to: '' }

const PRESETS: Array<{ value: StatsRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
]

/**
 * The one filter row that scopes everything below it, so every stat, chart and
 * table on a screen is always reporting the same slice. Presets come first
 * because they are what a reader reaches for; the custom range sits behind them.
 */
export function RangeFilter({
  value,
  onChange,
  children,
}: {
  value: RangeState
  onChange: (next: RangeState) => void
  /** Extra dimension filters, kept in the same row rather than per card. */
  children?: ReactNode
}) {
  return (
    <div className="card flex flex-wrap items-end gap-3 p-4">
      <label className="text-sm text-slate-600">
        <span className="label">Period</span>
        <select
          className="input-field w-auto"
          value={value.range}
          onChange={(event) =>
            onChange({ ...value, range: event.target.value as StatsRange, from: '', to: '' })
          }
        >
          {PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      {value.range === 'custom' ? (
        <>
          <label className="text-sm text-slate-600">
            <span className="label">From</span>
            <input
              type="date"
              className="input-field w-auto"
              value={value.from}
              max={value.to || undefined}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="label">To</span>
            <input
              type="date"
              className="input-field w-auto"
              value={value.to}
              min={value.from || undefined}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {children}
    </div>
  )
}

/** The query shape every admin and report endpoint accepts. */
export function rangeParams(value: RangeState) {
  return value.range === 'custom'
    ? { from: value.from, to: value.to }
    : { range: value.range }
}

/**
 * A custom range is only meaningful once a bound is set, so screens skip the
 * request until then rather than flashing an all-time result.
 */
export function isRangeReady(value: RangeState) {
  return value.range !== 'custom' || Boolean(value.from || value.to)
}
