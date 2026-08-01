import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { parseDocumentId, parseJsonContract } from '@shared/document'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useDocumentDraft } from '@/hooks/use-document-draft'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { createDocumentDraft, prepareDocumentWrite } from '@/lib/document-draft'
import { normalizeDocumentExamples } from '@/lib/document-examples'

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

function DocumentEditor({
  id,
  document,
}: {
  id: Id<'documents'>
  document: Doc<'documents'>
}) {
  const initialDraft = useMemo(
    () =>
      createDocumentDraft(
        normalizeDocumentExamples(document),
        document.contract ? parseJsonContract(document.contract) : undefined,
      ),
    [document],
  )
  const editor = useDocumentDraft(initialDraft)
  const updateDocument = useMutation(api.documents.update)

  useEffect(() => {
    if (!editor.hasUnsavedChanges) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [editor.hasUnsavedChanges])

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => editor.activeExample.data,
    async () => {
      await updateDocument({ id, ...prepareDocumentWrite(editor.draft) })
    },
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
          value={editor.activeExample.data}
          onChange={editor.updateExample}
          examples={{
            items: editor.draft.examples,
            activeId: editor.draft.activeExampleId,
            select: editor.selectExample,
            rename: editor.renameExample,
            add: editor.addExample,
            remove: editor.removeExample,
          }}
          error={error ?? undefined}
          actions={{ submit: handleSubmit, reset: editor.reset }}
          validation={{
            payloadStatus: editor.payloadStatus,
            canSubmit: editor.canSubmit,
          }}
          title="Saved specimen"
          description={`Last updated ${updatedAtFormatted}`}
          documentUrl={documentUrl}
          apiUrl={apiUrl}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          contract={{
            value: editor.draft.contract,
            change: editor.updateContract,
            disabled: editor.draft.contractDisabled,
            diagnostics: editor.draft.diagnostics,
          }}
        />
      </div>
    </div>
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
