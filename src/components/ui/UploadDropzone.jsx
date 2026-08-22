import { useCallback, useRef, useState } from 'react'
import { CloudUpload, FileVideo, ImageIcon, X } from 'lucide-react'

import { http, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Feedback'

/**
 * Drag-and-drop or click-to-browse uploader with a real progress bar.
 *
 * Two things make this worth a component rather than an <input type="file">.
 *
 * A coach uploading a 300 MB lift demo on gym wi-fi needs to see that something
 * is happening — without progress, a slow upload is indistinguishable from a
 * frozen page, and people give up or double-submit. Axios `onUploadProgress`
 * gives real bytes-sent, so the bar means something.
 *
 * And the file is sent on its own, before the surrounding form is submitted. If
 * the title fails validation afterwards, the coach fixes the title; they do not
 * re-send 300 MB.
 */
export function UploadDropzone({
  accept = 'video/*',
  endpoint = '/admin/tutorials/upload',
  label = 'Drag a video here',
  hint = 'MP4, MOV or WebM',
  maxMb = 512,
  kind = 'video',
  value = null,
  onUploaded,
  onCleared,
  disabled,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  const Icon = kind === 'video' ? FileVideo : ImageIcon

  const upload = useCallback(
    async (file) => {
      setError(null)

      // Check the size here as well as on the server. Rejecting a 900 MB file
      // after it has been pushed across a phone connection is not a rejection
      // the person will thank you for.
      if (file.size > maxMb * 1024 * 1024) {
        setError(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB — the limit is ${maxMb} MB.`)
        return
      }

      const body = new FormData()
      body.append('file', file)
      setProgress(0)

      try {
        const { data } = await http.post(endpoint, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
          // A large upload legitimately takes minutes; the default timeout
          // would abort it partway and report a network error.
          timeout: 0,
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
          },
        })
        setProgress(100)
        onUploaded?.(data, file)
      } catch (failure) {
        setError(errorMessage(failure, 'That upload did not finish. Try again.'))
        setProgress(null)
      }
    },
    [endpoint, maxMb, onUploaded],
  )

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = event.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  const busy = progress !== null && progress < 100

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-ink-600 bg-ink-900 p-3">
        <Icon className="size-5 shrink-0 text-signal-green" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-chalk-50">{value.name}</p>
          {value.detail && <p className="truncate text-xs text-chalk-500">{value.detail}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            onCleared?.()
            setProgress(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          aria-label="Remove this file"
          className="shrink-0 rounded-md p-1.5 text-chalk-500 transition hover:bg-ink-700 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={label}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-ink-600 bg-ink-900 hover:border-ink-500',
          (disabled || busy) && 'pointer-events-none opacity-60',
        )}
      >
        {busy ? (
          <>
            <Spinner />
            <p className="text-sm text-chalk-200">Uploading… {progress}%</p>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </>
        ) : (
          <>
            <CloudUpload className="size-7 text-chalk-500" aria-hidden="true" />
            <p className="text-sm font-medium text-chalk-200">
              {label} <span className="text-chalk-500">or</span>{' '}
              <span className="text-brand-400 underline">browse</span>
            </p>
            <p className="text-xs text-chalk-500">
              {hint} · up to {maxMb} MB
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload(file)
        }}
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-brand-400">
          {error}
        </p>
      )}
    </div>
  )
}