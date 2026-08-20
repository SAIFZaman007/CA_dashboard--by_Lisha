import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Apple, Plus, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { DAY_LABELS, cn, formatDate } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, ListInput, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const BLANK_MEAL = (dayOfWeek) => ({
  day_of_week: dayOfWeek,
  name: 'Meal',
  serve_time: null,
  icon: null,
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  notes: null,
  items: [''],
})

function blankPlan(profile) {
  return {
    name: 'Meal plan',
    phase: profile?.goal ?? 'cut',
    calorie_target: profile?.calorie_target ?? 2000,
    protein_target_g: profile?.protein_target_g ?? 150,
    carb_target_g: profile?.carb_target_g ?? 180,
    fat_target_g: profile?.fat_target_g ?? 60,
    notes: '',
    is_active: true,
    meals: [BLANK_MEAL(0)],
  }
}

function MealPlanEditor({ onClose, clientId, plan, profile }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(plan ?? blankPlan(profile))
  const [day, setDay] = useState(0)


  const mealsForDay = draft.meals
    .map((meal, index) => ({ meal, index }))
    .filter(({ meal }) => meal.day_of_week === day)

  function setMeal(index, next) {
    setDraft((d) => ({ ...d, meals: d.meals.map((m, i) => (i === index ? next : m)) }))
  }

  // The running total is the whole point of this screen: the coach needs to see
  // the day land on target while they type, not after they save.
  const dayTotals = useMemo(
    () =>
      mealsForDay.reduce(
        (sum, { meal }) => ({
          calories: sum.calories + (Number(meal.calories) || 0),
          protein: sum.protein + (Number(meal.protein_g) || 0),
          carbs: sum.carbs + (Number(meal.carbs_g) || 0),
          fat: sum.fat + (Number(meal.fat_g) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [mealsForDay],
  )

  const payload = useMemo(
    () => ({
      name: draft.name,
      phase: draft.phase,
      calorie_target: Number(draft.calorie_target) || 2000,
      protein_target_g: Number(draft.protein_target_g) || 0,
      carb_target_g: Number(draft.carb_target_g) || 0,
      fat_target_g: Number(draft.fat_target_g) || 0,
      notes: draft.notes || null,
      is_active: draft.is_active,
      meals: draft.meals.map((meal) => ({
        day_of_week: meal.day_of_week,
        name: meal.name,
        serve_time: meal.serve_time || null,
        icon: meal.icon || null,
        calories: Number(meal.calories) || 0,
        protein_g: Number(meal.protein_g) || 0,
        carbs_g: Number(meal.carbs_g) || 0,
        fat_g: Number(meal.fat_g) || 0,
        notes: meal.notes || null,
        items: (meal.items ?? []).map((item) => item.trim()).filter(Boolean),
      })),
    }),
    [draft],
  )

  const save = useMutation({
    mutationFn: () =>
      plan?.id ? api.nutrition.replace(plan.id, payload) : api.nutrition.create(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mealPlans(clientId) })
      queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
      toast.success(plan?.id ? 'Meal plan saved' : 'Meal plan assigned')
      onClose()
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const off = dayTotals.calories - (Number(draft.calorie_target) || 0)

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={plan?.id ? 'Edit meal plan' : 'New meal plan'}
      description={`${draft.meals.length} meal${draft.meals.length === 1 ? '' : 's'} across the week`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            disabled={!draft.name || draft.meals.length === 0}
            onClick={() => save.mutate()}
          >
            {plan?.id ? 'Save plan' : 'Assign plan'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Plan name"
            required
            value={draft.name}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          />
          <Select
            label="Phase"
            value={draft.phase}
            onChange={(event) => setDraft((d) => ({ ...d, phase: event.target.value }))}
          >
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="build">Build</option>
          </Select>
          <Input
            label="Daily calories"
            type="number"
            value={draft.calorie_target}
            onChange={(event) => setDraft((d) => ({ ...d, calorie_target: event.target.value }))}
          />
          <Input
            label="Protein"
            type="number"
            suffix="g"
            value={draft.protein_target_g}
            onChange={(event) => setDraft((d) => ({ ...d, protein_target_g: event.target.value }))}
          />
          <Input
            label="Carbs"
            type="number"
            suffix="g"
            value={draft.carb_target_g}
            onChange={(event) => setDraft((d) => ({ ...d, carb_target_g: event.target.value }))}
          />
          <Input
            label="Fat"
            type="number"
            suffix="g"
            value={draft.fat_target_g}
            onChange={(event) => setDraft((d) => ({ ...d, fat_target_g: event.target.value }))}
          />
        </div>

        <Textarea
          label="Notes for the client"
          rows={2}
          value={draft.notes ?? ''}
          onChange={(event) => setDraft((d) => ({ ...d, notes: event.target.value }))}
          hint="Swaps, hydration, anything they should know before they shop."
        />

        <div>
          <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-none">
            {DAY_LABELS.map((label, index) => {
              const count = draft.meals.filter((meal) => meal.day_of_week === index).length
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={day === index}
                  onClick={() => setDay(index)}
                  className={cn(
                    'shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition',
                    day === index
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-ink-600 bg-ink-900 text-chalk-400 hover:border-ink-500 hover:text-white',
                  )}
                >
                  {label}
                  {count > 0 && <span className="ml-1.5 tabular-nums opacity-60">{count}</span>}
                </button>
              )
            })}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-xs">
            <span className="text-chalk-500">
              {DAY_LABELS[day]} total:{' '}
              <span className="font-semibold tabular-nums text-chalk-100">
                {dayTotals.calories} kcal
              </span>
            </span>
            <span
              className={cn(
                'tabular-nums font-medium',
                Math.abs(off) <= 75 ? 'text-signal-green' : 'text-signal-amber',
              )}
            >
              {off === 0 ? 'On target' : `${off > 0 ? '+' : ''}${off} vs target`}
            </span>
            <span className="tabular-nums text-chalk-500">
              P {dayTotals.protein} · C {dayTotals.carbs} · F {dayTotals.fat}
            </span>
          </div>

          <div className="space-y-3">
            {mealsForDay.map(({ meal, index }) => (
              <div key={index} className="rounded-lg border border-ink-600 bg-ink-850 p-4">
                <div className="grid gap-2 sm:grid-cols-12">
                  <Input
                    className="sm:col-span-4"
                    label="Meal"
                    value={meal.name}
                    onChange={(event) => setMeal(index, { ...meal, name: event.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    label="Time"
                    type="time"
                    value={meal.serve_time ?? ''}
                    onChange={(event) =>
                      setMeal(index, { ...meal, serve_time: event.target.value || null })
                    }
                  />
                  <Input
                    className="sm:col-span-2"
                    label="Calories"
                    type="number"
                    value={meal.calories}
                    onChange={(event) => setMeal(index, { ...meal, calories: event.target.value })}
                  />
                  <Input
                    className="sm:col-span-1"
                    label="P"
                    type="number"
                    value={meal.protein_g}
                    onChange={(event) => setMeal(index, { ...meal, protein_g: event.target.value })}
                  />
                  <Input
                    className="sm:col-span-1"
                    label="C"
                    type="number"
                    value={meal.carbs_g}
                    onChange={(event) => setMeal(index, { ...meal, carbs_g: event.target.value })}
                  />
                  <Input
                    className="sm:col-span-1"
                    label="F"
                    type="number"
                    value={meal.fat_g}
                    onChange={(event) => setMeal(index, { ...meal, fat_g: event.target.value })}
                  />
                  <div className="flex items-end sm:col-span-1 sm:justify-end">
                    <IconButton
                      label={`Remove ${meal.name}`}
                      icon={Trash2}
                      variant="danger"
                      onClick={() =>
                        setDraft((d) => ({ ...d, meals: d.meals.filter((_, i) => i !== index) }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <ListInput
                    label="What's on the plate"
                    values={meal.items ?? []}
                    onChange={(items) => setMeal(index, { ...meal, items })}
                    placeholder="1 cup oats"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setDraft((d) => ({ ...d, meals: [...d.meals, BLANK_MEAL(day)] }))}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add meal to {DAY_LABELS[day]}
            </Button>

            {mealsForDay.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    // Most weeks repeat. Copying is faster than retyping six meals.
                    meals: [
                      ...d.meals.filter((meal) => meal.day_of_week !== (day + 1) % 7),
                      ...mealsForDay.map(({ meal }) => ({
                        ...meal,
                        day_of_week: (day + 1) % 7,
                      })),
                    ],
                  }))
                }
              >
                Copy to {DAY_LABELS[(day + 1) % 7]}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function NutritionTab({ clientId, detail }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.mealPlans(clientId),
    queryFn: () => api.nutrition.plans(clientId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: keys.mealPlans(clientId) })
    queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
  }

  const activate = useMutation({
    mutationFn: (planId) => api.nutrition.activate(planId),
    onSuccess: () => {
      invalidate()
      toast.success('Meal plan is now live')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const remove = useMutation({
    mutationFn: (planId) => api.nutrition.remove(planId),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Meal plan deleted')
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
          title="Meal plans"
          description="One plan is live at a time. Targets default to whatever is on their profile."
          action={
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden="true" />
              New meal plan
            </Button>
          }
        />

        {isPending ? (
          <CardBody className="space-y-2">
            {Array.from({ length: 2 }, (_, index) => (
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
                      <Badge tone="neutral" className="capitalize">
                        {plan.phase}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-chalk-500">
                      {plan.calorie_target} kcal · P {plan.protein_target_g} · C{' '}
                      {plan.carb_target_g} · F {plan.fat_target_g} · {plan.meals.length} meals ·
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
                      label="Delete meal plan"
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setDeleting(plan)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Apple}
            title="No meal plan assigned"
            description="Write the week once and it appears on their meal plan page, day by day, with tick-box tracking."
            action={
              <Button size="sm" onClick={() => setEditing('new')}>
                Write a meal plan
              </Button>
            }
          />
        )}
      </Card>

      {/* Mounted only while open, so every edit starts from a clean draft
          rather than being reset by an effect after the fact. */}
      {editing !== null && (
        <MealPlanEditor
          onClose={() => setEditing(null)}
          clientId={clientId}
          plan={editing === 'new' ? null : editing}
          profile={detail?.profile}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this meal plan"
        confirmLabel="Delete plan"
        message={`"${deleting?.name}" and all its meals will be removed. Their logged adherence history is kept.`}
      />
    </>
  )
}