import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
  const navigate = useNavigate()
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
      navigate({ to: '/blob/$id', params: { id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blob')
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
        />
      </div>
    </div>
  )
}
