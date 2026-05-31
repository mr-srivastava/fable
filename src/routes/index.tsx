import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { JsonContract } from '@/types/contract'
import type { JsonDocumentExample } from '@/types/document'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { inferContractFromExamples } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
import { createDocumentExample } from '@/lib/document-examples'
import { parseJsonSafely } from '@/lib/json'

export const Route = createFileRoute('/')({
  component: CreateDocument,
})

function CreateDocument() {
  const [examples, setExamples] = useState<Array<JsonDocumentExample>>(() => [
    createDocumentExample(1, ''),
  ])
  const [activeExampleId, setActiveExampleId] = useState(examples[0].id)
  const [contract, setContract] = useState<JsonContract | undefined>()
  const [contractDisabled, setContractDisabled] = useState(true)
  const navigate = useNavigate()
  const createDocument = useMutation(api.documents.create)

  const activeExample = useMemo(
    () =>
      examples.find((example) => example.id === activeExampleId) ??
      examples[0],
    [activeExampleId, examples],
  )

  const updateContractFromExamples = useCallback(
    (nextExamples: Array<JsonDocumentExample>) => {
      const parsedExamples = nextExamples.map((example) =>
        parseJsonSafely(example.data),
      )

      if (parsedExamples.some((result) => !result.ok)) {
        setContractDisabled(true)
        return
      }

      const inferred = inferContractFromExamples(nextExamples)
      setContract((current) => mergeContractEdits(inferred, current))
      setContractDisabled(false)
    },
    [],
  )

  const handleJsonChange = useCallback(
    (value: string) => {
      const now = Date.now()
      const nextExamples = examples.map((example) =>
        example.id === activeExampleId
          ? { ...example, data: value, updatedAt: now }
          : example,
      )

      setExamples(nextExamples)
      updateContractFromExamples(nextExamples)
    },
    [activeExampleId, examples, updateContractFromExamples],
  )

  const handleRenameExample = useCallback(
    (id: string, name: string) => {
      setExamples((current) =>
        current.map((example) =>
          example.id === id
            ? { ...example, name, updatedAt: Date.now() }
            : example,
        ),
      )
    },
    [],
  )

  const handleAddExample = useCallback(() => {
    const nextExample = createDocumentExample(examples.length + 1)
    const nextExamples = [...examples, nextExample]
    setExamples(nextExamples)
    setActiveExampleId(nextExample.id)
    updateContractFromExamples(nextExamples)
  }, [examples, updateContractFromExamples])

  const handleDeleteExample = useCallback(
    (id: string) => {
      if (examples.length === 1) return

      const nextExamples = examples.filter((example) => example.id !== id)
      setExamples(nextExamples)
      if (activeExampleId === id) {
        setActiveExampleId(nextExamples[0].id)
      }
      updateContractFromExamples(nextExamples)
    },
    [activeExampleId, examples, updateContractFromExamples],
  )

  const submitDocument = useCallback(async () => {
    if (examples.length === 0) {
      throw new Error('At least one example is required')
    }

    if (examples.some((example) => !parseJsonSafely(example.data).ok)) {
      throw new Error('All examples must contain valid JSON')
    }

    const firstExample = examples[0]
    const id = await createDocument({
      data: firstExample.data,
      examples,
      contract,
    })
    navigate({ to: '/blob/$id', params: { id } })
  }, [contract, createDocument, examples, navigate])

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => activeExample.data,
    submitDocument,
    'Failed to create document',
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <JsonEditorPanel
          mode="create"
          value={activeExample.data}
          onChange={handleJsonChange}
          examples={examples}
          activeExampleId={activeExampleId}
          onSelectExample={setActiveExampleId}
          onRenameExample={handleRenameExample}
          onAddExample={handleAddExample}
          onDeleteExample={handleDeleteExample}
          error={error ?? undefined}
          onSubmit={handleSubmit}
          contract={contract}
          onContractChange={setContract}
          contractDisabled={contractDisabled}
          onReset={() => {
            const resetExample = createDocumentExample(1, '')
            setExamples([resetExample])
            setActiveExampleId(resetExample.id)
            setContract(undefined)
            setContractDisabled(true)
          }}
        />
      </div>
    </div>
  )
}
