import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import {
  LEVEL_LABELS,
  cn,
  formatWeight,
  freshness,
  initials,
  relativeDays,
} from '@/lib/utils'
import { useIsAdmin } from '@/store/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, Pagination } from '@/components/ui/DataTable'
import { Badge, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const PAGE_SIZE = 25

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'inactive', label: 'Switched off' },
]

function Avatar({ name, url }) {
  if (url) {
    return <img src={url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-700 text-[11px] font-bold text-chalk-200">
      {initials(name)}
    </span>
  )
}

function AddClientDialog({ onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    level: 'level_1',
    send_welcome: true,
  })
  const [error, setError] = useState(null)

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }))

  const mutation = useMutation({
    mutationFn: () => api.clients.create(form),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(`${client.full_name} added`)
      onClose()
      navigate(`/clients/${client.id}`)
    },
    onError: (failure) => setError(errorMessage(failure)),
  })


  return (
    <Modal
      open
      onClose={onClose}
      title="Add a client"
      description="Opens the account and sends them their sign-in details."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            disabled={!form.full_name || !form.email || !form.password}
            onClick={() => mutation.mutate()}
          >
            Add client
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full name" required value={form.full_name} onChange={set('full_name')} />
        <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
        <Input
          label="Temporary password"
          type="password"
          required
          value={form.password}
          onChange={set('password')}
          hint="At least 10 characters with an uppercase letter, a lowercase letter and a number. They can change it once they sign in."
        />
        <Select label="Starting level" value={form.level} onChange={set('level')}>
          <option value="level_1">Level 1 — 3 days a week</option>
          <option value="level_2">Level 2 — 4 days a week</option>
          <option value="level_3">Level 3 — 5 to 6 days a week</option>
        </Select>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [offset, setOffset] = useState(0)
  const [adding, setAdding] = useState(false)

  const status = params.get('status') ?? 'all'
  const level = params.get('level') ?? ''

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      status_filter: status,
      sort: 'recent',
      ...(debounced && { search: debounced }),
      ...(level && { level }),
    }),
    [offset, status, level, debounced],
  )

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.clients(query),
    queryFn: () => api.clients.list(query),
    placeholderData: (previous) => previous,
  })

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setOffset(0)
  }

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.display_name || row.full_name} url={row.avatar_url} />
          <div className="min-w-0">
            <p className="truncate font-medium text-chalk-50">
              {row.display_name || row.full_name}
            </p>
            <p className="truncate text-xs text-chalk-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (row) => (
        <span className="text-chalk-200">{LEVEL_LABELS[row.level] ?? '—'}</span>
      ),
    },
    {
      key: 'phase',
      header: 'Phase',
      render: (row) => (
        <div>
          <p className="text-chalk-200">{row.phase || '—'}</p>
          {row.program_week != null && (
            <p className="text-xs tabular-nums text-chalk-500">
              Week {row.program_week} of {row.program_total_weeks}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'weight',
      header: 'Weight',
      align: 'right',
      render: (row) => {
        const delta =
          row.current_weight_kg != null && row.starting_weight_kg != null
            ? row.current_weight_kg - row.starting_weight_kg
            : null
        return (
          <div>
            <p className="tabular-nums text-chalk-200">{formatWeight(row.current_weight_kg)}</p>
            {delta != null && (
              <p
                className={cn(
                  'text-xs tabular-nums',
                  delta < 0 ? 'text-signal-green' : delta > 0 ? 'text-signal-amber' : 'text-chalk-500',
                )}
              >
                {formatWeight(Math.abs(delta), 'imperial', { decimals: 1 })}{' '}
                {delta < 0 ? 'down' : delta > 0 ? 'up' : ''}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'sessions',
      header: 'Sessions 7d',
      align: 'center',
      render: (row) => <span className="tabular-nums text-chalk-200">{row.sessions_last_7d}</span>,
    },
    {
      key: 'checkin',
      header: 'Last check-in',
      render: (row) => {
        const state = freshness(row.last_weight_log)
        return (
          <div>
            <p className="text-chalk-200">{relativeDays(row.last_weight_log)}</p>
            {/* Colour alone never carries the meaning. */}
            <p className="text-xs text-chalk-500">{state.label}</p>
          </div>
        )
      },
    },
    {
      key: 'flags',
      header: 'Assigned',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.has_active_plan ? 'green' : 'grey'}>
            {row.has_active_plan ? 'Training' : 'No plan'}
          </Badge>
          <Badge tone={row.has_active_meal_plan ? 'green' : 'grey'}>
            {row.has_active_meal_plan ? 'Meals' : 'No meals'}
          </Badge>
          {row.unread_from_client > 0 && (
            <Badge tone="red">{row.unread_from_client} unread</Badge>
          )}
          {!row.is_active && <Badge tone="grey">Switched off</Badge>}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.total} on the books` : 'Roster'}
        title="Clients"
        description="Everyone you coach. The bar down the left of each row shows how recently they checked in."
        action={
          isAdmin && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add client
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-chalk-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search clients"
            className="w-full rounded-md border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <select
          value={level}
          onChange={(event) => setFilter('level', event.target.value)}
          aria-label="Filter by level"
          className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">All levels</option>
          <option value="level_1">Level 1</option>
          <option value="level_2">Level 2</option>
          <option value="level_3">Level 3</option>
        </select>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={status === tab.value}
            onClick={() => setFilter('status', tab.value === 'all' ? '' : tab.value)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              status === tab.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-ink-600 bg-ink-900 text-chalk-400 hover:border-ink-500 hover:text-white',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.items}
              getKey={(row) => row.id}
              loading={isPending}
              onRowClick={(row) => navigate(`/clients/${row.id}`)}
              rail={(row) => freshness(row.last_weight_log).rail}
              mobile={(row) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.display_name || row.full_name} url={row.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-chalk-50">
                      {row.display_name || row.full_name}
                    </p>
                    <p className="truncate text-xs text-chalk-500">
                      {LEVEL_LABELS[row.level] ?? '—'} · {relativeDays(row.last_weight_log)}
                    </p>
                  </div>
                  {row.unread_from_client > 0 && (
                    <Badge tone="red">{row.unread_from_client}</Badge>
                  )}
                </div>
              )}
              empty={
                <EmptyState
                  icon={Users}
                  title={debounced || status !== 'all' ? 'Nothing matches that' : 'No clients yet'}
                  description={
                    debounced || status !== 'all'
                      ? 'Try a different search, or clear the filters to see everyone.'
                      : 'Add your first client to start writing programmes.'
                  }
                  action={
                    isAdmin && !debounced && status === 'all' ? (
                      <Button size="sm" onClick={() => setAdding(true)}>
                        Add client
                      </Button>
                    ) : null
                  }
                />
              }
            />
            {data && (
              <Pagination
                total={data.total}
                limit={data.limit}
                offset={data.offset}
                onChange={setOffset}
                label="clients"
              />
            )}
          </>
        )}
      </Card>

      {/* Mounted only while open, so each use starts from an empty form
          rather than being cleared by an effect after the fact. */}
      {adding && <AddClientDialog onClose={() => setAdding(false)} />}
    </>
  )
}