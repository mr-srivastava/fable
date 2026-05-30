import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { JsonContract } from '@/types/contract'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { inferContractFromJson } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
import { parseJsonSafely } from '@/lib/json'

export const Route = createFileRoute('/')({
  component: CreateDocument,
})

function CreateDocument() {
  const [json, setJson] = useState('')
  const [contract, setContract] = useState<JsonContract | undefined>()
  const [contractDisabled, setContractDisabled] = useState(true)
  const navigate = useNavigate()
  const createDocument = useMutation(api.documents.create)

  const handleJsonChange = useCallback((value: string) => {
    setJson(value)

    const parsed = parseJsonSafely(value)
    if (!parsed.ok) {
      setContractDisabled(true)
      return
    }

    const inferred = inferContractFromJson(parsed.value)
    setContract((current) => mergeContractEdits(inferred, current))
    setContractDisabled(false)
  }, [])

  const submitDocument = useCallback(
    async (data: string) => {
      const id = await createDocument({ data, contract })
      navigate({ to: '/blob/$id', params: { id } })
    },
    [contract, createDocument, navigate],
  )

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => json,
    submitDocument,
    'Failed to create document',
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <JsonEditorPanel
          mode="create"
          value={json}
          onChange={handleJsonChange}
          error={error ?? undefined}
          onSubmit={handleSubmit}
          contract={contract}
          onContractChange={setContract}
          contractDisabled={contractDisabled}
          onReset={() => {
            setJson('')
            setContract(undefined)
            setContractDisabled(true)
          }}
        />
      </div>
    </div>
  )
}
