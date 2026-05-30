import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedBlobSubmit } from '@/hooks/use-validated-blob-submit'

export const Route = createFileRoute('/')({
  component: CreateBlob,
})

function CreateBlob() {
  const [json, setJson] = useState('')
  const navigate = useNavigate()
  const createBlob = useMutation(api.blobs.create)

  const submitBlob = useCallback(
    async (data: string) => {
      const id = await createBlob({ data })
      navigate({ to: '/blob/$id', params: { id } })
    },
    [createBlob, navigate],
  )

  const { error, handleSubmit } = useValidatedBlobSubmit(
    () => json,
    submitBlob,
    'Failed to create blob',
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <JsonEditorPanel
          mode="create"
          value={json}
          onChange={setJson}
          error={error ?? undefined}
          onSubmit={handleSubmit}
          onReset={() => setJson('')}
        />
      </div>
    </div>
  )
}
