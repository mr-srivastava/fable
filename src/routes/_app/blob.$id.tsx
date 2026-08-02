import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useAction, useQuery } from 'convex/react'
import {
  parseContractOverrides,
  parseDocumentId,
  parseJsonContract,
  parseSerializedJsonSchema,
} from '@shared/document'
import { api } from '../../../convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../../convex/_generated/dataModel'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useDocumentEditor } from '@/hooks/use-document-editor'
import { createConvexPersistAdapter } from '@/lib/convex-persist-adapter'
import { createDocumentDraft } from '@/lib/document-draft'
import { normalizeDocumentVariants } from '@/lib/document-variants'

export const Route = createFileRoute('/_app/blob/$id')({
  component: ViewDocument,
})

function DocumentNotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-4 p-6">
      <p className="font-medium text-destructive">Document not found</p>
      <Link
        to="/playground"
        className="font-medium text-primary hover:underline"
      >
        Create a specimen
      </Link>
    </div>
  )
}

function DocumentEditor({
  id,
  document,
}: {
  id: Id<'documents'>
  document: NonNullable<FunctionReturnType<typeof api.documents.get>>
}) {
  const initialDraft = useMemo(
    () =>
      createDocumentDraft(
        normalizeDocumentVariants(document),
        document.contract ? parseJsonContract(document.contract) : undefined,
        document.jsonSchemaJson
          ? parseSerializedJsonSchema(document.jsonSchemaJson)
          : undefined,
        document.contractOverrides
          ? parseContractOverrides(document.contractOverrides)
          : [],
      ),
    [document],
  )
  const updateDocument = useAction(api.documentWrites.update)
  const editor = useDocumentEditor({
    initialDraft,
    persistDocument: createConvexPersistAdapter({
      mode: 'update',
      documentId: id,
      updateDocument,
    }),
  })

  useEffect(() => {
    if (!editor.model.hasUnsavedChanges) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [editor.model.hasUnsavedChanges])

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
    <JsonEditorPanel
      mode={{ type: 'saved', documentUrl, apiUrl }}
      model={editor.model}
      commands={editor.commands}
      title="Saved specimen"
      description={`Last updated ${updatedAtFormatted}`}
    />
  )
}

function ViewDocument() {
  const { id: rawId } = Route.useParams()
  const id = parseDocumentId<Id<'documents'>>(rawId)
  const document = useQuery(api.documents.get, id ? { id } : 'skip')

  if (!id) {
    return <DocumentNotFound />
  }

  if (document === undefined) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center p-6">
        <p className="font-medium text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (document === null) {
    return <DocumentNotFound />
  }

  return <DocumentEditor key={document._id} id={id} document={document} />
}
