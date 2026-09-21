import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dumbbell, ExternalLink, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'

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

/**
 * Both browse axes — muscle group and equipment — come from
 * `/exercises/filters`, which also returns how many movements sit under each.
 * The lists used to be hard-coded here (eight equipment types, no muscle
 * group at all), so every piece of equipment the library gained on the server
 * was invisible in the dashboard. Reading them from the API keeps the two in
 * lock-step and lets each option show its count.
 */
function useFacets() {
  return useQuery({
    queryKey: ['exercises', 'filters'],
    queryFn: api.exercises.filters,
    staleTime: 5 * 60_000,
  })
}

const FILTER_CLASS =
  'rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none'

const BLANK = {
  name: '',
  target_muscle: '',
  muscle_group: '',
  secondary_muscles: [],
  equipment: 'bodyweight',
  video_url: '',
  instructions: '',
  coaching_cue: '',
  min_level: 'level_1',
}

function ExerciseForm({ open, exercise, onClose }) {
  const queryClient = useQueryClient()
  const editing = Boolean(exercise)
  const { data: facets } = useFacets()
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
    // Both are required by the API; say so here rather than surface a 422.
    if (!form.muscle_group) return setError('Choose the muscle group this movement trains.')
    if (!form.video_url.trim()) {
      return setError('Add a demonstration video link — clients see it on their workout screen.')
    }
    save.mutate({
      name: form.name,
      muscle_group: form.muscle_group,
      target_muscle: form.target_muscle,
      secondary_muscles: (form.secondary_muscles ?? []).map((m) => m.trim()).filter(Boolean),
      equipment: form.equipment,
      video_url: form.video_url.trim(),
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
        <Input label="Name" name="name" required value={form.name} onChange={set('name')} placeholder="Barbell back squat" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Muscle group"
            name="muscle_group"
            required
            value={form.muscle_group}
            onChange={set('muscle_group')}
          >
            <option value="" disabled>
              Choose…
            </option>
            {(facets?.muscle_groups ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Target muscle"
            name="target_muscle"
            required
            value={form.target_muscle}
            onChange={set('target_muscle')}
            placeholder="Quads"
          />
        </div>

        <Select label="Equipment" name="equipment" value={form.equipment} onChange={set('equipment')}>
          {(facets?.equipment ?? [{ value: form.equipment, label: titleCase(form.equipment) }]).map(
            (option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ),
          )}
        </Select>

        <ListInput
          label="Secondary muscles"
          values={form.secondary_muscles}
          onChange={(secondary_muscles) => setForm({ ...form, secondary_muscles })}
          placeholder="Glutes"
        />

        <Select label="Minimum level" name="min_level" value={form.min_level} onChange={set('min_level')}>
          <option value="level_1">Level 1 and up</option>
          <option value="level_2">Level 2 and up</option>
          <option value="level_3">Level 3 only</option>
        </Select>

        <Input
          label="Demonstration video"
          name="video_url"
          type="url"
          required
          value={form.video_url}
          onChange={set('video_url')}
          placeholder="https://www.muscleandstrength.com/exercises/…"
          hint="A Muscle & Strength, MuscleWiki or YouTube link. For a full lesson with notes, add it under Video Tutorials instead."
        />

        <Input
          label="Coaching cue"
          name="coaching_cue"
          value={form.coaching_cue}
          onChange={set('coaching_cue')}
          placeholder="Chest tall, knees tracking over the toes"
          hint="The one line a client should hold in their head mid-set."
        />

        <Textarea
          label="Instructions"
          name="instructions"
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
  const [muscleGroup, setMuscleGroup] = useState('')
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const params = useMemo(
    () => ({
      // The whole library fits in one response (~650 movements), so filters
      // and search work over everything rather than over the first page.
      limit: 1000,
      ...(debounced && { search: debounced }),
      ...(muscleGroup && { muscle_group: muscleGroup }),
      ...(equipment && { equipment }),
    }),
    [debounced, muscleGroup, equipment],
  )
  const filtered = Boolean(debounced || muscleGroup || equipment)

  const { data: facets } = useFacets()
  const labelFor = useMemo(() => {
    const map = new Map()
    for (const option of [...(facets?.muscle_groups ?? []), ...(facets?.equipment ?? [])]) {
      map.set(option.value, option.label)
    }
    return (value) => map.get(value) ?? titleCase(value)
  }, [facets])

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.exercises(params),
    queryFn: () => api.exercises.list(params),
  })

  const sync = useMutation({
    mutationFn: () => api.exercises.sync(false),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success(
        `Library synced: ${report.created} added, ${report.repaired_links} video links repaired.`,
      )
    },
    onError: (failure) => toast.error(errorMessage(failure)),
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
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-chalk-200">{labelFor(row.muscle_group)}</p>
          <p className="truncate text-xs capitalize text-chalk-500">{row.target_muscle}</p>
        </div>
      ),
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (row) => <Badge>{labelFor(row.equipment)}</Badge>,
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
            rel="noopener noreferrer"
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
        eyebrow={
          data
            ? filtered
              ? `${data.length} of ${facets?.total ?? data.length} movements`
              : `${data.length} movements`
            : 'Library'
        }
        title="Exercise Library"
        description="Every movement a training plan can prescribe."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="subtle"
              loading={sync.isPending}
              onClick={() => sync.mutate()}
              title="Add any new movements from the shipped library and repair its video links. Links you edited are never touched."
            >
              {!sync.isPending && <RefreshCw className="size-4" aria-hidden="true" />}
              Sync library
            </Button>
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden="true" />
              Add movement
            </Button>
          </div>
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
              name="exercise_search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movements"
              aria-label="Search movements"
              className="w-full rounded-md border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <select
            name="muscle_group_filter"
            value={muscleGroup}
            onChange={(event) => setMuscleGroup(event.target.value)}
            aria-label="Filter by muscle group"
            className={FILTER_CLASS}
          >
            <option value="">All muscle groups</option>
            {(facets?.muscle_groups ?? [])
              .filter((option) => option.count > 0)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
          </select>
          <select
            name="equipment_filter"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            aria-label="Filter by equipment"
            className={FILTER_CLASS}
          >
            <option value="">All equipment</option>
            {(facets?.equipment ?? [])
              .filter((option) => option.count > 0)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
          </select>
          {filtered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setMuscleGroup('')
                setEquipment('')
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Clear
            </Button>
          )}
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
                <p className="mt-0.5 text-xs text-chalk-500">
                  {labelFor(row.muscle_group)} · {labelFor(row.equipment)}
                </p>
              </div>
            )}
            empty={
              <EmptyState
                icon={Dumbbell}
                title={filtered ? 'Nothing matches that' : 'The library is empty'}
                description={
                  filtered
                    ? 'Try a different name, muscle group or piece of equipment.'
                    : 'Add the movements you program with. Plans are built from this list.'
                }
                action={
                  !filtered ? (
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