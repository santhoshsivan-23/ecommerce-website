import { useState } from 'react'
import { ChartTooltip } from './ChartCard'
import { barPath, niceTicks, tickIndexes, useChartWidth } from './chartUtils'

interface ColumnChartProps {
  labels: string[]
  values: number[]
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
  height?: number
  color?: string
  emptyMessage?: string
  valueLabel?: string
}

const PADDING = { top: 12, right: 12, bottom: 26, left: 48 }
const MAX_BAR = 24
const GAP = 2

/**
 * Magnitude over ordered periods. One measure, so one hue for every column —
 * darkening the taller bars would double-encode the height as colour.
 */
export function ColumnChart({
  labels,
  values,
  formatValue,
  formatTick,
  height = 220,
  color = 'var(--viz-series-1)',
  emptyMessage = 'No activity in this period.',
  valueLabel = 'Orders',
}: ColumnChartProps) {
  const { ref, width } = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  if (labels.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-slate-500">{emptyMessage}</p>
    )
  }

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 10)
  const plotHeight = height - PADDING.top - PADDING.bottom

  const ticks = niceTicks(Math.max(1, ...values))
  const scaleMax = ticks[ticks.length - 1] || 1

  const band = plotWidth / labels.length
  // Cap the bar and let the band's leftover be air, minus the surface gap.
  const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP))
  const tick = formatTick || formatValue

  const bandX = (index: number) => PADDING.left + index * band
  const yAt = (value: number) => PADDING.top + plotHeight - (value / scaleMax) * plotHeight

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${valueLabel} by period`}
        onPointerLeave={() => setActive(null)}
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

        {values.map((value, index) => {
          const barHeight = Math.max(value > 0 ? 2 : 0, (value / scaleMax) * plotHeight)
          const x = bandX(index) + (band - barWidth) / 2

          return (
            <path
              key={index}
              d={barPath(x, yAt(value), barWidth, barHeight, 4, 'up')}
              fill={color}
              opacity={active === null || active === index ? 1 : 0.55}
            />
          )
        })}

        {/* Hit areas span the whole band, so no one has to land on a thin bar. */}
        {values.map((_, index) => (
          <rect
            key={`hit-${index}`}
            x={bandX(index)}
            y={PADDING.top}
            width={band}
            height={plotHeight}
            fill="transparent"
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            tabIndex={0}
            role="button"
            aria-label={`${labels[index]}: ${formatValue(values[index])}`}
            className="outline-none focus-visible:fill-slate-100"
          />
        ))}

        {tickIndexes(labels.length).map((index) => (
          <text
            key={index}
            x={bandX(index) + band / 2}
            y={height - 8}
            textAnchor="middle"
            fill="var(--viz-ink-muted)"
            fontSize={11}
          >
            {labels[index]}
          </text>
        ))}

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
          x={bandX(active) + band / 2}
          y={PADDING.top}
          containerWidth={width}
          title={labels[active]}
          rows={[{ label: valueLabel, value: formatValue(values[active] ?? 0), color }]}
        />
      ) : null}
    </div>
  )
}
