import { useState } from 'react'
import { ChartTooltip } from './ChartCard'
import { linePath, niceTicks, tickIndexes, useChartWidth } from './chartUtils'

export interface TrendSeries {
  label: string
  color: string
  values: number[]
}

interface TrendChartProps {
  /** One label per point, already formatted for the axis. */
  labels: string[]
  series: TrendSeries[]
  formatValue: (value: number) => string
  /** Axis ticks are compact; the tooltip and table carry full precision. */
  formatTick?: (value: number) => string
  height?: number
  /** A single series reads better as an area; two lines stay as lines. */
  fillArea?: boolean
  emptyMessage?: string
}

const PADDING = { top: 12, right: 16, bottom: 26, left: 56 }

/**
 * Trend over time. A crosshair snaps to the nearest period so the reader aims at
 * a date rather than at a 2px line, and every series is listed in one readout.
 */
export function TrendChart({
  labels,
  series,
  formatValue,
  formatTick,
  height = 240,
  fillArea = true,
  emptyMessage = 'No activity in this period.',
}: TrendChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  if (labels.length === 0 || series.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-slate-500">{emptyMessage}</p>
    )
  }

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 10)
  const plotHeight = height - PADDING.top - PADDING.bottom

  const maxValue = Math.max(1, ...series.flatMap((entry) => entry.values))
  const ticks = niceTicks(maxValue)
  const scaleMax = ticks[ticks.length - 1] || 1

  const xAt = (index: number) =>
    PADDING.left + (labels.length === 1 ? plotWidth / 2 : (index / (labels.length - 1)) * plotWidth)
  const yAt = (value: number) => PADDING.top + plotHeight - (value / scaleMax) * plotHeight

  const showArea = fillArea && series.length === 1
  const tick = formatTick || formatValue

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const offset = event.clientX - bounds.left - PADDING.left
    const ratio = labels.length === 1 ? 0 : offset / plotWidth
    setActive(Math.min(labels.length - 1, Math.max(0, Math.round(ratio * (labels.length - 1)))))
  }

  const handleKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setActive((current) => {
      const base = current ?? 0
      const next = event.key === 'ArrowLeft' ? base - 1 : base + 1
      return Math.min(labels.length - 1, Math.max(0, next))
    })
  }

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        tabIndex={0}
        aria-label={`${series.map((entry) => entry.label).join(' and ')} by period`}
        className="touch-none outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        onPointerMove={handlePointer}
        onPointerLeave={() => setActive(null)}
        onKeyDown={handleKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={yAt(value)}
              y2={yAt(value)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={yAt(value) + 4}
              textAnchor="end"
              className="tabular-nums"
              fill="var(--viz-ink-muted)"
              fontSize={11}
            >
              {tick(value)}
            </text>
          </g>
        ))}

        {tickIndexes(labels.length).map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
            fill="var(--viz-ink-muted)"
            fontSize={11}
          >
            {labels[index]}
          </text>
        ))}

        {showArea ? (
          <path
            d={`${linePath(series[0].values.map((value, index) => ({ x: xAt(index), y: yAt(value) })))} L${xAt(labels.length - 1)},${PADDING.top + plotHeight} L${xAt(0)},${PADDING.top + plotHeight} Z`}
            fill={series[0].color}
            opacity={0.1}
          />
        ) : null}

        {series.map((entry) => (
          <path
            key={entry.label}
            d={linePath(entry.values.map((value, index) => ({ x: xAt(index), y: yAt(value) })))}
            fill="none"
            stroke={entry.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* End marker with a surface ring, so it stays legible over the line. */}
        {series.map((entry) => (
          <circle
            key={`${entry.label}-end`}
            cx={xAt(labels.length - 1)}
            cy={yAt(entry.values[entry.values.length - 1] ?? 0)}
            r={4}
            fill={entry.color}
            stroke="var(--viz-surface)"
            strokeWidth={2}
          />
        ))}

        {active !== null ? (
          <g>
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
              stroke="var(--viz-axis)"
              strokeWidth={1}
            />
            {series.map((entry) => (
              <circle
                key={`${entry.label}-active`}
                cx={xAt(active)}
                cy={yAt(entry.values[active] ?? 0)}
                r={4.5}
                fill={entry.color}
                stroke="var(--viz-surface)"
                strokeWidth={2}
              />
            ))}
          </g>
        ) : null}

        <line
          x1={PADDING.left}
          x2={PADDING.left + plotWidth}
          y1={PADDING.top + plotHeight}
          y2={PADDING.top + plotHeight}
          stroke="var(--viz-axis)"
          strokeWidth={1}
        />
      </svg>

      {active !== null ? (
        <ChartTooltip
          x={xAt(active)}
          y={PADDING.top}
          containerWidth={width}
          title={labels[active]}
          rows={series.map((entry) => ({
            label: entry.label,
            value: formatValue(entry.values[active] ?? 0),
            color: entry.color,
          }))}
        />
      ) : null}
    </div>
  )
}
