import { useEffect, useRef, useState } from 'react'
import type { ReportGroupBy } from '@/types'

/** The two categorical slots the charts draw from, in fixed order. */
export const SERIES_COLORS = ['var(--viz-series-1)', 'var(--viz-series-2)'] as const

const compactNumber = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const compactMoney = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const plainNumber = new Intl.NumberFormat('en-IN')

/** Axis-sized money, e.g. ₹12.5L. Full precision belongs in the tooltip and table. */
export function compactPrice(value: number): string {
  return compactMoney.format(value || 0)
}

export function compactCount(value: number): string {
  return compactNumber.format(value || 0)
}

export function formatCount(value: number): string {
  return plainNumber.format(value || 0)
}

/**
 * Round tick values that cover [0, max]. Ticks carry the values the chart does
 * not directly label, so they have to land on numbers a reader recognises.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1]

  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude

  const ticks: number[] = []
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value * 100) / 100)
  return ticks
}

/** Turns a period key from the API into something a person reads on an axis. */
export function formatPeriod(period: string, groupBy: ReportGroupBy): string {
  if (groupBy === 'year') return period

  if (groupBy === 'month') {
    const [year, month] = period.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    })
  }

  const date = new Date(`${period}T00:00:00`)
  const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return groupBy === 'week' ? `w/c ${label}` : label
}

/**
 * A bar with rounded data-end and a square baseline, so growth reads from one
 * flat edge. `direction` is where the bar grows towards.
 */
export function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  direction: 'up' | 'right'
): string {
  if (width <= 0 || height <= 0) return ''

  if (direction === 'up') {
    const r = Math.min(radius, width / 2, height)
    return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
  }

  const r = Math.min(radius, height / 2, width)
  return `M${x},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x},${y + height} Z`
}

/** Smooth-enough polyline: charts here plot ordered periods, so straight is honest. */
export function linePath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
}

/**
 * Measures the container so marks and text stay the same size at every card
 * width, instead of being scaled by a viewBox.
 */
export function useChartWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next && next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

/** Evenly spaced axis labels, so long series do not collide at the bottom. */
export function tickIndexes(length: number, maxLabels = 6): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index)

  const step = (length - 1) / (maxLabels - 1)
  return Array.from({ length: maxLabels }, (_, index) => Math.round(index * step))
}
