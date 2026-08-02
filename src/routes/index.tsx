import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useDocumentEditor } from '@/hooks/use-document-editor'
import { createConvexPersistAdapter } from '@/lib/convex-persist-adapter'
import { createDocumentDraft } from '@/lib/document-draft'
import { createDefaultDocumentExamples } from '@/lib/document-examples'

export const Route = createFileRoute('/')({
  component: CreateDocument,
})

function CreateDocument() {
  const initialDraft = useMemo(
    () => createDocumentDraft(createDefaultDocumentExamples()),
    [],
  )
  const navigate = useNavigate()
  const createDocument = useAction(api.documentWrites.create)
  const editor = useDocumentEditor({
    initialDraft,
    persistDocument: createConvexPersistAdapter({
      mode: 'create',
      createDocument,
      onCreated: (id) => navigate({ to: '/blob/$id', params: { id } }),
    }),
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        <JsonEditorPanel
          mode={{ type: 'create' }}
          model={editor.model}
          commands={editor.commands}
        />
      </div>
    </div>
  )
}
