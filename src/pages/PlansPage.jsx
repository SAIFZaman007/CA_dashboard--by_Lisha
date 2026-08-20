import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, GripVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, formatMoney, LEVEL_LABELS } from '@/lib/utils'
import { useIsAdmin } from '@/store/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, ListInput, Select, Switch, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const BLANK = {
  name: '',
  level: 'level_1',
  tagline: '',
  days_per_week: 3,
  session_minutes: 55,
  price_cents: 0,
  billing_period: 'month',
  description: '',
  features: [],
  best_for: '',
  is_active: true,
  is_accepting_clients: true,
  sort_order: 0,
}

/** The form takes dollars because that is what a coach thinks in; the API
 *  takes cents because floating-point money is a bug waiting to happen. */
function PlanForm({ open, plan, onClose }) {
  const queryClient = useQueryClient()
  const editing = Boolean(plan)
  const [form, setForm] = useState(
    plan ? { ...plan, price_dollars: (plan.price_cents / 100).toFixed(2) } : { ...BLANK, price_dollars: '' },
  )
  const [error, setError] = useState(null)

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.programs.update(plan.id, body) : api.programs.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.programs })
      toast.success(editing ? 'Plan saved' : 'Plan created')
      onClose()
    },
    onError: (failure) => setError(errorMessage(failure)),
  })

  function submit() {
    setError(null)
    save.mutate({
      name: form.name,
      level: form.level,
      tagline: form.tagline,
      days_per_week: Number(form.days_per_week),
      session_minutes: Number(form.session_minutes),
      price_cents: Math.round(Number(form.price_dollars || 0) * 100),
      billing_period: form.billing_period,
      description: form.description,
      features: (form.features ?? []).map((f) => f.trim()).filter(Boolean),
      best_for: form.best_for || null,
      is_active: form.is_active,
      is_accepting_clients: form.is_accepting_clients,
      sort_order: Number(form.sort_order ?? 0),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${plan.name}` : 'New pricing plan'}
      description="This is what visitors see on the public pricing page."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={save.isPending} onClick={submit}>
            {editing ? 'Save plan' : 'Create plan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Plan name" required value={form.name} onChange={set('name')} />
          <Select label="Training level" value={form.level} onChange={set('level')}>
            <option value="level_1">Level 1</option>
            <option value="level_2">Level 2</option>
            <option value="level_3">Level 3</option>
          </Select>
        </div>

        <Input
          label="Tagline"
          required
          value={form.tagline}
          onChange={set('tagline')}
          hint="One line under the plan name. Say what the person gets, not how it works."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            required
            suffix="USD"
            value={form.price_dollars}
            onChange={set('price_dollars')}
          />
          <Select label="Billed" value={form.billing_period} onChange={set('billing_period')}>
            <option value="month">per month</option>
            <option value="week">per week</option>
            <option value="once">one-off</option>
          </Select>
          <Input
            label="Order"
            type="number"
            min="0"
            value={form.sort_order}
            onChange={set('sort_order')}
            hint="Lowest shows first."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Training days a week"
            type="number"
            min="1"
            max="7"
            value={form.days_per_week}
            onChange={set('days_per_week')}
          />
          <Input
            label="Session length"
            type="number"
            min="10"
            max="240"
            suffix="min"
            value={form.session_minutes}
            onChange={set('session_minutes')}
          />
        </div>

        <Textarea label="Description" required rows={4} value={form.description} onChange={set('description')} />

        <ListInput
          label="What is included"
          values={form.features}
          onChange={(features) => setForm({ ...form, features })}
          placeholder="Weekly check-in call"
          hint="One benefit per line. These become the ticks on the pricing card."
        />

        <Input
          label="Best for"
          value={form.best_for ?? ''}
          onChange={set('best_for')}
          hint="Optional. e.g. Anyone training three times a week around a full-time job."
        />

        <div className="space-y-3 rounded-lg border border-ink-600 bg-ink-900 p-4">
          <Switch
            label="Listed publicly"
            description="Turn off to hide the plan without deleting it."
            checked={form.is_active}
            onChange={(is_active) => setForm({ ...form, is_active })}
          />
          <Switch
            label="Accepting new clients"
            description="Off shows the plan as full — useful when the roster is at capacity."
            checked={form.is_accepting_clients}
            onChange={(is_accepting_clients) => setForm({ ...form, is_accepting_clients })}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function PlanCard({ plan, onEdit, onArchive, onDelete, canManage }) {
  return (
    <Card
      className={cn(
        'flex flex-col p-5 transition-colors',
        !plan.is_active && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-display text-xl text-white">{plan.name}</h3>
            <Badge tone="neutral">{LEVEL_LABELS[plan.level]}</Badge>
          </div>
          <p className="mt-1 text-sm text-chalk-400">{plan.tagline}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <IconButton label="Edit plan" icon={Pencil} onClick={() => onEdit(plan)} />
            <IconButton
              label={plan.is_active ? 'Archive plan' : 'Restore plan'}
              icon={plan.is_active ? Archive : Check}
              onClick={() => onArchive(plan)}
            />
            <IconButton label="Delete plan" icon={Trash2} onClick={() => onDelete(plan)} />
          </div>
        )}
      </div>

      <p className="mt-4 font-display text-3xl font-bold tabular-nums text-white">
        {formatMoney(plan.price_cents)}
        <span className="ml-1 text-sm font-medium text-chalk-500">
          {plan.billing_period === 'once' ? 'one-off' : `/ ${plan.billing_period}`}
        </span>
      </p>

      <p className="mt-1 text-xs text-chalk-500">
        {plan.days_per_week} days a week · {plan.session_minutes} min sessions
      </p>

      {plan.features?.length > 0 && (
        <ul className="mt-4 flex-1 space-y-1.5">
          {plan.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-chalk-200">
              <Check className="mt-0.5 size-3.5 shrink-0 text-brand-500" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink-700 pt-3">
        <Badge tone={plan.is_active ? 'green' : 'grey'}>
          {plan.is_active ? 'Listed' : 'Archived'}
        </Badge>
        <Badge tone={plan.is_accepting_clients ? 'green' : 'amber'}>
          {plan.is_accepting_clients ? 'Open' : 'Full'}
        </Badge>
        {plan.client_count > 0 && (
          <Badge tone="blue">
            {plan.client_count} client{plan.client_count === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
    </Card>
  )
}

export default function PlansPage() {
  const queryClient = useQueryClient()
  const isAdmin = useIsAdmin()

  const [editing, setEditing] = useState(null) // plan | 'new' | null
  const [removing, setRemoving] = useState(null)
  const [typed, setTyped] = useState('')

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.programs,
    queryFn: api.programs.list,
  })

  const archive = useMutation({
    mutationFn: (plan) =>
      plan.is_active
        ? api.programs.remove(plan.id, false)
        : api.programs.update(plan.id, { is_active: true }),
    onSuccess: (_, plan) => {
      queryClient.invalidateQueries({ queryKey: keys.programs })
      toast.success(plan.is_active ? 'Plan archived' : 'Plan restored')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const destroy = useMutation({
    mutationFn: (plan) => api.programs.remove(plan.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.programs })
      toast.success('Plan deleted')
      setRemoving(null)
      setTyped('')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  return (
    <>
      <PageHeader
        eyebrow="What the business sells"
        title="Pricing Plans"
        description="Add, edit and retire the coaching tiers shown on the public site."
        action={
          isAdmin && (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden="true" />
              New plan
            </Button>
          )
        }
      />

      {isError ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : data.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              canManage={isAdmin}
              onEdit={setEditing}
              onArchive={(target) => archive.mutate(target)}
              onDelete={(target) => {
                setRemoving(target)
                setTyped('')
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Tags}
            title="No pricing plans yet"
            description="Create the tiers you sell — Level 1, Level 2 and so on. These appear on the public pricing page immediately."
            action={
              isAdmin ? (
                <Button size="sm" onClick={() => setEditing('new')}>
                  Create the first plan
                </Button>
              ) : null
            }
          />
        </Card>
      )}

      {!isAdmin && data?.length > 0 && (
        <p className="mt-4 text-xs text-chalk-500">
          Pricing is admin-only. Ask an admin to change a plan.
        </p>
      )}

      {editing && (
        <PlanForm
          open
          plan={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          // Remount on target change so the form never shows a stale plan.
          key={editing === 'new' ? 'new' : editing.id}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => destroy.mutate(removing)}
        loading={destroy.isPending}
        title="Delete this plan?"
        confirmLabel="Delete plan"
        confirmWord={removing?.name}
        typed={typed}
        onTypedChange={setTyped}
        message={
          removing?.client_count
            ? `${removing.client_count} client(s) are still on this plan. The server will refuse a delete — archive it instead, or move them across first.`
            : 'This removes the plan permanently. Archiving hides it from the public site and can be undone; deleting cannot.'
        }
      />
    </>
  )
}