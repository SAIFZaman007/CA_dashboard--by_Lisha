import { AlertTriangle, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-ink-600 border-t-brand-500',
        className,
      )}
    />
  )
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-950">
      <Spinner className="size-8" />
      <p className="text-sm text-chalk-400">{label}…</p>
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />
}

/** An empty screen is an invitation to act, so it always offers the next step. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}
    >
      <Icon className="mb-4 size-8 text-chalk-500" aria-hidden="true" />
      <h3 className="font-display text-lg text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-chalk-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Errors say what happened and how to fix it. They do not apologise. */
export function ErrorState({ error, onRetry, className }) {
  const message =
    error?.response?.data?.detail ??
    error?.message ??
    'The server did not respond as expected.'

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <AlertTriangle className="mb-3 size-7 text-brand-500" aria-hidden="true" />
      <h3 className="font-display text-lg text-white">That did not load</h3>
      <p className="mt-2 max-w-md text-sm text-chalk-400">{message}</p>
      {onRetry && (
        <Button variant="subtle" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

const BADGE_TONES = {
  neutral: 'border-ink-600 bg-ink-800 text-chalk-400',
  green: 'border-signal-green/40 bg-signal-green/10 text-signal-green',
  amber: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
  red: 'border-brand-500/40 bg-brand-500/10 text-brand-400',
  blue: 'border-signal-blue/40 bg-signal-blue/10 text-signal-blue',
  grey: 'border-ink-500 bg-ink-800 text-chalk-500',
}

export function Badge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium',
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Status pill with a dot — used for lead and booking states. */
export function StatusDot({ tone = 'neutral', children }) {
  const dot = {
    neutral: 'bg-chalk-500',
    green: 'bg-signal-green',
    amber: 'bg-signal-amber',
    red: 'bg-brand-500',
    blue: 'bg-signal-blue',
    grey: 'bg-ink-500',
  }[tone]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-chalk-200">
      <span className={cn('size-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
      {children}
    </span>
  )
}