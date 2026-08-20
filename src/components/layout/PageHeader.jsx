import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export function PageHeader({ eyebrow, title, description, action, back, className }) {
  return (
    <header className={cn('mb-6', className)}>
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-chalk-500 transition hover:text-white"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-chalk-400">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  )
}