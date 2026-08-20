import { useState } from 'react'
import { CameraOff, LineChart as LineChartIcon } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getAccessToken } from '@/lib/api'
import { cn, formatDate, formatLength, formatWeight, titleCase } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge, EmptyState } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'

const AXIS = { stroke: '#74747e', fontSize: 11 }

function WeightChart({ series, units }) {
  if (!series?.length) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No weigh-ins yet"
        description="Their weight chart fills in as soon as they start logging from the portal."
      />
    )
  }

  const points = series.map((point) => ({
    label: formatDate(point.log_date, { day: 'numeric', month: 'short' }),
    value: units === 'imperial' ? point.value / 0.45359237 : point.value,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1c1c20" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={46}
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip
            contentStyle={{
              background: '#141417',
              border: '1px solid #26262b',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9a9aa4' }}
            formatter={(value) => [
              `${Number(value).toFixed(1)} ${units === 'imperial' ? 'lbs' : 'kg'}`,
              'Weight',
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#e5202c"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Check-in photos are private files behind an authenticated route, so a plain
 * <img src> would 401 — the browser will not attach the bearer token. Each
 * thumbnail is fetched with the token and held as an object URL for the life of
 * the screen.
 */
function PrivatePhoto({ url, alt, className, onClick }) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useState(() => {
    let revoked = null
    const token = getAccessToken()

    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => (response.ok ? response.blob() : Promise.reject(response.status)))
      .then((blob) => {
        revoked = URL.createObjectURL(blob)
        setObjectUrl(revoked)
      })
      .catch(() => setFailed(true))

    return () => revoked && URL.revokeObjectURL(revoked)
  })

  if (failed) {
    return (
      <div className={cn('grid place-items-center bg-ink-800', className)}>
        <CameraOff className="size-5 text-chalk-500" aria-hidden="true" />
      </div>
    )
  }

  if (!objectUrl) return <div className={cn('skeleton', className)} aria-hidden="true" />

  return (
    <button type="button" onClick={onClick} className={cn('block overflow-hidden', className)}>
      <img src={objectUrl} alt={alt} className="size-full object-cover" />
    </button>
  )
}

export function CheckInsTab({ detail }) {
  const [zoomed, setZoomed] = useState(null)
  const units = detail.profile.unit_system

  const measurementColumns = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.log_date) },
    { key: 'chest', header: 'Chest', align: 'right', render: (row) => formatLength(row.chest_cm, units) },
    { key: 'waist', header: 'Waist', align: 'right', render: (row) => formatLength(row.waist_cm, units) },
    { key: 'hips', header: 'Hips', align: 'right', render: (row) => formatLength(row.hips_cm, units) },
    {
      key: 'arms',
      header: 'Arms L/R',
      align: 'right',
      render: (row) =>
        `${formatLength(row.left_arm_cm, units)} / ${formatLength(row.right_arm_cm, units)}`,
    },
    {
      key: 'bf',
      header: 'Body fat',
      align: 'right',
      render: (row) => (row.body_fat_pct != null ? `${row.body_fat_pct}%` : '—'),
    },
  ]

  const sleepColumns = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.log_date) },
    {
      key: 'hours',
      header: 'Slept',
      align: 'right',
      render: (row) => `${Number(row.hours_slept).toFixed(1)} hrs`,
    },
    {
      key: 'quality',
      header: 'Quality',
      align: 'center',
      render: (row) =>
        row.quality ? (
          <Badge tone={row.quality >= 4 ? 'green' : row.quality >= 3 ? 'amber' : 'red'}>
            {row.quality}/5
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'window',
      header: 'Bed → wake',
      align: 'right',
      render: (row) =>
        row.bedtime && row.wake_time ? `${row.bedtime.slice(0, 5)} → ${row.wake_time.slice(0, 5)}` : '—',
    },
  ]

  const cardioColumns = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.log_date) },
    {
      key: 'type',
      header: 'Activity',
      render: (row) => <span className="capitalize">{titleCase(row.activity_type)}</span>,
    },
    {
      key: 'duration',
      header: 'Minutes',
      align: 'right',
      render: (row) => row.duration_minutes,
    },
    {
      key: 'distance',
      header: 'Distance',
      align: 'right',
      render: (row) => (row.distance_km != null ? `${row.distance_km} km` : '—'),
    },
    {
      key: 'hr',
      header: 'Avg HR',
      align: 'right',
      render: (row) => row.avg_heart_rate ?? '—',
    },
    {
      key: 'intensity',
      header: 'Intensity',
      render: (row) => (
        <Badge tone={row.intensity === 'high' ? 'red' : row.intensity === 'low' ? 'grey' : 'amber'}>
          {titleCase(row.intensity)}
        </Badge>
      ),
    },
  ]

  const sessionColumns = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.session_date) },
    {
      key: 'day',
      header: 'Day',
      render: (row) => (
        <div>
          <p className="text-chalk-100">{row.day_label ?? '—'}</p>
          <p className="text-xs text-chalk-500">{row.focus ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          tone={
            row.status === 'completed' ? 'green' : row.status === 'skipped' ? 'red' : 'amber'
          }
        >
          {titleCase(row.status)}
        </Badge>
      ),
    },
    { key: 'sets', header: 'Sets', align: 'right', render: (row) => row.set_count },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      render: (row) => (row.volume_kg ? `${Math.round(row.volume_kg).toLocaleString()} kg` : '—'),
    },
    {
      key: 'duration',
      header: 'Minutes',
      align: 'right',
      render: (row) => row.duration_minutes ?? '—',
    },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Weight"
          description="Every weigh-in they have logged"
          action={
            detail.adherence.weight_change_kg != null && (
              <span
                className={cn(
                  'font-display text-lg font-bold tabular-nums',
                  detail.adherence.weight_change_kg < 0 ? 'text-signal-green' : 'text-signal-amber',
                )}
              >
                {formatWeight(detail.adherence.weight_change_kg, units)}
              </span>
            )
          }
        />
        <CardBody>
          <WeightChart series={detail.weight_series} units={units} />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Tape measurements" />
          <DataTable
            columns={measurementColumns}
            rows={detail.measurements}
            getKey={(row) => row.id}
            empty={
              <EmptyState
                title="No measurements recorded"
                description="Take these at intake and at every check-in so progress shows even when the scale stalls."
              />
            }
          />
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Check-in photos" description="Private — only you and the client" />
          {detail.photos.length ? (
            <CardBody>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {detail.photos.map((photo) => (
                  <figure key={photo.id}>
                    <PrivatePhoto
                      url={photo.url}
                      alt={`${photo.pose} on ${formatDate(photo.log_date)}`}
                      className="aspect-3/4 w-full rounded-md"
                      onClick={() => setZoomed(photo)}
                    />
                    <figcaption className="mt-1 text-center text-[11px] capitalize text-chalk-500">
                      {photo.pose} · {formatDate(photo.log_date, { day: 'numeric', month: 'short' })}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </CardBody>
          ) : (
            <EmptyState
              icon={CameraOff}
              title="No photos shared"
              description="Clients choose whether to share these. Nothing here means they have not opted in yet."
            />
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Training sessions" description="What they actually did" />
        <DataTable
          columns={sessionColumns}
          rows={detail.sessions}
          getKey={(row) => row.id}
          empty={<EmptyState title="No sessions logged" description="Nothing recorded in this window." />}
        />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="Sleep"
            description={`Target ${detail.adherence.sleep_target} hrs`}
          />
          <DataTable
            columns={sleepColumns}
            rows={detail.sleep}
            getKey={(row) => row.id}
            empty={<EmptyState title="No sleep logged" description="Nothing recorded in this window." />}
          />
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Cardio"
            description={`Target ${detail.adherence.cardio_target} min a week`}
          />
          <DataTable
            columns={cardioColumns}
            rows={detail.cardio}
            getKey={(row) => row.id}
            empty={<EmptyState title="No cardio logged" description="Nothing recorded in this window." />}
          />
        </Card>
      </div>

      <Modal
        open={zoomed !== null}
        onClose={() => setZoomed(null)}
        title={zoomed ? `${titleCase(zoomed.pose)} — ${formatDate(zoomed.log_date)}` : ''}
        size="md"
      >
        {zoomed && (
          <>
            <PrivatePhoto
              url={zoomed.url}
              alt={`${zoomed.pose} on ${formatDate(zoomed.log_date)}`}
              className="mx-auto max-h-[60dvh] w-auto rounded-lg"
            />
            {zoomed.note && <p className="mt-3 text-sm text-chalk-300">{zoomed.note}</p>}
          </>
        )}
      </Modal>
    </div>
  )
}