import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ExternalLink, Inbox } from 'lucide-react'

import { api } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, initials, relativeDays } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { ThreadView } from '@/pages/clients/tabs/MessagesTab'

/**
 * The inbox: every conversation on the left, the open one on the right.
 *
 * Below `lg` the two panes stack — the list collapses once a thread is picked,
 * because a 380px screen cannot usefully show both at once.
 */
export default function MessagesPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const params = { unread_only: unreadOnly }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.threads(params),
    queryFn: () => api.inbox.threads(params),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })

  const active = selected ?? data?.[0] ?? null

  return (
    <>
      <PageHeader
        eyebrow="Coach inbox"
        title="Messages"
        description="Every client conversation in one place. Opening a thread marks it read."
      />

      {isError ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Thread list */}
          <Card className={cn('overflow-hidden', active && 'hidden lg:block')}>
            <div className="flex items-center justify-between gap-2 border-b border-ink-600 p-3">
              <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-500">
                {data ? `${data.length} conversations` : 'Conversations'}
              </p>
              <button
                type="button"
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly((value) => !value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                  unreadOnly
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-ink-600 text-chalk-500 hover:text-white',
                )}
              >
                Unread only
              </button>
            </div>

            {isPending ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-14" />
                ))}
              </div>
            ) : data.length ? (
              <ul className="max-h-[62dvh] divide-y divide-ink-700 overflow-y-auto">
                {data.map((thread) => {
                  const isActive = active?.thread_id === thread.thread_id
                  return (
                    <li key={thread.thread_id}>
                      <button
                        type="button"
                        onClick={() => setSelected(thread)}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                          isActive ? 'bg-ink-800' : 'hover:bg-ink-800',
                        )}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-700 text-[11px] font-bold text-chalk-200">
                          {initials(thread.client_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-chalk-50">
                              {thread.client_name}
                            </span>
                            <span className="shrink-0 text-[11px] text-chalk-500">
                              {relativeDays(thread.last_message_at, { never: '—' })}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs text-chalk-500">
                              {thread.preview || 'No messages yet'}
                            </span>
                            {thread.unread > 0 && <Badge tone="red">{thread.unread}</Badge>}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Inbox}
                title={unreadOnly ? 'Nothing unread' : 'No conversations yet'}
                description={
                  unreadOnly
                    ? 'Every client message has been read. Turn the filter off to see the rest.'
                    : 'A thread opens the first time you or a client sends a message.'
                }
              />
            )}
          </Card>

          {/* Open thread */}
          <Card className="overflow-hidden">
            {active ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-ink-600 px-4 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="mb-0.5 text-xs text-chalk-500 hover:text-white lg:hidden"
                    >
                      ← All conversations
                    </button>
                    <p className="truncate font-display text-lg text-white">
                      {active.client_name}
                    </p>
                    <p className="truncate text-xs text-chalk-500">{active.subject}</p>
                  </div>
                  <Link
                    to={`/clients/${active.client_id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 text-xs text-chalk-400 transition hover:border-ink-500 hover:text-white"
                  >
                    Open record
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <ThreadView clientId={active.client_id} className="h-[58dvh]" />
              </>
            ) : (
              <EmptyState
                icon={Inbox}
                title="Pick a conversation"
                description="Choose someone from the list to read and reply to their messages."
              />
            )}
          </Card>
        </div>
      )}
    </>
  )
}