import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  CalendarClock,
  MessageSquare,
  PlayCircle,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { api } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { formatDate, relativeDays } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'

const CHART_AXIS = { stroke: '#74747e', fontSize: 11 }

function tooltipStyle() {
  return {
    contentStyle: {
      background: '#141417',
      border: '1px solid #26262b',
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: '#9a9aa4' },
    itemStyle: { color: '#ffffff' },
  }
}

function TrendCard({ title, description, data, colour, name }) {
  const series = (data ?? []).map((point) => ({
    date: point.log_date,
    value: point.value,
    label: formatDate(point.log_date, { day: 'numeric', month: 'short' }),
  }))

  const total = series.reduce((sum, point) => sum + point.value, 0)

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <span className="font-display text-2xl font-bold tabular-nums text-white">{total}</span>
        }
      />
      <CardBody className="pt-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id={`fill-${name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colour} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colour} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1c1c20" vertical={false} />
              <XAxis dataKey="label" tick={CHART_AXIS} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip {...tooltipStyle()} />
              <Area
                type="monotone"
                dataKey="value"
                name={name}
                stroke={colour}
                strokeWidth={2}
                fill={`url(#fill-${name})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export default function OverviewPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.overview(30),
    queryFn: () => api.overview(30),
  })

  if (isError) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }

  const counts = data?.counts

  return (
    <>
      <PageHeader
        eyebrow="Last 30 days"
        title="Overview"
        description="Where the business is, and who is waiting on you."
      />

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active clients"
            value={counts.active_clients}
            hint={`+${counts.new_clients_30d} this month`}
            tone={counts.new_clients_30d > 0 ? 'good' : 'neutral'}
            icon={Users}
          />
          <StatCard
            label="Unread messages"
            value={counts.unread_messages}
            hint={counts.unread_messages ? 'Waiting on a reply' : 'Inbox clear'}
            tone={counts.unread_messages ? 'bad' : 'good'}
            icon={MessageSquare}
          />
          <StatCard
            label="New enquiries"
            value={counts.new_leads}
            hint={counts.new_leads ? 'Not yet contacted' : 'All worked'}
            tone={counts.new_leads ? 'warn' : 'good'}
            icon={UserPlus}
          />
          <StatCard
            label="Consultations"
            value={counts.pending_bookings}
            hint={counts.pending_bookings ? 'Awaiting confirmation' : 'Nothing pending'}
            tone={counts.pending_bookings ? 'warn' : 'good'}
            icon={CalendarClock}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {isPending ? (
          <>
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </>
        ) : (
          <>
            <TrendCard
              title="Training sessions"
              description="Sessions started across every client"
              data={data.sessions}
              colour="#e5202c"
              name="Sessions"
            />
            <TrendCard
              title="New sign-ups"
              description="Client accounts opened"
              data={data.signups}
              colour="#3b82f6"
              name="Sign-ups"
            />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* The point of this whole screen. */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Needs attention"
            description="Clients whose check-ins have gone quiet"
            action={
              <Link
                to="/clients?status=needs_attention"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-500"
              >
                See all <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {isPending ? (
            <CardBody className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </CardBody>
          ) : data.needs_attention.length ? (
            <ul className="divide-y divide-ink-700">
              {data.needs_attention.map((item) => (
                <li key={item.client_id}>
                  <Link
                    to={`/clients/${item.client_id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-chalk-50">
                        {item.client_name}
                      </span>
                      <span className="block text-xs text-chalk-500">{item.reason}</span>
                    </span>
                    <Badge tone={item.days == null ? 'grey' : item.days > 20 ? 'red' : 'amber'}>
                      {item.days == null ? 'Never' : `${item.days}d`}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Activity}
              title="Everyone is checked in"
              description="No client has gone quiet for more than ten days. Nothing needs chasing."
            />
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Latest enquiries"
              action={
                <Link
                  to="/enquiries"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-500"
                >
                  Open <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {isPending ? (
              <CardBody className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </CardBody>
            ) : data.recent_leads.length ? (
              <ul className="divide-y divide-ink-700">
                {data.recent_leads.map((lead) => (
                  <li key={lead.id} className="px-5 py-2.5">
                    <p className="truncate text-sm font-medium text-chalk-50">{lead.full_name}</p>
                    <p className="truncate text-xs text-chalk-500">
                      {lead.primary_goal || lead.email} · {relativeDays(lead.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="py-4 text-center text-sm text-chalk-500">No enquiries yet.</p>
              </CardBody>
            )}
          </Card>

          {!isPending && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Tutorials live"
                value={counts.published_tutorials}
                hint="Visible to clients"
                icon={PlayCircle}
              />
              <StatCard
                label="Plans on sale"
                value={counts.active_programs}
                hint="Listed publicly"
                icon={Users}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}