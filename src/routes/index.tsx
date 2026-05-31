import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { JsonContract } from '@/types/contract'
import type { JsonDocumentExample } from '@/types/document'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { analyzeExamplesForContract } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
import {
  createDefaultDocumentExamples,
  createDocumentExample,
} from '@/lib/document-examples'
import { parseJsonSafely } from '@/lib/json'

export const Route = createFileRoute('/')({
  component: CreateDocument,
})

function CreateDocument() {
  const [examples, setExamples] = useState<Array<JsonDocumentExample>>(
    createDefaultDocumentExamples,
  )
  const [activeExampleId, setActiveExampleId] = useState(examples[0].id)
  const [contract, setContract] = useState<JsonContract | undefined>(
    () => analyzeExamplesForContract(examples).contract,
  )
  const [contractDiagnostics, setContractDiagnostics] = useState<
    ContractDiagnostics | undefined
  >(() => analyzeExamplesForContract(examples).diagnostics)
  const [contractDisabled, setContractDisabled] = useState(false)
  const navigate = useNavigate()
  const createDocument = useMutation(api.documents.create)

  const activeExample = useMemo(
    () =>
      examples.find((example) => example.id === activeExampleId) ?? examples[0],
    [activeExampleId, examples],
  )

  const updateContractFromExamples = useCallback(
    (nextExamples: Array<JsonDocumentExample>) => {
      const parsedExamples = nextExamples.map((example) =>
        parseJsonSafely(example.data),
      )

      if (parsedExamples.some((result) => !result.ok)) {
        setContractDisabled(true)
        setContractDiagnostics(undefined)
        return
      }

      const analysis = analyzeExamplesForContract(nextExamples)
      setContract((current) => mergeContractEdits(analysis.contract, current))
      setContractDiagnostics(analysis.diagnostics)
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

  const handleRenameExample = useCallback((id: string, name: string) => {
    setExamples((current) =>
      current.map((example) =>
        example.id === id
          ? { ...example, name, updatedAt: Date.now() }
          : example,
      ),
    )
  }, [])

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
          contractDiagnostics={contractDiagnostics}
          onReset={() => {
            const resetExamples = createDefaultDocumentExamples()
            const analysis = analyzeExamplesForContract(resetExamples)
            setExamples(resetExamples)
            setActiveExampleId(resetExamples[0].id)
            setContract(analysis.contract)
            setContractDiagnostics(analysis.diagnostics)
            setContractDisabled(false)
          }}
        />
      </div>
    </div>
  )
}
