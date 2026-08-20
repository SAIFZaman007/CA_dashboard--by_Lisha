import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Feedback'

/**
 * The table every list screen uses.
 *
 * On a phone the same rows render as cards, because a seven-column table on a
 * 380px screen is not a table, it is a horizontal scroll nobody uses. The
 * `mobile` render prop decides what a row looks like at that width; without it
 * the table simply scrolls.
 */
export function DataTable({
  columns,
  rows,
  getKey,
  onRowClick,
  rail,
  loading,
  empty,
  mobile,
  className,
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    )
  }

  if (!rows?.length) return empty ?? null

  return (
    <>
      {/* Cards below `md` */}
      {mobile && (
        <ul className="divide-y divide-ink-700 md:hidden">
          {rows.map((row) => (
            <li key={getKey(row)}>
              <button
                type="button"
                onClick={() => onRowClick?.(row)}
                disabled={!onRowClick}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  onRowClick && 'hover:bg-ink-800',
                  rail && `rail ${rail(row)}`,
                )}
              >
                {mobile(row)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={cn('overflow-x-auto', mobile && 'hidden md:block', className)}>
        <table className="w-full min-w-160 border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-600">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-left font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-500',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.className,
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {rows.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-ink-800',
                  rail && `rail ${rail(row)}`,
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle text-chalk-200',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.cellClassName,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Offset pagination footer. Hidden entirely when everything already fits. */
export function Pagination({ total, limit, offset, onChange, label = 'records' }) {
  if (total <= limit) return null

  const page = Math.floor(offset / limit) + 1
  const pages = Math.ceil(total / limit)
  const from = offset + 1
  const to = Math.min(offset + limit, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-600 px-4 py-3 text-xs text-chalk-500">
      <p className="tabular-nums">
        {from}–{to} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(offset - limit, 0))}
          className="rounded border border-ink-600 px-2.5 py-1 transition hover:border-ink-500 hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          Previous
        </button>
        <span className="tabular-nums">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(offset + limit)}
          className="rounded border border-ink-600 px-2.5 py-1 transition hover:border-ink-500 hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}