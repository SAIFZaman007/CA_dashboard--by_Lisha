import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  CloudUpload,
  Eye,
  EyeOff,
  Images,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'

import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { cn, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge, EmptyState, ErrorState, Skeleton, Spinner } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'

const CATEGORIES = [
  { value: 'transformations', label: 'Transformations' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'competition', label: 'Competition' },
  { value: 'gym', label: 'In the Gym' },
  { value: 'certifications', label: 'Certifications' },
  { value: 'community', label: 'Community' },
  { value: 'behind_the_scenes', label: 'Behind the Scenes' },
]

const BLANK = () => ({
  title: '',
  alt_text: '',
  caption: '',
  category: 'coaching',
  tags: '',
  credit: '',
  taken_on: '',
  is_published: true,
  is_featured: false,
})

/**
 * Upload, then describe.
 *
 * The bytes go up on their own request the moment a file is picked, and the
 * form below only submits the returned `image_key`. That ordering matters: if
 * the alt text fails validation, the coach fixes a sentence — they do not
 * re-send a 6 MB photo over gym wi-fi. It also means the preview is instant,
 * because it renders the local File through `createObjectURL` rather than
 * waiting on a round trip to fetch back bytes the browser already holds.
 */
function ImageEditor({ open, onClose, image }) {
  const queryClient = useQueryClient()
  const inputRef = useRef(null)
  const isEdit = Boolean(image?.id)

  const [draft, setDraft] = useState(() =>
    isEdit
      ? {
          title: image.title ?? '',
          alt_text: image.alt_text ?? '',
          caption: image.caption ?? '',
          category: image.category ?? 'coaching',
          tags: (image.tags ?? []).join(', '),
          credit: image.credit ?? '',
          taken_on: image.taken_on ?? '',
          is_published: image.is_published ?? true,
          is_featured: image.is_featured ?? false,
        }
      : BLANK(),
  )

  // Only set for a brand-new upload. Editing an existing row keeps its stored
  // key untouched unless the coach deliberately replaces the file.
  const [uploaded, setUploaded] = useState(null)
  const [localPreview, setLocalPreview] = useState(null)
  const [progress, setProgress] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const previewSrc = localPreview ?? (isEdit ? image.image_url : null)

  async function handleFile(file) {
    if (!file) return
    setUploadError(null)

    // Checked here as well as on the server. Rejecting an 18 MB photo only
    // after it has crossed a phone connection is not a rejection anyone
    // thanks you for.
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 8 MB.`)
      return
    }

    // Revoke the previous object URL before replacing it. Without this, picking
    // six files in a row leaks six decoded bitmaps for the life of the tab.
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(URL.createObjectURL(file))
    setProgress(0)

    try {
      const result = await api.gallery.upload(file, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
      })
      setUploaded(result)
    } catch (failure) {
      setUploadError(errorMessage(failure))
      setLocalPreview(null)
    } finally {
      setProgress(null)
    }
  }

  const payload = useMemo(() => {
    const base = {
      title: draft.title.trim(),
      alt_text: draft.alt_text.trim(),
      caption: draft.caption.trim() || null,
      category: draft.category,
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      credit: draft.credit.trim() || null,
      taken_on: draft.taken_on || null,
      is_published: draft.is_published,
      is_featured: draft.is_featured,
    }
    if (uploaded) {
      base.image_key = uploaded.image_key
      base.width = uploaded.width
      base.height = uploaded.height
      base.file_size_bytes = uploaded.file_size_bytes
    }
    return base
  }, [draft, uploaded])

  const save = useMutation({
    mutationFn: () =>
      isEdit ? api.gallery.update(image.id, payload) : api.gallery.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success(isEdit ? 'Image updated' : 'Image added to the gallery')
      onClose()
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const canSave = Boolean(
    draft.title.trim() && draft.alt_text.trim().length >= 8 && (isEdit || uploaded),
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit image' : 'Add an image'}
      description="Everything here is public and indexed by search engines."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>
            {isEdit ? 'Save changes' : 'Add to gallery'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-600 bg-ink-900 p-4 transition hover:border-brand-500',
              previewSrc && 'p-2',
            )}
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt=""
                className="max-h-56 w-full rounded-md object-contain"
              />
            ) : (
              <>
                <CloudUpload className="size-7 text-chalk-500" aria-hidden="true" />
                <span className="text-sm text-chalk-300">Choose a photo</span>
                <span className="text-xs text-chalk-500">JPEG, PNG or WebP · up to 8 MB</span>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          {progress !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-chalk-400">
              <Spinner className="size-3.5" />
              Uploading… {progress}%
            </div>
          )}
          {previewSrc && progress === null && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-xs text-chalk-500 underline hover:text-white"
            >
              Replace this photo
            </button>
          )}
          {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
        </div>

        <Input
          label="Title"
          required
          value={draft.title}
          maxLength={160}
          onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
        />

        <Textarea
          label="Alt text"
          required
          rows={2}
          value={draft.alt_text}
          maxLength={300}
          onChange={(event) => setDraft((d) => ({ ...d, alt_text: event.target.value }))}
          hint={
            'Describe what is actually in the photo. This is what Google Images indexes ' +
            'and what a screen reader reads out — so "Coach Auto coaching a deadlift ' +
            'setup" works, "gallery photo" does not. Do not start with "Photo of".'
          }
        />

        <Textarea
          label="Caption"
          rows={2}
          value={draft.caption}
          onChange={(event) => setDraft((d) => ({ ...d, caption: event.target.value }))}
          hint="Shown under the image on the public page. Optional."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={draft.category}
            onChange={(event) => setDraft((d) => ({ ...d, category: event.target.value }))}
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Taken on"
            type="date"
            value={draft.taken_on ?? ''}
            onChange={(event) => setDraft((d) => ({ ...d, taken_on: event.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tags"
            value={draft.tags}
            onChange={(event) => setDraft((d) => ({ ...d, tags: event.target.value }))}
            hint="Comma separated."
          />
          <Input
            label="Credit"
            value={draft.credit}
            onChange={(event) => setDraft((d) => ({ ...d, credit: event.target.value }))}
            hint="Photographer, if one should be named."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Visibility"
            value={draft.is_published ? 'live' : 'hidden'}
            onChange={(event) =>
              setDraft((d) => ({ ...d, is_published: event.target.value === 'live' }))
            }
          >
            <option value="live">Live on the website</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select
            label="Featured"
            value={draft.is_featured ? 'yes' : 'no'}
            onChange={(event) =>
              setDraft((d) => ({ ...d, is_featured: event.target.value === 'yes' }))
            }
            hint="Featured images lead the gallery page."
          >
            <option value="no">Standard</option>
            <option value="yes">Featured</option>
          </Select>
        </div>
      </div>
    </Modal>
  )
}

export default function GalleryPage() {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | image object
  const [deleting, setDeleting] = useState(null)

  const params = category ? { category } : {}
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: keys.gallery(params),
    queryFn: () => api.gallery.list(params),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['gallery'] })
  }

  const update = useMutation({
    mutationFn: ({ id, body }) => api.gallery.update(id, body),
    onSuccess: invalidate,
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const remove = useMutation({
    mutationFn: (id) => api.gallery.remove(id),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Image deleted')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const reorder = useMutation({
    mutationFn: (ids) => api.gallery.reorder(ids),
    onSuccess: invalidate,
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  /**
   * Move one image up or down and resend the whole order.
   *
   * Arrow buttons rather than drag-and-drop, deliberately. Drag is fiddly on a
   * phone and invisible to a keyboard, and this list is edited a handful of
   * times a month — the accessible option that always works beats the
   * impressive one that sometimes does.
   */
  function move(index, direction) {
    if (!data) return
    const target = index + direction
    if (target < 0 || target >= data.length) return
    const next = [...data]
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder.mutate(next.map((image) => image.id))
  }

  if (isError) {
    return (
      <>
        <PageHeader eyebrow="Content" title="Gallery" />
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Gallery"
        description="The Hall of the Coach. Everything published here is public and crawlable."
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Add image
          </Button>
        }
      />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              category === ''
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-ink-600 text-chalk-400 hover:text-white',
            )}
          >
            All
          </button>
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                category === option.value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-600 text-chalk-400 hover:text-white',
              )}
            >
              {option.label}
            </button>
          ))}
        </CardBody>
      </Card>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      ) : data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((image, index) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-4/3 bg-ink-900">
                <img
                  src={image.image_url}
                  alt={image.alt_text}
                  loading="lazy"
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  className="size-full object-cover"
                />
                <div className="absolute left-2 top-2 flex gap-1.5">
                  {!image.is_published && <Badge tone="grey">Hidden</Badge>}
                  {image.is_featured && <Badge tone="amber">Featured</Badge>}
                </div>
              </div>

              <CardBody className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-chalk-50">{image.title}</p>
                    <p className="truncate text-xs text-chalk-500">
                      {image.category_label} · added {formatDate(image.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-chalk-600">
                    #{index + 1}
                  </span>
                </div>

                <p className="line-clamp-2 text-xs text-chalk-400">{image.alt_text}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <IconButton
                    label="Move up"
                    icon={ArrowUp}
                    variant="subtle"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    label="Move down"
                    icon={ArrowDown}
                    variant="subtle"
                    disabled={index === data.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  />
                  <IconButton
                    label={image.is_published ? 'Hide from the website' : 'Publish to the website'}
                    icon={image.is_published ? EyeOff : Eye}
                    variant="subtle"
                    onClick={() =>
                      update.mutate({
                        id: image.id,
                        body: { is_published: !image.is_published },
                      })
                    }
                  />
                  <IconButton
                    label={image.is_featured ? 'Remove from featured' : 'Mark as featured'}
                    icon={Star}
                    variant={image.is_featured ? 'primary' : 'subtle'}
                    onClick={() =>
                      update.mutate({ id: image.id, body: { is_featured: !image.is_featured } })
                    }
                  />
                  <IconButton
                    label="Edit image"
                    icon={Pencil}
                    variant="subtle"
                    onClick={() => setEditing(image)}
                  />
                  <IconButton
                    label="Delete image"
                    icon={Trash2}
                    variant="danger"
                    onClick={() => setDeleting(image)}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Images}
            title={category ? 'Nothing in this category yet' : 'The gallery is empty'}
            description="Add transformations, coaching shots and competition photos. Each one needs alt text — that is what search engines index."
            action={
              <Button size="sm" onClick={() => setEditing('new')}>
                Add the first image
              </Button>
            }
          />
        </Card>
      )}

      {/* Mounted only while open, so every edit starts from a clean draft. */}
      {editing !== null && (
        <ImageEditor
          open
          onClose={() => setEditing(null)}
          image={editing === 'new' ? null : editing}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this image"
        confirmLabel="Delete image"
        message={`"${deleting?.title}" will be removed from the website and the file deleted. This cannot be undone.`}
      />
    </>
  )
}