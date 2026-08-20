import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dumbbell, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { LEVEL_LABELS, titleCase } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, ListInput, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
]

const BLANK = {
  name: '',
  target_muscle: '',
  secondary_muscles: [],
  equipment: 'other',
  video_url: '',
  instructions: '',
  coaching_cue: '',
  min_level: 'level_1',
}

function ExerciseForm({ open, exercise, onClose }) {
  const queryClient = useQueryClient()
  const editing = Boolean(exercise)
  const [form, setForm] = useState(
    exercise
      ? {
          ...exercise,
          video_url: exercise.video_url ?? '',
          instructions: exercise.instructions ?? '',
          coaching_cue: exercise.coaching_cue ?? '',
        }
      : BLANK,
  )
  const [error, setError] = useState(null)

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.exercises.update(exercise.id, body) : api.exercises.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success(editing ? 'Movement saved' : 'Movement added')
      onClose()
    },
    onError: (failure) => setError(errorMessage(failure)),
  })

  function submit() {
    setError(null)
    save.mutate({
      name: form.name,
      target_muscle: form.target_muscle,
      secondary_muscles: (form.secondary_muscles ?? []).map((m) => m.trim()).filter(Boolean),
      equipment: form.equipment,
      // The API validates these as URLs, so an empty string must become null.
      video_url: form.video_url || null,
      instructions: form.instructions || null,
      coaching_cue: form.coaching_cue || null,
      min_level: form.min_level,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit movement' : 'Add a movement'}
      description="The library every training plan draws from. Clients see these on their workout screen."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={save.isPending} onClick={submit}>
            {editing ? 'Save movement' : 'Add movement'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Barbell back squat" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Target muscle"
            required
            value={form.target_muscle}
            onChange={set('target_muscle')}
            placeholder="Quads"
          />
          <Select label="Equipment" value={form.equipment} onChange={set('equipment')}>
            {EQUIPMENT.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>

        <ListInput
          label="Secondary muscles"
          values={form.secondary_muscles}
          onChange={(secondary_muscles) => setForm({ ...form, secondary_muscles })}
          placeholder="Glutes"
        />

        <Select label="Minimum level" value={form.min_level} onChange={set('min_level')}>
          <option value="level_1">Level 1 and up</option>
          <option value="level_2">Level 2 and up</option>
          <option value="level_3">Level 3 only</option>
        </Select>

        <Input
          label="Demonstration video"
          value={form.video_url}
          onChange={set('video_url')}
          placeholder="https://www.youtube.com/watch?v=…"
          hint="Optional. For a full lesson with notes, add it under Video Tutorials instead."
        />

        <Input
          label="Coaching cue"
          value={form.coaching_cue}
          onChange={set('coaching_cue')}
          placeholder="Chest tall, knees tracking over the toes"
          hint="The one line a client should hold in their head mid-set."
        />

        <Textarea
          label="Instructions"
          rows={4}
          value={form.instructions}
          onChange={set('instructions')}
        />

        {error && (
          <p role="alert" className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

export default function ExercisesPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [equipment, setEquipment] = useState('')
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const params = useMemo(
    () => ({
      limit: 300,
      ...(debounced && { search: debounced }),
      ...(equipment && { equipment }),
    }),
    [debounced, equipment],
  )

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.exercises(params),
    queryFn: () => api.exercises.list(params),
  })

  const retire = useMutation({
    mutationFn: (exercise) => api.exercises.retire(exercise.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Movement retired')
      setRemoving(null)
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const columns = [
    {
      key: 'name',
      header: 'Movement',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-chalk-50">{row.name}</p>
          {row.coaching_cue && (
            <p className="truncate text-xs text-chalk-500">{row.coaching_cue}</p>
          )}
        </div>
      ),
    },
    {
      key: 'muscle',
      header: 'Target',
      render: (row) => <span className="capitalize text-chalk-200">{row.target_muscle}</span>,
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (row) => <Badge>{titleCase(row.equipment)}</Badge>,
    },
    {
      key: 'level',
      header: 'Level',
      render: (row) => (
        <span className="text-chalk-400">{LEVEL_LABELS[row.min_level] ?? '—'}</span>
      ),
    },
    {
      key: 'video',
      header: 'Video',
      align: 'center',
      render: (row) =>
        row.video_url ? (
          <a
            href={row.video_url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open the demonstration video for ${row.name}`}
            className="inline-flex text-chalk-400 transition hover:text-brand-400"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-chalk-500">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '96px',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton
            label="Edit movement"
            icon={Pencil}
            onClick={(event) => {
              event.stopPropagation()
              setEditing(row)
            }}
          />
          <IconButton
            label="Retire movement"
            icon={Trash2}
            onClick={(event) => {
              event.stopPropagation()
              setRemoving(row)
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.length} movements` : 'Library'}
        title="Exercise Library"
        description="Every movement a training plan can prescribe."
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Add movement
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 p-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-chalk-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movements"
              aria-label="Search movements"
              className="w-full rounded-md border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <select
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            aria-label="Filter by equipment"
            className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="">All equipment</option>
            {EQUIPMENT.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>

        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={isPending}
            getKey={(row) => row.id}
            mobile={(row) => (
              <div>
                <p className="text-sm font-medium text-chalk-50">{row.name}</p>
                <p className="mt-0.5 text-xs capitalize text-chalk-500">
                  {row.target_muscle} · {titleCase(row.equipment)}
                </p>
              </div>
            )}
            empty={
              <EmptyState
                icon={Dumbbell}
                title={debounced ? 'Nothing matches that' : 'The library is empty'}
                description={
                  debounced
                    ? 'Try a different name or muscle group.'
                    : 'Add the movements you program with. Plans are built from this list.'
                }
                action={
                  !debounced ? (
                    <Button size="sm" onClick={() => setEditing('new')}>
                      Add the first movement
                    </Button>
                  ) : null
                }
              />
            }
          />
        )}
      </Card>

      {editing && (
        <ExerciseForm
          open
          key={editing === 'new' ? 'new' : editing.id}
          exercise={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => retire.mutate(removing)}
        loading={retire.isPending}
        title="Retire this movement?"
        confirmLabel="Retire movement"
        message={`"${removing?.name}" will stop appearing when you build a plan. Historic set logs keep referencing it, so nobody's training history changes.`}
      />
    </>
  )
}