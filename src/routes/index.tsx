import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { validateJSON } from '@/lib/validators'

export const Route = createFileRoute('/')({
  component: CreateBlob,
})

function CreateBlob() {
  const [json, setJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createBlob = useMutation(api.blobs.create)

  const handleCreate = async () => {
    setError(null)
    const validation = validateJSON(json)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid JSON')
      return
    }
    try {
      const id = await createBlob({ data: json })
      const url =
        typeof window !== 'undefined' ? `${window.location.origin}/blob/${id}` : `/blob/${id}`
      setBlobUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blob')
    }
  }

  const handleCopyUrl = async () => {
    if (!blobUrl) return
    try {
      await navigator.clipboard.writeText(blobUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy URL')
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <JsonEditorPanel
          mode="create"
          value={json}
          onChange={setJson}
          error={error ?? undefined}
          onSubmit={handleCreate}
          onReset={() => setJson('')}
          blobUrl={blobUrl}
          onCopyUrl={handleCopyUrl}
          copied={copied}
        />
      </div>
    </div>
  )
}
