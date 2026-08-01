import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useDocumentDraft } from '@/hooks/use-document-draft'
import { useValidatedDocumentSubmit } from '@/hooks/use-validated-document-submit'
import { createDocumentDraft, prepareDocumentWrite } from '@/lib/document-draft'
import { createDefaultDocumentExamples } from '@/lib/document-examples'

export const Route = createFileRoute('/')({
  component: CreateDocument,
})

function CreateDocument() {
  const initialDraft = useMemo(
    () => createDocumentDraft(createDefaultDocumentExamples()),
    [],
  )
  const editor = useDocumentDraft(initialDraft)
  const navigate = useNavigate()
  const createDocument = useMutation(api.documents.create)

  const { error, handleSubmit } = useValidatedDocumentSubmit(
    () => editor.activeExample.data,
    async () => {
      const id = await createDocument(prepareDocumentWrite(editor.draft))
      navigate({ to: '/blob/$id', params: { id } })
    },
    'Failed to create document',
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <JsonEditorPanel
          mode="create"
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
          contract={{
            value: editor.draft.contract,
            change: editor.updateContract,
            disabled: editor.draft.contractDisabled,
            diagnostics: editor.draft.diagnostics,
            schemaDiagnostics: editor.draft.schemaDiagnostics,
            inferenceStatus: editor.draft.inferenceStatus,
            inferenceError: editor.draft.inferenceError,
          }}
          exports={{
            jsonSchema: editor.draft.jsonSchema
              ? `${JSON.stringify(editor.draft.jsonSchema, null, 2)}\n`
              : undefined,
            generateTypeScript: editor.generateTypeScript,
            disabled: !editor.canSubmit,
          }}
        />
      </div>
    </div>
  )
}
