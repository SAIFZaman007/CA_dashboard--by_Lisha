import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Pencil, PlayCircle, Plus, Search, Star, Trash2 } from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { CATEGORY_LABELS, cn, embedUrl, formatDate, LEVEL_LABELS, titleCase } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, ListInput, Select, Switch, Textarea } from '@/components/ui/Field'
import { UploadDropzone } from '@/components/ui/UploadDropzone'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const BLANK = {
  title: '',
  video_url: '',
  summary: '',
  description: '',
  category: 'form_technique',
  target_muscle: '',
  equipment: '',
  min_level: 'level_1',
  duration_seconds: '',
  tags: [],
  is_published: true,
  is_featured: false,
  sort_order: 0,
  file_key: null,
  file_name: null,
}

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

/** Live preview inside the editor: paste a link, see the player before saving.
 *  Catches a wrong or private video at authoring time rather than after a
 *  client messages to say the clip does not play. */
function Preview({ url }) {
  const provider = url.includes('youtu') ? 'youtube' : url.includes('vimeo') ? 'vimeo' : 'direct'
  const src = embedUrl({ provider, video_url: url })

  if (!url.trim()) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-ink-600 bg-ink-900 text-center">
        <p className="px-4 text-xs text-chalk-500">
          Paste a YouTube, Vimeo or direct MP4 link to preview it here.
        </p>
      </div>
    )
  }

  if (!src && provider !== 'direct') {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-brand-500/40 bg-brand-500/5 text-center">
        <p className="px-4 text-xs text-brand-400">
          That link is not a recognised video URL. Use the address from the browser bar or the
          Share button.
        </p>
      </div>
    )
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-ink-600 bg-black">
      {src ? (
        <iframe
          src={src}
          title="Tutorial preview"
          className="size-full"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video src={url} controls playsInline className="size-full">
          <track kind="captions" />
        </video>
      )}
    </div>
  )
}

function TutorialForm({ open, tutorial, onClose }) {
  const queryClient = useQueryClient()
  const editing = Boolean(tutorial)
  const [form, setForm] = useState(
    tutorial
      ? {
          ...tutorial,
          target_muscle: tutorial.target_muscle ?? '',
          equipment: tutorial.equipment ?? '',
          summary: tutorial.summary ?? '',
          description: tutorial.description ?? '',
          duration_seconds: tutorial.duration_seconds ?? '',
        }
      : BLANK,
  )
  const [error, setError] = useState(null)

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const save = useMutation({
    mutationFn: (body) =>
      editing ? api.tutorials.update(tutorial.id, body) : api.tutorials.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success(editing ? 'Tutorial saved' : 'Tutorial published')
      onClose()
    },
    onError: (failure) => setError(errorMessage(failure)),
  })

  function submit() {
    setError(null)
    save.mutate({
      title: form.title,
      // Send whichever source is set; the API rejects a tutorial with neither.
      video_url: form.video_url?.trim() || null,
      file_key: form.file_key || null,
      summary: form.summary || null,
      description: form.description || null,
      category: form.category,
      target_muscle: form.target_muscle || null,
      equipment: form.equipment || null,
      min_level: form.min_level,
      duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
      tags: (form.tags ?? []).map((t) => t.trim()).filter(Boolean),
      is_published: form.is_published,
      is_featured: form.is_featured,
      sort_order: Number(form.sort_order ?? 0),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit tutorial' : 'Add a tutorial'}
      description="Clients see published tutorials in the Video Tutorials section of their portal."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={save.isPending} onClick={submit}>
            {editing ? 'Save tutorial' : form.is_published ? 'Publish' : 'Save draft'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Upload or link — one tutorial needs one of the two, not both.
            Uploading is the default because that is what the coach does with a
            phone recording; linking stays available for anything already on
            YouTube, where the hosting and bandwidth are somebody else's. */}
        <div>
          <p className="mb-1.5 font-display text-[11px] font-semibold uppercase tracking-widest text-chalk-400">
            Video <span className="text-brand-500">*</span>
          </p>
          <UploadDropzone
            kind="video"
            accept="video/mp4,video/quicktime,video/webm"
            endpoint="/admin/tutorials/upload"
            label="Drag a video here"
            hint="MP4, MOV or WebM"
            maxMb={512}
            value={
              form.file_key
                ? { name: form.file_name ?? 'Uploaded video', detail: 'Hosted by Coach Auto' }
                : null
            }
            disabled={Boolean(form.video_url?.trim())}
            onUploaded={(data, file) =>
              setForm((f) => ({ ...f, file_key: data.file_key, file_name: file.name }))
            }
            onCleared={() => setForm((f) => ({ ...f, file_key: null, file_name: null }))}
          />
        </div>

        {!form.file_key && (
          <>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-600" />
              <span className="text-[11px] uppercase tracking-widest text-chalk-500">
                or paste a link
              </span>
              <span className="h-px flex-1 bg-ink-600" />
            </div>

            <Input
              label="Video link"
              value={form.video_url}
              onChange={set('video_url')}
              placeholder="https://www.youtube.com/watch?v=…"
              hint="YouTube, Vimeo or a direct MP4. Nothing is uploaded — the video stays where it is hosted."
            />

            <Preview url={form.video_url} />
          </>
        )}

        <Input label="Title" required value={form.title} onChange={set('title')} />

        <Input
          label="Summary"
          value={form.summary}
          onChange={set('summary')}
          hint="One line shown under the title on the card."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Minimum level" value={form.min_level} onChange={set('min_level')}>
            <option value="level_1">Level 1 and up</option>
            <option value="level_2">Level 2 and up</option>
            <option value="level_3">Level 3 only</option>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Target muscle"
            value={form.target_muscle}
            onChange={set('target_muscle')}
            placeholder="Quads"
          />
          <Select label="Equipment" value={form.equipment} onChange={set('equipment')}>
            <option value="">Not specific</option>
            {EQUIPMENT.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
          <Input
            label="Length"
            type="number"
            min="1"
            suffix="sec"
            value={form.duration_seconds}
            onChange={set('duration_seconds')}
          />
        </div>

        <Textarea
          label="Coaching notes"
          rows={4}
          value={form.description}
          onChange={set('description')}
          hint="Shown under the player. The cues you would give in person."
        />

        <ListInput
          label="Tags"
          values={form.tags}
          onChange={(tags) => setForm({ ...form, tags })}
          placeholder="squat"
          max={12}
        />

        <div className="space-y-3 rounded-lg border border-ink-600 bg-ink-900 p-4">
          <Switch
            label="Published"
            description="Off keeps it as a draft that no client can see."
            checked={form.is_published}
            onChange={(is_published) => setForm({ ...form, is_published })}
          />
          <Switch
            label="Pin to the top"
            description="Marks it 'Start here' and floats it above everything else."
            checked={form.is_featured}
            onChange={(is_featured) => setForm({ ...form, is_featured })}
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

function TutorialCard({ tutorial, onEdit, onToggle, onDelete }) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', !tutorial.is_published && 'opacity-60')}>
      <div className="relative aspect-video bg-ink-900">
        {tutorial.thumbnail_url ? (
          <img
            src={tutorial.thumbnail_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <PlayCircle className="size-10 text-ink-500" aria-hidden="true" />
          </div>
        )}
        {tutorial.is_featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Star className="size-3" aria-hidden="true" /> Pinned
          </span>
        )}
        {!tutorial.is_published && (
          <span className="absolute right-2 top-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-chalk-400">
            Draft
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-brand-500">
          {CATEGORY_LABELS[tutorial.category] ?? tutorial.category}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-white">{tutorial.title}</h3>
        {tutorial.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm text-chalk-400">{tutorial.summary}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tutorial.target_muscle && <Badge>{titleCase(tutorial.target_muscle)}</Badge>}
          {tutorial.equipment && <Badge>{titleCase(tutorial.equipment)}</Badge>}
          <Badge>{LEVEL_LABELS[tutorial.min_level]}+</Badge>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-700 pt-3">
          <p className="text-[11px] tabular-nums text-chalk-500">
            {tutorial.view_count} view{tutorial.view_count === 1 ? '' : 's'} ·{' '}
            {formatDate(tutorial.created_at, { day: 'numeric', month: 'short' })}
          </p>
          <div className="flex gap-1">
            <IconButton
              label={tutorial.is_published ? 'Unpublish' : 'Publish'}
              icon={tutorial.is_published ? Eye : EyeOff}
              onClick={() => onToggle(tutorial)}
            />
            <IconButton label="Edit tutorial" icon={Pencil} onClick={() => onEdit(tutorial)} />
            <IconButton label="Delete tutorial" icon={Trash2} onClick={() => onDelete(tutorial)} />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function TutorialsPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const params = useMemo(
    () => ({ ...(debounced && { search: debounced }), ...(category && { category }) }),
    [debounced, category],
  )

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.tutorials(params),
    queryFn: () => api.tutorials.list(params),
  })

  const toggle = useMutation({
    mutationFn: (tutorial) =>
      api.tutorials.update(tutorial.id, { is_published: !tutorial.is_published }),
    onSuccess: (_, tutorial) => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success(tutorial.is_published ? 'Unpublished' : 'Published')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const destroy = useMutation({
    mutationFn: (tutorial) => api.tutorials.remove(tutorial.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      toast.success('Tutorial deleted')
      setRemoving(null)
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.length} in the library` : 'Library'}
        title="Video Tutorials"
        description="Recordings clients watch in their portal before they train."
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Add tutorial
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-chalk-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tutorials"
            aria-label="Search tutorials"
            className="w-full rounded-md border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-chalk-500 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
          className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onEdit={setEditing}
              onToggle={(target) => toggle.mutate(target)}
              onDelete={setRemoving}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={PlayCircle}
            title={debounced || category ? 'Nothing matches that' : 'No tutorials yet'}
            description={
              debounced || category
                ? 'Try a different search, or clear the filters.'
                : 'Record a clip, paste the link here, and it appears in every client’s portal.'
            }
            action={
              !debounced && !category ? (
                <Button size="sm" onClick={() => setEditing('new')}>
                  Add the first tutorial
                </Button>
              ) : null
            }
          />
        </Card>
      )}

      {editing && (
        <TutorialForm
          open
          key={editing === 'new' ? 'new' : editing.id}
          tutorial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => destroy.mutate(removing)}
        loading={destroy.isPending}
        title="Delete this tutorial?"
        confirmLabel="Delete tutorial"
        message={`"${removing?.title}" will be removed from every client's portal. To hide it temporarily, unpublish it instead.`}
      />
    </>
  )
}