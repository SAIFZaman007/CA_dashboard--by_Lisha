import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * Brand mark.
 *
 * This app is dark end to end, so the *light* artwork is the default. Rendering
 * the `-dark` file on a dark surface is why the logo looked missing on the
 * client portal before — it was black on black.
 *
 * Drop these two files into `dashboard/public/images/` from the client portal:
 *   logo-lockup-light.png   mark + wordmark, ~5.8:1 — the sidebar
 *   logo-mark-light.png     the figure mark alone, 1:1 — favicon, tight spaces
 */

const LOCKUP = '/images/logo-lockup-light.png'
const MARK = '/images/logo-mark-light.png'
const ALT = 'Coach Auto — Autonomy Health and Fitness'

export function Logo({ size = 'md', markOnly = false, to = '/', className }) {
  const height = { sm: 'h-6', md: 'h-8', lg: 'h-11' }[size]

  const image = markOnly ? (
    <img
      src={MARK}
      alt={ALT}
      width="512"
      height="512"
      className={cn('w-auto object-contain', height)}
      loading="eager"
      decoding="async"
    />
  ) : (
    <img
      src={LOCKUP}
      alt={ALT}
      width="931"
      height="160"
      className={cn('w-auto object-contain', height)}
      loading="eager"
      decoding="async"
    />
  )

  if (!to) return <span className={cn('inline-flex items-center', className)}>{image}</span>

  return (
    <Link
      to={to}
      aria-label="Coach Auto dashboard — home"
      className={cn(
        'inline-flex items-center rounded-sm transition-opacity duration-200 hover:opacity-85',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500',
        className,
      )}
    >
      {image}
    </Link>
  )
}