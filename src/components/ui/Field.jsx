import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const baseInput =
  'w-full rounded-md bg-ink-900 border px-3 py-2 text-sm text-white placeholder:text-chalk-500 ' +
  'transition-colors focus:border-brand-500 focus:outline-none disabled:opacity-60'

function Label({ htmlFor, children, required }) {
  if (!children) return null
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-400"
    >
      {children}
      {required && <span className="ml-1 text-brand-500">*</span>}
    </label>
  )
}

function Message({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-brand-400">
        {error}
      </p>
    )
  }
  if (hint) {
    return (
      <p id={id} className="mt-1 text-xs text-chalk-500">
        {hint}
      </p>
    )
  }
  return null
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, type = 'text', suffix, ...props },
  ref,
) {
  const id = useId()
  const messageId = `${id}-message`
  const [reveal, setReveal] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            baseInput,
            error ? 'border-brand-500' : 'border-ink-600',
            (isPassword || suffix) && 'pr-11',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-chalk-500 hover:text-white"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
        {!isPassword && suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-chalk-500">
            {suffix}
          </span>
        )}
      </div>
      <Message id={messageId} error={error} hint={hint} />
    </div>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, children, ...props },
  ref,
) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(baseInput, error ? 'border-brand-500' : 'border-ink-600')}
        {...props}
      >
        {children}
      </select>
      <Message id={messageId} error={error} hint={hint} />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, rows = 4, ...props },
  ref,
) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(baseInput, 'resize-y', error ? 'border-brand-500' : 'border-ink-600')}
        {...props}
      />
      <Message id={messageId} error={error} hint={hint} />
    </div>
  )
})

export function Switch({ label, description, checked, onChange, disabled }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-chalk-200">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-chalk-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'disabled:pointer-events-none disabled:opacity-50',
          checked ? 'bg-brand-500' : 'bg-ink-600',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

/** Segmented choice — level, goal, unit pickers. */
export function ToggleGroup({ label, value, onChange, options, className, columns = 3 }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-600 bg-ink-900 text-chalk-400 hover:border-ink-500 hover:text-white',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A list of free-text lines — meal items, plan features, tutorial tags. */
export function ListInput({ label, values = [], onChange, placeholder, hint, max = 20 }) {
  const id = useId()
  const rows = values.length ? values : ['']

  function setAt(index, next) {
    const copy = [...rows]
    copy[index] = next
    onChange(copy)
  }

  return (
    <div>
      <Label htmlFor={`${id}-0`}>{label}</Label>
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-1.5">
            <input
              id={`${id}-${index}`}
              value={row}
              placeholder={placeholder}
              onChange={(event) => setAt(index, event.target.value)}
              className={cn(baseInput, 'border-ink-600')}
            />
            <button
              type="button"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="shrink-0 rounded-md border border-ink-600 px-2.5 text-chalk-500 transition hover:border-brand-500 hover:text-brand-400"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {rows.length < max && (
        <button
          type="button"
          onClick={() => onChange([...rows, ''])}
          className="mt-2 text-xs font-medium text-brand-400 hover:text-brand-500"
        >
          + Add another
        </button>
      )}
      {hint && <p className="mt-1 text-xs text-chalk-500">{hint}</p>}
    </div>
  )
}