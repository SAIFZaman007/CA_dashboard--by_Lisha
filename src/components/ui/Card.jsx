import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-xl border border-ink-600 bg-ink-850', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 px-5 py-3.5',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-chalk-200">
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs text-chalk-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

/** A single headline number. */
export function StatCard({ label, value, hint, tone = 'neutral', icon: Icon, to, className }) {
  const toneClass = {
    good: 'text-signal-green',
    bad: 'text-brand-400',
    warn: 'text-signal-amber',
    neutral: 'text-chalk-500',
  }[tone]

  const Wrapper = to ? 'a' : 'div'

  return (
    <Wrapper
      {...(to ? { href: to } : {})}
      className={cn(
        'rounded-xl border border-ink-600 bg-ink-850 p-4',
        to && 'transition-colors hover:border-ink-500',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-500">
          {label}
        </p>
        {Icon && <Icon className="size-4 shrink-0 text-chalk-500" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className={cn('mt-1 text-xs font-medium', toneClass)}>{hint}</p>}
    </Wrapper>
  )
}

export function ProgressBar({ value, target, tone = 'brand', label, className }) {
  const percent = target ? Math.min(Math.round((value / target) * 100), 100) : 0
  const bar = {
    brand: 'bg-brand-500',
    green: 'bg-signal-green',
    blue: 'bg-signal-blue',
    amber: 'bg-signal-amber',
  }[tone]

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-medium text-chalk-200">{label}</span>
          <span className="tabular-nums text-chalk-500">
            {value} / {target}
          </span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}