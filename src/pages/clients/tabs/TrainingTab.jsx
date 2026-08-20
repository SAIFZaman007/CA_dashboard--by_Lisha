import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Dumbbell, Plus, Search, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { DAY_LABELS, cn, formatDate, titleCase } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const BLANK_DAY = () => ({
  label: 'Day A',
  focus: 'Full body',
  day_of_week: null,
  estimated_minutes: 55,
  exercises: [],
})

const BLANK_PLAN = () => ({
  name: 'Week 1',
  level: 'level_1',
  week_number: 1,
  total_weeks: 12,
  notes: '',
  is_active: true,
  days: [BLANK_DAY()],
})

const DAY_NAMES = ['Day A', 'Day B', 'Day C', 'Day D', 'Day E', 'Day F', 'Day G']

/** Picks a movement out of the shared exercise library. */
function ExercisePicker({ open, onClose, onPick }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isPending } = useQuery({
    queryKey: keys.exercises({ search: debounced, limit: 100 }),
    queryFn: () => api.exercises.list({ search: debounced || undefined, limit: 100 }),
    enabled: open,
  })

  return (
    <Modal open={open} onClose={onClose} title="Add a movement" size="md">
      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-chalk-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the exercise library"
          aria-label="Search the exercise library"
          className="w-full rounded-md border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-11" />
          ))}
        </div>
      ) : data?.length ? (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {data.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-ink-600 px-3 py-2 text-left transition hover:border-brand-500 hover:bg-ink-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-chalk-50">
                    {exercise.name}
                  </span>
                  <span className="block truncate text-xs capitalize text-chalk-500">
                    {exercise.target_muscle} · {titleCase(exercise.equipment)}
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-chalk-500" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Nothing matches that"
          description="Try a different name, or add the movement under Exercise Library first."
        />
      )}
    </Modal>
  )
}

/**
 * Builds one training block.
 *
 * The whole block is edited as a document and saved once, because that is how a
 * coach thinks about it: shuffle a day, change three rep ranges, then commit.
 * The API replaces the nested structure in a single transaction, so a client
 * can never open a half-written programme.
 *
 * This component is mounted only while the editor is open, which is what keeps
 * each edit starting from a clean draft — no effect resetting state after the
 * fact, no stale plan flashing up on second open.
 */
function PlanEditor({ onClose, clientId, plan }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(plan ?? BLANK_PLAN())
  const [picking, setPicking] = useState(null) // day index awaiting a movement

  function setDay(index, next) {
    setDraft((d) => ({ ...d, days: d.days.map((day, i) => (i === index ? next : day)) }))
  }

  function setExercise(dayIndex, exIndex, patch) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              exercises: day.exercises.map((item, j) =>
                j === exIndex ? { ...item, ...patch } : item,
              ),
            },
      ),
    }))
  }

  const payload = useMemo(
    () => ({
      name: draft.name,
      level: draft.level,
      week_number: Number(draft.week_number) || 1,
      total_weeks: Number(draft.total_weeks) || 12,
      notes: draft.notes || null,
      is_active: draft.is_active,
      days: draft.days.map((day) => ({
        label: day.label,
        focus: day.focus,
        day_of_week: day.day_of_week,
        estimated_minutes: Number(day.estimated_minutes) || 55,
        exercises: day.exercises.map((item) => ({
          exercise_id: item.exercise_id,
          sets: Number(item.sets) || 3,
          rep_range: item.rep_range || '8-12',
          rest_seconds: Number(item.rest_seconds) || 60,
          tempo: item.tempo || null,
          target_weight_kg: item.target_weight_kg ? Number(item.target_weight_kg) : null,
          coach_note: item.coach_note || null,
        })),
      })),
    }),
    [draft],
  )

  const save = useMutation({
    mutationFn: () =>
      plan?.id ? api.training.replace(plan.id, payload) : api.training.create(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.plans(clientId) })
      queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
      toast.success(plan?.id ? 'Block saved' : 'Block created')
      onClose()
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const totalMovements = draft.days.reduce((sum, day) => sum + day.exercises.length, 0)

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={plan?.id ? 'Edit training block' : 'New training block'}
        description={`${draft.days.length} day${draft.days.length === 1 ? '' : 's'} · ${totalMovements} movement${totalMovements === 1 ? '' : 's'}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              {plan?.id ? 'Save block' : 'Create block'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Block name"
              required
              value={draft.name}
              onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
            />
            <Select
              label="Level"
              value={draft.level}
              onChange={(event) => setDraft((d) => ({ ...d, level: event.target.value }))}
            >
              <option value="level_1">Level 1</option>
              <option value="level_2">Level 2</option>
              <option value="level_3">Level 3</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Week"
              type="number"
              min="1"
              value={draft.week_number}
              onChange={(event) => setDraft((d) => ({ ...d, week_number: event.target.value }))}
            />
            <Input
              label="Of weeks"
              type="number"
              min="1"
              value={draft.total_weeks}
              onChange={(event) => setDraft((d) => ({ ...d, total_weeks: event.target.value }))}
            />
            <Select
              label="Status"
              value={draft.is_active ? 'live' : 'draft'}
              onChange={(event) =>
                setDraft((d) => ({ ...d, is_active: event.target.value === 'live' }))
              }
              hint="Making this live retires the previous block."
            >
              <option value="live">Live for this client</option>
              <option value="draft">Draft</option>
            </Select>
          </div>

          <Textarea
            label="Notes for the client"
            rows={2}
            value={draft.notes ?? ''}
            onChange={(event) => setDraft((d) => ({ ...d, notes: event.target.value }))}
            hint="Shown at the top of their workout page."
          />

          <div className="space-y-4">
            {draft.days.map((day, dayIndex) => (
              <div key={dayIndex} className="rounded-lg border border-ink-600 bg-ink-900 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Input
                    label="Day"
                    className="w-28"
                    value={day.label}
                    onChange={(event) => setDay(dayIndex, { ...day, label: event.target.value })}
                  />
                  <Input
                    label="Focus"
                    className="min-w-0 flex-1"
                    value={day.focus}
                    onChange={(event) => setDay(dayIndex, { ...day, focus: event.target.value })}
                  />
                  <Select
                    label="Scheduled"
                    className="w-36"
                    value={day.day_of_week ?? ''}
                    onChange={(event) =>
                      setDay(dayIndex, {
                        ...day,
                        day_of_week: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">Any day</option>
                    {DAY_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Minutes"
                    type="number"
                    className="w-24"
                    value={day.estimated_minutes}
                    onChange={(event) =>
                      setDay(dayIndex, { ...day, estimated_minutes: event.target.value })
                    }
                  />
                  <IconButton
                    label={`Remove ${day.label}`}
                    icon={Trash2}
                    variant="danger"
                    className="mt-7"
                    onClick={() =>
                      setDraft((d) => ({ ...d, days: d.days.filter((_, i) => i !== dayIndex) }))
                    }
                  />
                </div>

                {day.exercises.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {day.exercises.map((item, exIndex) => (
                      <li
                        key={`${item.exercise_id}-${exIndex}`}
                        className="flex flex-wrap items-end gap-2 rounded-md border border-ink-700 bg-ink-850 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-chalk-50">
                            {item.exercise_name}
                          </p>
                          <p className="truncate text-xs capitalize text-chalk-500">
                            {item.target_muscle}
                          </p>
                        </div>
                        <Input
                          label="Sets"
                          type="number"
                          min="1"
                          className="w-16"
                          value={item.sets}
                          onChange={(event) =>
                            setExercise(dayIndex, exIndex, { sets: event.target.value })
                          }
                        />
                        <Input
                          label="Reps"
                          className="w-20"
                          value={item.rep_range}
                          onChange={(event) =>
                            setExercise(dayIndex, exIndex, { rep_range: event.target.value })
                          }
                        />
                        <Input
                          label="Rest"
                          type="number"
                          min="0"
                          className="w-20"
                          suffix="s"
                          value={item.rest_seconds}
                          onChange={(event) =>
                            setExercise(dayIndex, exIndex, { rest_seconds: event.target.value })
                          }
                        />
                        <Input
                          label="Cue"
                          className="min-w-32 flex-1"
                          value={item.coach_note ?? ''}
                          onChange={(event) =>
                            setExercise(dayIndex, exIndex, { coach_note: event.target.value })
                          }
                        />
                        <IconButton
                          label={`Remove ${item.exercise_name}`}
                          icon={Trash2}
                          variant="danger"
                          onClick={() =>
                            setDay(dayIndex, {
                              ...day,
                              exercises: day.exercises.filter((_, j) => j !== exIndex),
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="subtle"
                  size="xs"
                  className="mt-3"
                  onClick={() => setPicking(dayIndex)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add movement
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                days: [
                  ...d.days,
                  { ...BLANK_DAY(), label: DAY_NAMES[d.days.length] ?? `Day ${d.days.length + 1}` },
                ],
              }))
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Add a day
          </Button>
        </div>
      </Modal>

      <ExercisePicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(exercise) => {
          const dayIndex = picking
          setDraft((d) => ({
            ...d,
            days: d.days.map((day, i) =>
              i !== dayIndex
                ? day
                : {
                    ...day,
                    exercises: [
                      ...day.exercises,
                      {
                        exercise_id: exercise.id,
                        exercise_name: exercise.name,
                        target_muscle: exercise.target_muscle,
                        sets: 3,
                        rep_range: '8-12',
                        rest_seconds: 60,
                        tempo: null,
                        target_weight_kg: null,
                        coach_note: '',
                      },
                    ],
                  },
            ),
          }))
          setPicking(null)
        }}
      />
    </>
  )
}

export function TrainingTab({ clientId }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null) // null | 'new' | plan object
  const [deleting, setDeleting] = useState(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.plans(clientId),
    queryFn: () => api.training.plans(clientId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: keys.plans(clientId) })
    queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
  }

  const activate = useMutation({
    mutationFn: (planId) => api.training.activate(planId),
    onSuccess: () => {
      invalidate()
      toast.success('Plan is now live for this client')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const duplicate = useMutation({
    mutationFn: (planId) => api.training.duplicate(planId),
    onSuccess: () => {
      invalidate()
      toast.success('Copied — edit the new block and activate it when ready')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const remove = useMutation({
    mutationFn: (planId) => api.training.remove(planId),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Plan deleted')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  if (isError) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Training blocks"
          description="One block is live at a time — that is the one their portal shows."
          action={
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden="true" />
              New block
            </Button>
          }
        />

        {isPending ? (
          <CardBody className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </CardBody>
        ) : data.length ? (
          <ul className="divide-y divide-ink-700">
            {data.map((plan) => (
              <li key={plan.id} className={cn('p-4', plan.is_active && 'bg-brand-500/4')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-lg text-white">{plan.name}</h4>
                      {plan.is_active ? (
                        <Badge tone="green">Live</Badge>
                      ) : (
                        <Badge tone="grey">Draft</Badge>
                      )}
                      {plan.is_custom && <Badge tone="blue">Built by client</Badge>}
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-chalk-500">
                      Week {plan.week_number} of {plan.total_weeks} · {plan.days.length} days ·{' '}
                      {plan.days.reduce((sum, day) => sum + day.exercises.length, 0)} movements ·
                      created {formatDate(plan.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {!plan.is_active && (
                      <Button
                        variant="subtle"
                        size="xs"
                        loading={activate.isPending}
                        onClick={() => activate.mutate(plan.id)}
                      >
                        Make live
                      </Button>
                    )}
                    <Button variant="subtle" size="xs" onClick={() => setEditing(plan)}>
                      Edit
                    </Button>
                    <IconButton
                      label="Copy to next week"
                      icon={Copy}
                      variant="subtle"
                      onClick={() => duplicate.mutate(plan.id)}
                    />
                    <IconButton
                      label="Delete block"
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setDeleting(plan)}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.days.map((day) => (
                    <span
                      key={day.id}
                      className="rounded border border-ink-600 px-2 py-1 text-xs text-chalk-400"
                    >
                      <span className="font-medium text-chalk-200">{day.label}</span> · {day.focus}{' '}
                      <span className="tabular-nums text-chalk-500">
                        ({day.exercises.length})
                      </span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No training assigned yet"
            description="Build their first block. Movements come from the shared exercise library, so every one carries a demo video."
            action={
              <Button size="sm" onClick={() => setEditing('new')}>
                Build a block
              </Button>
            }
          />
        )}
      </Card>

      {/* Mounted only while open, so every edit starts from a clean draft. */}
      {editing !== null && (
        <PlanEditor
          onClose={() => setEditing(null)}
          clientId={clientId}
          plan={editing === 'new' ? null : editing}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this block"
        confirmLabel="Delete block"
        message={`"${deleting?.name}" and all its days and prescriptions will be removed. Sessions the client already logged against it are kept.`}
      />
    </>
  )
}