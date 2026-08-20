import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal with a real focus trap.
 *
 * Most of the destructive controls in this dashboard live inside one of these,
 * so tab must not be able to wander out onto the client record behind it and
 * let someone press a button they cannot see.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null)
  const restoreFocusTo = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    restoreFocusTo.current = document.activeElement
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!nodes?.length) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // Land on the first real control, not on the panel itself.
    const target = panelRef.current?.querySelector(FOCUSABLE) ?? panelRef.current
    target?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      restoreFocusTo.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const width = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative my-auto w-full rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/60 focus:outline-none',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-600 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-chalk-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-chalk-500 transition hover:bg-ink-700 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-600 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Confirm before anything irreversible.
 *
 * `confirmWord` turns this into a type-to-confirm gate. Deleting a client
 * record erases every weight, photo and session with it, so that one asks the
 * coach to type the person's name rather than letting a stray click do it.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  confirmWord,
  loading,
  typed,
  onTypedChange,
}) {
  const locked = confirmWord ? typed?.trim() !== confirmWord : false

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            disabled={locked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-chalk-200">{message}</p>

      {confirmWord && (
        <div className="mt-4">
          <label
            htmlFor="confirm-word"
            className="mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-400"
          >
            Type <span className="text-brand-400">{confirmWord}</span> to confirm
          </label>
          <input
            id="confirm-word"
            value={typed ?? ''}
            onChange={(event) => onTypedChange?.(event.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}
    </Modal>
  )
}