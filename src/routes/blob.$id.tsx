import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { validateJSON } from '@/lib/validators'

export const Route = createFileRoute('/blob/$id')({
  component: ViewBlob,
})

function ViewBlob() {
  const { id } = Route.useParams()
  const blob = useQuery(api.blobs.get, { id: id as Id<'blobs'> })
  const [json, setJson] = useState('')
  const [error, setError] = useState<string | null>(null)

  const updateBlob = useMutation(api.blobs.update)

  useEffect(() => {
    if (blob?.data) {
      setJson(blob.data)
    }
  }, [blob])

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

  if (blob === undefined) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (blob === null) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Blob not found</p>
        <Link to="/" className="text-primary underline">
          Create a blob
        </Link>
      </div>
    )
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
      <div className="mx-auto max-w-5xl space-y-6">
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
