import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Mail, Phone, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState, ErrorState, StatusDot } from '@/components/ui/Feedback'
import { Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const STATUSES = [
  { value: 'requested', label: 'Requested', tone: 'amber' },
  { value: 'confirmed', label: 'Confirmed', tone: 'green' },
  { value: 'completed', label: 'Completed', tone: 'blue' },
  { value: 'cancelled', label: 'Cancelled', tone: 'grey' },
]

const toneFor = (status) => STATUSES.find((s) => s.value === status)?.tone ?? 'neutral'

/** A booking is either in the future or it is history — that changes what the
 *  coach can usefully do with it, so the rail says which. */
function railFor(booking) {
  if (booking.status === 'requested') return 'rail-slipping'
  if (booking.status === 'confirmed') return 'rail-current'
  return 'rail-none'
}

function NotesModal({ booking, onClose }) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState(booking?.coach_notes ?? '')

  const save = useMutation({
    mutationFn: (body) => api.inbox.updateBooking(booking.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Notes saved')
      onClose()
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Consultation notes"
      description={`${booking.name} · ${formatDateTime(booking.preferred_at)}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ coach_notes: notes })}>
            Save notes
          </Button>
        </>
      }
    >
      <Textarea
        label="What was discussed"
        rows={6}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        hint="Private to the coaching team. The person who booked never sees this."
      />
    </Modal>
  )
}

export default function BookingsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [editingNotes, setEditingNotes] = useState(null)
  const [removing, setRemoving] = useState(null)

  const params = filter ? { status_filter: filter } : {}
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.bookings(params),
    queryFn: () => api.inbox.bookings(params),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.inbox.updateBooking(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Consultation updated')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const destroy = useMutation({
    mutationFn: (booking) => api.inbox.removeBooking(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Consultation deleted')
      setRemoving(null)
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const columns = [
    {
      key: 'when',
      header: 'Requested slot',
      render: (row) => (
        <div>
          <p className="font-medium text-chalk-50">{formatDateTime(row.preferred_at)}</p>
          <p className="text-xs text-chalk-500">{row.timezone}</p>
        </div>
      ),
    },
    {
      key: 'person',
      header: 'Who',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-chalk-200">{row.name}</p>
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
      key: 'topic',
      header: 'Topic',
      render: (row) => (
        <p className="line-clamp-2 max-w-xs text-xs text-chalk-400">{row.topic || '—'}</p>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => (
        <button
          type="button"
          onClick={() => setEditingNotes(row)}
          className="text-xs font-medium text-brand-400 hover:text-brand-500"
        >
          {row.coach_notes ? 'Edit notes' : 'Add notes'}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <select
          value={row.status}
          aria-label={`Status for ${row.name}'s consultation`}
          onChange={(event) => setStatus.mutate({ id: row.id, status: event.target.value })}
          className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-white focus:border-brand-500 focus:outline-none"
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
        <IconButton label="Delete consultation" icon={Trash2} onClick={() => setRemoving(row)} />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.length} consultations` : 'Pipeline'}
        title="Consultations"
        description="Discovery calls booked from the website."
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
            rail={railFor}
            mobile={(row) => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-chalk-50">{row.name}</p>
                  <StatusDot tone={toneFor(row.status)}>
                    {STATUSES.find((s) => s.value === row.status)?.label}
                  </StatusDot>
                </div>
                <p className="mt-0.5 truncate text-xs text-chalk-500">
                  {formatDateTime(row.preferred_at)}
                </p>
              </div>
            )}
            empty={
              <EmptyState
                icon={CalendarClock}
                title={filter ? 'Nothing at that status' : 'No consultations booked'}
                description={
                  filter
                    ? 'Clear the filter to see the rest.'
                    : 'Requests appear here as soon as someone books a call from the website.'
                }
              />
            }
          />
        )}
      </Card>

      {editingNotes && (
        <NotesModal booking={editingNotes} onClose={() => setEditingNotes(null)} />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => destroy.mutate(removing)}
        loading={destroy.isPending}
        title="Delete this consultation?"
        confirmLabel="Delete consultation"
        message={`${removing?.name}'s booking will be removed permanently, notes included. Mark it Cancelled instead to keep the record.`}
      />
    </>
  )
}