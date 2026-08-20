import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Trash2, UserPlus } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, formatDateTime, LEVEL_LABELS, relativeDays } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState, ErrorState, StatusDot } from '@/components/ui/Feedback'
import { ConfirmDialog } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const STATUSES = [
  { value: 'new', label: 'New', tone: 'amber' },
  { value: 'contacted', label: 'Contacted', tone: 'blue' },
  { value: 'converted', label: 'Converted', tone: 'green' },
  { value: 'closed', label: 'Closed', tone: 'grey' },
]

const toneFor = (status) => STATUSES.find((s) => s.value === status)?.tone ?? 'neutral'

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [removing, setRemoving] = useState(null)

  const params = filter ? { status_filter: filter } : {}
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.leads(params),
    queryFn: () => api.inbox.leads(params),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.inbox.updateLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Enquiry updated')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const destroy = useMutation({
    mutationFn: (lead) => api.inbox.removeLead(lead.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Enquiry deleted')
      setRemoving(null)
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const columns = [
    {
      key: 'person',
      header: 'Enquiry',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-chalk-50">{row.full_name}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-chalk-500">
            <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 hover:text-brand-400">
              <Mail className="size-3" aria-hidden="true" />
              {row.email}
            </a>
            {row.phone && (
              <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 hover:text-brand-400">
                <Phone className="size-3" aria-hidden="true" />
                {row.phone}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'goal',
      header: 'Wants',
      render: (row) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate text-chalk-200">{row.primary_goal || '—'}</p>
          <p className="text-xs text-chalk-500">
            {row.level_interest ? LEVEL_LABELS[row.level_interest] : 'No level stated'}
          </p>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <p className="line-clamp-2 max-w-sm text-xs text-chalk-400">{row.message || '—'}</p>
      ),
    },
    {
      key: 'when',
      header: 'Received',
      render: (row) => (
        <div>
          <p className="text-chalk-200">{relativeDays(row.created_at)}</p>
          <p className="text-xs text-chalk-500">{formatDateTime(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <select
          value={row.status}
          aria-label={`Status for ${row.full_name}`}
          onChange={(event) => setStatus.mutate({ id: row.id, status: event.target.value })}
          className={cn(
            'rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-white',
            'focus:border-brand-500 focus:outline-none',
          )}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '56px',
      render: (row) => (
        <IconButton label="Delete enquiry" icon={Trash2} onClick={() => setRemoving(row)} />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.length} enquiries` : 'Pipeline'}
        title="Enquiries"
        description="Everyone who filled in the form on the website."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 p-3">
          <button
            type="button"
            aria-pressed={filter === ''}
            onClick={() => setFilter('')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              filter === ''
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-ink-600 text-chalk-400 hover:text-white',
            )}
          >
            All
          </button>
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(filter === option.value ? '' : option.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                filter === option.value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-600 text-chalk-400 hover:text-white',
              )}
            >
              <StatusDot tone={option.tone}>{option.label}</StatusDot>
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={isPending}
            getKey={(row) => row.id}
            rail={(row) => (row.status === 'new' ? 'rail-slipping' : 'rail-none')}
            mobile={(row) => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-chalk-50">{row.full_name}</p>
                  <StatusDot tone={toneFor(row.status)}>
                    {STATUSES.find((s) => s.value === row.status)?.label}
                  </StatusDot>
                </div>
                <p className="mt-0.5 truncate text-xs text-chalk-500">
                  {row.email} · {relativeDays(row.created_at)}
                </p>
              </div>
            )}
            empty={
              <EmptyState
                icon={UserPlus}
                title={filter ? 'Nothing at that status' : 'No enquiries yet'}
                description={
                  filter
                    ? 'Clear the filter to see the rest of the pipeline.'
                    : 'Enquiries land here the moment someone submits the form on the website.'
                }
              />
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => destroy.mutate(removing)}
        loading={destroy.isPending}
        title="Delete this enquiry?"
        confirmLabel="Delete enquiry"
        message={`${removing?.full_name}'s enquiry will be removed permanently. Mark it Closed instead if you may want the record later.`}
      />
    </>
  )
}