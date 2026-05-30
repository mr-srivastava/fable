import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import type { JsonContract } from '@/types/contract'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { inferContractFromJson } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
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

  const parsed = parseJsonSafely(document.data)
  return parsed.ok ? inferContractFromJson(parsed.value) : undefined
}

function DocumentEditor({
  id,
  document,
}: {
  id: Id<'documents'>
  document: Doc<'documents'>
}) {
  const [json, setJson] = useState(document.data)
  const [contract, setContract] = useState<JsonContract | undefined>(() =>
    getInitialContract(document),
  )
  const [contractDisabled, setContractDisabled] = useState(false)
  const updateDocument = useMutation(api.documents.update)

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
      await updateDocument({ id, data, contract })
    },
    [contract, id, updateDocument],
  )

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => json,
    submitDocument,
    'Failed to update document',
  )

  const documentUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blob/${id}`
      : `/blob/${id}`

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
          value={json}
          onChange={handleJsonChange}
          error={error ?? undefined}
          onSubmit={handleSubmit}
          title="Saved specimen"
          description={`Last updated ${updatedAtFormatted}`}
          documentUrl={documentUrl}
          contract={contract}
          onContractChange={setContract}
          contractDisabled={contractDisabled}
          onReset={() => {
            setJson(document.data)
            setContract(getInitialContract(document))
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
