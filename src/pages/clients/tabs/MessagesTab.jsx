import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, X } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { toast } from '@/components/ui/Toast'

/**
 * Full-size view of one attached photo.
 *
 * Worth the extra component because the thumbnails in the thread are 160px
 * tall, and the whole point of a client photographing their setup is that the
 * coach can see the detail — a knee tracking in, a grip width, a bar path.
 */
function Lightbox({ attachment, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Stop the thread scrolling behind the open image.
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!attachment) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attached photo"
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 rounded-lg border border-white/20 p-2 text-white transition hover:bg-white/10"
      >
        <X className="size-5" />
      </button>
      <img
        src={attachment.url}
        alt={attachment.original_name || 'Photo sent by the client'}
        className="max-h-[88dvh] max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}

function Attachments({ attachments, onOpen }) {
  if (!attachments?.length) return null

  return (
    <div
      className={cn(
        'mt-2 grid gap-1.5',
        attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
      )}
    >
      {attachments.map((attachment) => (
        <button
          key={attachment.id}
          type="button"
          onClick={() => onOpen(attachment)}
          className="overflow-hidden rounded-md border border-ink-600 bg-ink-900 transition hover:border-brand-500"
        >
          <img
            src={attachment.url}
            alt={attachment.original_name || 'Photo sent by the client'}
            // Reserving the box stops the thread jumping as each image lands,
            // which is especially unpleasant mid-scroll through a long history.
            width={attachment.width ?? undefined}
            height={attachment.height ?? undefined}
            loading="lazy"
            className="max-h-40 w-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}

/**
 * One conversation with one client.
 *
 * Opening this marks the client's messages as read server-side — that is what
 * the unread badge in the sidebar counts, and it should not need a second
 * click to clear. The sidebar count is invalidated on load for that reason.
 *
 * Attachment URLs arrive already signed and are short-lived by design, which
 * is why the poll below matters for more than new messages: a thread left open
 * past the token's life refetches and picks up fresh URLs before the images
 * would otherwise start 404ing.
 */
export function ThreadView({ clientId, className }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const endRef = useRef(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.thread(clientId),
    queryFn: () => api.inbox.thread(clientId),
    enabled: Boolean(clientId),
    // An open conversation should feel live. Eight seconds is fast enough that
    // a reply lands while the coach is still looking at the thread, and cheap
    // enough that it is one small request per client being actively read.
    refetchInterval: 8_000,
    // Not while the tab is hidden — a dashboard left open overnight should not
    // spend the night polling.
    refetchIntervalInBackground: false,
  })

  const send = useMutation({
    mutationFn: (body) => api.inbox.reply(clientId, body),
    onSuccess: (message) => {
      // Append locally rather than refetching: the coach should see their reply
      // land the instant it sends, not after a round trip.
      queryClient.setQueryData(keys.thread(clientId), (previous) =>
        previous ? { ...previous, messages: [...previous.messages, message] } : previous,
      )
      queryClient.invalidateQueries({ queryKey: ['threads'] })
      setDraft('')
    },
    onError: (failure) => toast.error(errorMessage(failure, 'That message did not send.')),
  })

  // Reading a thread clears its unread count, so every badge that counts it
  // is now wrong until refetched.
  useEffect(() => {
    if (!data) return
    queryClient.invalidateQueries({ queryKey: ['overview'] })
    queryClient.invalidateQueries({ queryKey: ['threads'] })
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }, [data, queryClient])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [data?.messages?.length])

  function submit(event) {
    event.preventDefault()
    const body = draft.trim()
    if (body) send.mutate({ body })
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex-1 overflow-y-auto p-4">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-16 w-2/3" />
            <Skeleton className="h-16 w-1/2" />
          </div>
        ) : data.messages.length ? (
          <ul className="space-y-3">
            {data.messages.map((message) => (
              <li
                key={message.id}
                className={cn('flex', message.from_coach ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3.5 py-2.5',
                    message.from_coach
                      ? 'bg-brand-500 text-white'
                      : 'border border-ink-600 bg-ink-800 text-chalk-100',
                  )}
                >
                  {/* An image on its own is a complete message, so the text
                      block is skipped rather than rendering an empty line. */}
                  {message.body && (
                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.body}</p>
                  )}

                  <Attachments attachments={message.attachments} onOpen={setLightbox} />

                  <p
                    className={cn(
                      'mt-1.5 text-[11px]',
                      message.from_coach ? 'text-white/70' : 'text-chalk-500',
                    )}
                  >
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Open the conversation. A first message after someone's intake tends to get the best reply rate."
          />
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-ink-600 p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter makes a new line. Coaches write a lot of
            // one-line replies and should not have to reach for the mouse.
            if (event.key === 'Enter' && !event.shiftKey) submit(event)
          }}
          rows={2}
          placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
          aria-label="Reply to this client"
          className="min-h-11 flex-1 resize-y rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
        />
        <Button type="submit" size="sm" loading={send.isPending} disabled={!draft.trim()}>
          <Send className="size-4" aria-hidden="true" />
          Send
        </Button>
      </form>

      <Lightbox attachment={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}

export function MessagesTab({ clientId }) {
  return (
    <Card className="overflow-hidden">
      <ThreadView clientId={clientId} className="h-[62dvh]" />
    </Card>
  )
}

export default MessagesTab