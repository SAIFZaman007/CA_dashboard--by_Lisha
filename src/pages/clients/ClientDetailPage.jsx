import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, KeyRound, Power, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import {
  GOAL_LABELS,
  LEVEL_LABELS,
  age,
  cn,
  formatDate,
  formatHeight,
  formatWeight,
  freshness,
  initials,
  relativeDays,
} from '@/lib/utils'
import { useIsAdmin } from '@/store/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, ProgressBar } from '@/components/ui/Card'
import { Badge, ErrorState, FullPageSpinner } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

import { TrainingTab } from '@/pages/clients/tabs/TrainingTab'
import { NutritionTab } from '@/pages/clients/tabs/NutritionTab'
import { CheckInsTab } from '@/pages/clients/tabs/CheckInsTab'
import { MessagesTab } from '@/pages/clients/tabs/MessagesTab'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'messages', label: 'Messages' },
]

/** The coaching record. Everything here is the coach's to set, not the client's. */
function ProfileTab({ clientId, detail }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(detail.profile)
  const [dirty, setDirty] = useState(false)
  const [syncedFrom, setSyncedFrom] = useState(detail.profile)

  // A background refetch must not wipe out what the coach is halfway through
  // typing, so the server copy only lands while the form is untouched.
  // Adjusted during render rather than in an effect: an effect would paint the
  // stale values first and then immediately repaint, which reads as a flicker.
  if (!dirty && detail.profile !== syncedFrom) {
    setSyncedFrom(detail.profile)
    setForm(detail.profile)
  }

  function set(field, value) {
    setDirty(true)
    setForm((f) => ({ ...f, [field]: value }))
  }

  const onChange = (field) => (event) => {
    const raw = event.target.value
    set(field, raw === '' ? null : event.target.type === 'number' ? Number(raw) : raw)
  }

  const save = useMutation({
    mutationFn: () => api.clients.updateProfile(clientId, form),
    onSuccess: () => {
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
      toast.success('Profile saved')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="Coaching record"
          description="Level, phase and targets. The client cannot change these."
          action={
            <Button size="sm" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
              {dirty ? 'Save changes' : 'Saved'}
            </Button>
          }
        />
        <CardBody className="space-y-6">
          <div>
            <p className="eyebrow mb-3">Assessment</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth ?? ''}
                onChange={onChange('date_of_birth')}
              />
              <Select label="Sex" value={form.sex ?? ''} onChange={onChange('sex')}>
                <option value="">Not recorded</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
              <Input
                label="Height"
                type="number"
                step="0.1"
                suffix="cm"
                value={form.height_cm ?? ''}
                onChange={onChange('height_cm')}
              />
              <Input
                label="Starting weight"
                type="number"
                step="0.01"
                suffix="kg"
                value={form.starting_weight_kg ?? ''}
                onChange={onChange('starting_weight_kg')}
              />
              <Input
                label="Current weight"
                type="number"
                step="0.01"
                suffix="kg"
                value={form.current_weight_kg ?? ''}
                onChange={onChange('current_weight_kg')}
              />
              <Input
                label="Goal weight"
                type="number"
                step="0.01"
                suffix="kg"
                value={form.goal_weight_kg ?? ''}
                onChange={onChange('goal_weight_kg')}
              />
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Programme</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select label="Level" value={form.level} onChange={onChange('level')}>
                <option value="level_1">Level 1 — 3 days</option>
                <option value="level_2">Level 2 — 4 days</option>
                <option value="level_3">Level 3 — 5 to 6 days</option>
              </Select>
              <Select label="Goal" value={form.goal} onChange={onChange('goal')}>
                <option value="cut">Cut</option>
                <option value="maintain">Maintain</option>
                <option value="build">Build</option>
              </Select>
              <Input
                label="Phase"
                value={form.phase ?? ''}
                onChange={onChange('phase')}
                placeholder="Cut Phase"
              />
              <Input
                label="Started on"
                type="date"
                value={form.program_start_date ?? ''}
                onChange={onChange('program_start_date')}
              />
              <Input
                label="Current week"
                type="number"
                min="1"
                value={form.program_week ?? ''}
                onChange={onChange('program_week')}
              />
              <Input
                label="Total weeks"
                type="number"
                min="1"
                value={form.program_total_weeks ?? ''}
                onChange={onChange('program_total_weeks')}
              />
              <Select
                label="Activity level"
                value={form.activity_level}
                onChange={onChange('activity_level')}
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very active</option>
              </Select>
              <Select
                label="Units they see"
                value={form.unit_system}
                onChange={onChange('unit_system')}
              >
                <option value="imperial">Imperial (lbs)</option>
                <option value="metric">Metric (kg)</option>
              </Select>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Daily targets</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Calories"
                type="number"
                value={form.calorie_target ?? ''}
                onChange={onChange('calorie_target')}
              />
              <Input
                label="Protein"
                type="number"
                suffix="g"
                value={form.protein_target_g ?? ''}
                onChange={onChange('protein_target_g')}
              />
              <Input
                label="Carbs"
                type="number"
                suffix="g"
                value={form.carb_target_g ?? ''}
                onChange={onChange('carb_target_g')}
              />
              <Input
                label="Fat"
                type="number"
                suffix="g"
                value={form.fat_target_g ?? ''}
                onChange={onChange('fat_target_g')}
              />
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Weekly targets</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Workouts"
                type="number"
                value={form.weekly_workout_target ?? ''}
                onChange={onChange('weekly_workout_target')}
              />
              <Input
                label="Cardio"
                type="number"
                suffix="min"
                value={form.weekly_cardio_target_min ?? ''}
                onChange={onChange('weekly_cardio_target_min')}
              />
              <Input
                label="Sleep"
                type="number"
                step="0.5"
                suffix="hrs"
                value={form.sleep_target_hours ?? ''}
                onChange={onChange('sleep_target_hours')}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Textarea
              label="Medical notes"
              rows={4}
              value={form.medical_notes ?? ''}
              onChange={onChange('medical_notes')}
              hint="Injuries, conditions and anything that changes what you prescribe."
            />
            <Textarea
              label="Coach notes"
              rows={4}
              value={form.coach_notes ?? ''}
              onChange={onChange('coach_notes')}
              hint="Private to you. The client never sees this."
            />
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="This week" />
          <CardBody className="space-y-4">
            <ProgressBar
              label="Workouts"
              value={detail.adherence.sessions_last_7d}
              target={detail.adherence.workout_target}
              tone="brand"
            />
            <ProgressBar
              label="Cardio (min)"
              value={detail.adherence.cardio_minutes_last_7d}
              target={detail.adherence.cardio_target}
              tone="blue"
            />
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-chalk-200">Average sleep</span>
                <span className="tabular-nums text-chalk-500">
                  {detail.adherence.avg_sleep_last_7d ?? '—'} / {detail.adherence.sleep_target} hrs
                </span>
              </div>
              <ProgressBar
                value={detail.adherence.avg_sleep_last_7d ?? 0}
                target={detail.adherence.sleep_target}
                tone="green"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="At a glance" />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              {[
                ['Age', age(form.date_of_birth) ? `${age(form.date_of_birth)}` : '—'],
                ['Height', formatHeight(form.height_cm, form.unit_system)],
                [
                  'Weight change',
                  detail.adherence.weight_change_kg != null
                    ? formatWeight(detail.adherence.weight_change_kg, form.unit_system)
                    : '—',
                ],
                ['Last weighed', relativeDays(detail.adherence.last_weight_log)],
                ['Intake complete', form.onboarding_completed ? 'Yes' : 'Not finished'],
                ['Timezone', form.timezone],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-chalk-500">{label}</dt>
                  <dd className="text-right font-medium tabular-nums text-chalk-100">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function AccountActions({ clientId, account }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typed, setTyped] = useState('')
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const toggleActive = useMutation({
    mutationFn: () => api.clients.updateAccount(clientId, { is_active: !account.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.client(clientId) })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(account.is_active ? 'Account switched off' : 'Account switched back on')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const erase = useMutation({
    mutationFn: () => api.clients.remove(clientId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Record erased')
      navigate('/clients')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const resetPassword = useMutation({
    mutationFn: () => api.clients.resetPassword(clientId, newPassword),
    onSuccess: () => {
      setResetting(false)
      setNewPassword('')
      toast.success('Password set')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  async function exportRecord() {
    try {
      const record = await api.clients.exportRecord(clientId)
      const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${account.full_name.replace(/\s+/g, '-').toLowerCase()}-record.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (failure) {
      toast.error(errorMessage(failure))
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <IconButton label="Export record" icon={Download} variant="subtle" onClick={exportRecord} />
        <IconButton
          label="Set a temporary password"
          icon={KeyRound}
          variant="subtle"
          onClick={() => setResetting(true)}
        />
        <IconButton
          label={account.is_active ? 'Switch account off' : 'Switch account on'}
          icon={Power}
          variant="subtle"
          onClick={() => toggleActive.mutate()}
        />
        <IconButton
          label="Erase record"
          icon={Trash2}
          variant="danger"
          onClick={() => {
            setTyped('')
            setConfirmDelete(true)
          }}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => erase.mutate()}
        loading={erase.isPending}
        title="Erase this record"
        confirmLabel="Erase permanently"
        confirmWord={account.full_name}
        typed={typed}
        onTypedChange={setTyped}
        message="This deletes the account and every weight, measurement, photo, session and message with it. There is no undo. To pause someone instead, switch the account off — that keeps everything and is reversible."
      />

      <Modal
        open={resetting}
        onClose={() => setResetting(false)}
        title="Set a temporary password"
        description="For when a client cannot receive the reset email. Tell it to them directly, and ask them to change it."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setResetting(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={resetPassword.isPending}
              disabled={newPassword.length < 10}
              onClick={() => resetPassword.mutate()}
            >
              Set password
            </Button>
          </>
        }
      >
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          hint="At least 10 characters with an uppercase letter, a lowercase letter and a number."
        />
      </Modal>
    </>
  )
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const isAdmin = useIsAdmin()
  const [tab, setTab] = useState('profile')

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.client(clientId),
    queryFn: () => api.clients.get(clientId),
  })

  if (isPending) return <FullPageSpinner label="Opening the record" />
  if (isError) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }

  const { account } = data
  const name = account.display_name || account.full_name
  const state = freshness(account.last_weight_log)

  return (
    <>
      <PageHeader
        back={{ to: '/clients', label: 'All clients' }}
        title={name}
        action={isAdmin && <AccountActions clientId={clientId} account={account} />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ink-600 bg-ink-850 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-700 text-sm font-bold text-chalk-200">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-chalk-200">{account.email}</p>
          <p className="text-xs text-chalk-500">
            Joined {formatDate(account.created_at)} · Last signed in{' '}
            {relativeDays(account.last_login_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="blue">{LEVEL_LABELS[account.level] ?? '—'}</Badge>
          <Badge tone="neutral">{GOAL_LABELS[account.goal] ?? '—'}</Badge>
          <Badge tone={state.tone}>{state.label}</Badge>
          {!account.is_active && <Badge tone="grey">Switched off</Badge>}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Client record"
        className="mb-5 flex gap-1 overflow-x-auto border-b border-ink-600 scrollbar-none"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-widest transition',
              tab === item.key
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-chalk-500 hover:text-chalk-200',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab clientId={clientId} detail={data} />}
      {tab === 'training' && <TrainingTab clientId={clientId} />}
      {tab === 'nutrition' && <NutritionTab clientId={clientId} detail={data} />}
      {tab === 'checkins' && <CheckInsTab detail={data} />}
      {tab === 'messages' && <MessagesTab clientId={clientId} />}
    </>
  )
}