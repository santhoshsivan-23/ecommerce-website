import { useId, useState, type ReactNode } from 'react'

export interface LegendEntry {
  label: string
  color: string
  /** Mirrors the mark: a line key for lines, a swatch for bars and fills. */
  shape?: 'line' | 'rect'
}

export interface TableView {
  columns: string[]
  rows: Array<Array<string | number>>
}

interface ChartCardProps {
  title: string
  subtitle?: string
  /** Always shown for two or more series, so identity is never colour alone. */
  legend?: LegendEntry[]
  /** The WCAG-clean twin of the chart. Every value on the plot appears here. */
  table: TableView
  /** During a refetch the previous render is held back rather than replaced. */
  loading?: boolean
  action?: ReactNode
  children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  loading = false,
  action,
  children,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  const panelId = useId()

  return (
    <section className="viz-root card flex flex-col p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          {action}
          <button
            type="button"
            onClick={() => setShowTable((open) => !open)}
            aria-expanded={showTable}
            aria-controls={panelId}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>

      {legend && legend.length > 1 ? (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              {entry.shape === 'rect' ? (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: entry.color }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: entry.color }}
                />
              )}
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div id={panelId} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {showTable ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {table.columns.map((column, index) => (
                    <th
                      key={column}
                      className={`border-b border-slate-100 px-2 py-2 ${index === 0 ? '' : 'text-right'}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.columns.length} className="px-2 py-6 text-center text-slate-500">
                      Nothing in this period.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`px-2 py-1.5 ${
                            cellIndex === 0
                              ? 'text-slate-700'
                              : 'text-right tabular-nums text-slate-600'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** Shared hover readout: the value leads, the series name follows. */
export function ChartTooltip({
  x,
  y,
  title,
  rows,
  containerWidth,
}: {
  x: number
  y: number
  title: string
  rows: Array<{ label: string; value: string; color?: string }>
  containerWidth: number
}) {
  // Keep the card inside the plot rather than letting it hang off an edge.
  const width = 168
  const left = Math.min(Math.max(x - width / 2, 0), Math.max(containerWidth - width, 0))

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-lg"
      style={{ left, top: Math.max(y - 8, 0), width }}
    >
      <p className="mb-1 text-[11px] font-medium text-slate-500">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-900">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
