import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { validateJSON } from '@/lib/validators'

export const Route = createFileRoute('/blob/$id')({
  component: ViewBlob,
})

function BlobEditor({
  id,
  blob,
}: {
  id: string
  blob: Doc<'blobs'>
}) {
  const [json, setJson] = useState(blob.data)
  const [error, setError] = useState<string | null>(null)
  const updateBlob = useMutation(api.blobs.update)

  const handleUpdate = async () => {
    setError(null)
    const validation = validateJSON(json)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid JSON')
      return
    }
    try {
      await updateBlob({ id: id as Id<'blobs'>, data: json })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update blob')
    }
  }

  const blobUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blob/${id}`
      : `/blob/${id}`

  const updatedAtMs = blob.updatedAt ?? blob._creationTime
  const updatedAtFormatted = updatedAtMs
    ? new Date(updatedAtMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <JsonEditorPanel
          mode="view"
          value={json}
          onChange={setJson}
          error={error ?? undefined}
          onSubmit={handleUpdate}
          title="JSON blob"
          description={`Last updated ${updatedAtFormatted}`}
          blobUrl={blobUrl}
          onReset={() => setJson(blob.data)}
        />
      </div>
    </div>
  )
}

function ViewBlob() {
  const { id } = Route.useParams()
  const blob = useQuery(api.blobs.get, { id: id as Id<'blobs'> })

  if (blob === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="font-medium text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (blob === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-medium text-destructive">Blob not found</p>
        <Link to="/" className="font-medium text-primary hover:underline">
          Create a blob
        </Link>
      </div>
    )
  }

  return <BlobEditor key={blob._id} id={id} blob={blob} />
}
