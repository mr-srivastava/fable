import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import type { JsonContract } from '@/types/contract'
import type { JsonDocumentExample } from '@/types/document'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { analyzeExamplesForContract } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
import {
  createDocumentExample,
  normalizeDocumentExamples,
} from '@/lib/document-examples'
import { parseDocumentId } from '@/lib/document-id'
import { parseJsonSafely } from '@/lib/json'

export const Route = createFileRoute('/blob/$id')({
  component: ViewDocument,
})

function DocumentNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <p className="font-medium text-destructive">Document not found</p>
      <Link to="/" className="font-medium text-primary hover:underline">
        Create a specimen
      </Link>
    </div>
  )
}

function getInitialContract(
  document: Doc<'documents'>,
): JsonContract | undefined {
  if (document.contract) return document.contract as JsonContract

  const examples = normalizeDocumentExamples(document)
  const allExamplesAreValid = examples.every(
    (example) => parseJsonSafely(example.data).ok,
  )

  return allExamplesAreValid
    ? analyzeExamplesForContract(examples).contract
    : undefined
}

function getInitialContractDiagnostics(
  document: Doc<'documents'>,
): ContractDiagnostics | undefined {
  const examples = normalizeDocumentExamples(document)
  const allExamplesAreValid = examples.every(
    (example) => parseJsonSafely(example.data).ok,
  )

  return allExamplesAreValid
    ? analyzeExamplesForContract(examples).diagnostics
    : undefined
}

function getDocumentSnapshot(
  examples: Array<JsonDocumentExample>,
  contract?: JsonContract,
) {
  return JSON.stringify({ examples, contract: contract ?? null })
}

function DocumentEditor({
  id,
  document,
}: {
  id: Id<'documents'>
  document: Doc<'documents'>
}) {
  const initialExamples = useMemo(
    () => normalizeDocumentExamples(document),
    [document],
  )
  const [examples, setExamples] =
    useState<Array<JsonDocumentExample>>(initialExamples)
  const [activeExampleId, setActiveExampleId] = useState(initialExamples[0].id)
  const [contract, setContract] = useState<JsonContract | undefined>(() =>
    getInitialContract(document),
  )
  const [contractDiagnostics, setContractDiagnostics] = useState<
    ContractDiagnostics | undefined
  >(() => getInitialContractDiagnostics(document))
  const [contractDisabled, setContractDisabled] = useState(false)
  const updateDocument = useMutation(api.documents.update)

  const savedSnapshot = useMemo(
    () => getDocumentSnapshot(initialExamples, getInitialContract(document)),
    [document, initialExamples],
  )

  const currentSnapshot = useMemo(
    () => getDocumentSnapshot(examples, contract),
    [contract, examples],
  )

  const hasUnsavedChanges = currentSnapshot !== savedSnapshot

  useEffect(() => {
    if (!hasUnsavedChanges) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const activeExample = useMemo(
    () =>
      examples.find((example) => example.id === activeExampleId) ?? examples[0],
    [activeExampleId, examples],
  )

  const updateContractFromExamples = useCallback(
    (nextExamples: Array<JsonDocumentExample>) => {
      const allExamplesAreValid = nextExamples.every(
        (example) => parseJsonSafely(example.data).ok,
      )

      if (!allExamplesAreValid) {
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

  const handleRenameExample = useCallback((exampleId: string, name: string) => {
    setExamples((current) =>
      current.map((example) =>
        example.id === exampleId
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
    (exampleId: string) => {
      if (examples.length === 1) return

      const nextExamples = examples.filter(
        (example) => example.id !== exampleId,
      )
      setExamples(nextExamples)
      if (activeExampleId === exampleId) {
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
    await updateDocument({
      id,
      data: firstExample.data,
      examples,
      contract,
    })
  }, [contract, examples, id, updateDocument])

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => activeExample.data,
    submitDocument,
    'Failed to update document',
  )

  const documentUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blob/${id}`
      : `/blob/${id}`
  const apiUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/blob/${id}`
      : `/api/blob/${id}`

  const updatedAtMs = document.updatedAt ?? document._creationTime
  const updatedAtFormatted = updatedAtMs
    ? new Date(updatedAtMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <JsonEditorPanel
          mode="view"
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
          title="Saved specimen"
          description={`Last updated ${updatedAtFormatted}`}
          documentUrl={documentUrl}
          apiUrl={apiUrl}
          hasUnsavedChanges={hasUnsavedChanges}
          contract={contract}
          onContractChange={setContract}
          contractDisabled={contractDisabled}
          contractDiagnostics={contractDiagnostics}
          onReset={() => {
            setExamples(initialExamples)
            setActiveExampleId(initialExamples[0].id)
            setContract(getInitialContract(document))
            setContractDiagnostics(getInitialContractDiagnostics(document))
            setContractDisabled(false)
          }}
        />
      </div>
    </div>
  )
}

function ViewDocument() {
  const { id: rawId } = Route.useParams()
  const id = parseDocumentId(rawId)
  const document = useQuery(api.documents.get, id ? { id } : 'skip')

  if (!id) {
    return <DocumentNotFound />
  }

  if (document === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="font-medium text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (document === null) {
    return <DocumentNotFound />
  }

  return <DocumentEditor key={document._id} id={id} document={document} />
}
