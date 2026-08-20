import { forwardRef } from 'react'
import { Link } from 'react-router'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  outline: 'border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white',
  ghost: 'text-chalk-400 hover:bg-ink-800 hover:text-white',
  subtle: 'bg-ink-800 text-chalk-200 hover:bg-ink-700 hover:text-white border border-ink-600',
  danger: 'bg-ink-800 text-brand-400 hover:bg-brand-500 hover:text-white border border-ink-600',
}

const SIZES = {
  xs: 'h-7 px-2.5 text-[11px] gap-1.5',
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
}

/**
 * One button for the whole dashboard. `to` renders a router link, `href` an
 * anchor, otherwise a real <button> — so keyboard and screen-reader behaviour
 * always matches what the control actually does.
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    to,
    href,
    fullWidth,
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-display font-bold uppercase tracking-wider whitespace-nowrap',
    'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )

  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }
  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  )
})

/** Square icon-only button. `label` is required — it becomes the accessible name. */
export const IconButton = forwardRef(function IconButton(
  { label, icon: Icon, variant = 'ghost', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid size-8 place-items-center rounded-md transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
})