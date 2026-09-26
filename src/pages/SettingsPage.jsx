import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, KeyRound, Mail, ShieldCheck, UserRound, X } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { cn, initials } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'

const RULES = [
  { id: 'length', label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'digit', label: 'A number', test: (v) => /\d/.test(v) },
]

const STRENGTH = [
  { label: 'Too weak', bar: 'bg-brand-500', text: 'text-brand-400' },
  { label: 'Weak', bar: 'bg-brand-500', text: 'text-brand-400' },
  { label: 'Fair', bar: 'bg-signal-amber', text: 'text-signal-amber' },
  { label: 'Good', bar: 'bg-signal-blue', text: 'text-signal-blue' },
  { label: 'Strong', bar: 'bg-signal-green', text: 'text-signal-green' },
]

/** 0–4. Every rule must pass before anything above "Weak" is possible. */
function strengthOf(value) {
  if (!value) return 0
  const passed = RULES.filter((rule) => rule.test(value)).length
  if (passed < RULES.length) return passed >= 2 ? 1 : 0
  let score = 2
  if (value.length >= 14) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}

function ProfileCard({ user }) {
  const setUser = useAuth((s) => s.setUser)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [error, setError] = useState(null)

  const dirty =
    fullName.trim() !== (user?.full_name ?? '') ||
    displayName.trim() !== (user?.display_name ?? '')

  const save = useMutation({
    mutationFn: () =>
      api.users.updateMe({
        full_name: fullName.trim(),
        display_name: displayName.trim() || null,
      }),
    onSuccess: (updated) => {
      setUser(updated)
      setFullName(updated.full_name ?? '')
      setDisplayName(updated.display_name ?? '')
      toast.success('Profile saved')
    },
    onError: (failure) => setError(errorMessage(failure)),
  })

  function submit(event) {
    event.preventDefault()
    setError(null)
    if (fullName.trim().length < 2) {
      setError('Enter your full name.')
      return
    }
    save.mutate()
  }

  const shownName = displayName.trim() || fullName.trim() || 'Coach'

  return (
    <Card>
      <CardHeader title="Profile" description="How your name appears across the dashboard." />
      <CardBody>
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-ink-600 bg-ink-900 p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {initials(shownName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-chalk-50">
                {shownName}
              </span>
              <span className="flex items-center gap-1.5 truncate text-xs text-chalk-500">
                <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                {user?.email}
              </span>
            </span>
            <Badge tone="blue" className="capitalize">
              {user?.role}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              autoComplete="name"
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <Input
              label="Display name"
              autoComplete="nickname"
              maxLength={120}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              hint="Optional. Shown instead of your full name."
            />
          </div>

          <p className="text-xs text-chalk-500">
            Your sign-in email is {user?.email}. To change it, ask an admin — it is the address
            password resets and security notices go to.
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={save.isPending} disabled={!dirty}>
              Save profile
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function RuleList({ value }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password requirements">
      {RULES.map((rule) => {
        const met = rule.test(value)
        const Icon = met ? Check : X
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              met ? 'text-signal-green' : 'text-chalk-500',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '(met)' : '(not met yet)'}</span>
          </li>
        )
      })}
    </ul>
  )
}

function StrengthMeter({ value }) {
  const score = strengthOf(value)
  const tone = STRENGTH[score]
  return (
    <div aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              value && score >= step ? tone.bar : 'bg-ink-700',
            )}
          />
        ))}
      </div>
      {value && (
        <p className={cn('mt-1.5 text-xs font-medium', tone.text)}>
          Password strength: {tone.label}
        </p>
      )}
    </div>
  )
}

const BLANK = { current: '', next: '', confirm: '' }

function PasswordCard({ user }) {
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const allRulesMet = useMemo(() => RULES.every((rule) => rule.test(form.next)), [form.next])

  const change = useMutation({
    mutationFn: () =>
      api.auth.changePassword({ current_password: form.current, new_password: form.next }),
    onSuccess: () => {
      setForm(BLANK)
      setErrors({})
      toast.success('Password changed. Any other devices have been signed out.')
    },
    onError: (failure) => {
      const message = errorMessage(failure, 'Your password could not be changed. Try again.')
      if (/current password/i.test(message)) setErrors({ current: message })
      else setServerError(message)
    },
  })

  const reset = useMutation({
    mutationFn: () => api.auth.forgotPassword({ email: user.email }),
    onSuccess: () => toast.success(`Reset link sent to ${user.email}. Check your inbox.`),
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  function submit(event) {
    event.preventDefault()
    setServerError(null)

    const found = {}
    if (!form.current) found.current = 'Enter your current password.'
    if (!form.next) found.next = 'Choose a new password.'
    else if (!allRulesMet) found.next = 'Your new password does not meet the requirements yet.'
    else if (form.next === form.current) {
      found.next = 'Choose a password that is different from your current one.'
    }
    if (!form.confirm) found.confirm = 'Type the new password again.'
    else if (form.confirm !== form.next) found.confirm = 'Those passwords do not match.'

    setErrors(found)
    if (Object.keys(found).length === 0) change.mutate()
  }

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Changing it signs out every other device on this account."
      />
      <CardBody>
        <form onSubmit={submit} noValidate className="space-y-4">
          {/* Lets password managers file the new password against the right
              account instead of guessing from whatever was typed last. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={user?.email ?? ''}
            readOnly
            hidden
          />

          <Input
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            value={form.current}
            onChange={set('current')}
            error={errors.current}
          />

          <div className="space-y-3">
            <Input
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              maxLength={128}
              value={form.next}
              onChange={set('next')}
              error={errors.next}
            />
            <StrengthMeter value={form.next} />
            <RuleList value={form.next} />
          </div>

          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            maxLength={128}
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />

          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400"
            >
              {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-ink-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="text-left text-xs font-medium text-chalk-400 transition hover:text-white disabled:opacity-50"
            >
              {reset.isPending ? 'Sending…' : 'Forgot your current password? Email me a reset link'}
            </button>
            <Button type="submit" size="sm" loading={change.isPending}>
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function SecurityNotes() {
  const items = [
    'Passwords are stored hashed with Argon2 — nobody, including admins, can read yours.',
    'Changing your password keeps you signed in here and signs out every other device.',
    'A security notice is emailed to you whenever the password changes.',
    'Unused password-reset links stop working the moment the password changes.',
  ]
  return (
    <Card>
      <CardHeader title="How your account is protected" />
      <CardBody>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-chalk-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal-green" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

export default function SettingsPage() {
  const user = useAuth((s) => s.user)

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        description="Your name, your password and how the account is kept secure."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Keyed so a profile saved elsewhere (another tab) re-seeds the form. */}
          <ProfileCard key={`${user?.full_name}|${user?.display_name}`} user={user} />
          <SecurityNotes />
        </div>
        <PasswordCard user={user} />
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-chalk-500">
        <UserRound className="size-3.5" aria-hidden="true" />
        Signed in as {user?.email}
      </p>
    </>
  )
}