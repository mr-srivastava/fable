import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { JsonEditorPanel } from '@/components/JsonEditorPanel'
import { useDocumentEditor } from '@/hooks/use-document-editor'
import { createConvexPersistAdapter } from '@/lib/convex-persist-adapter'
import { createDocumentDraft } from '@/lib/document-draft'
import { createDefaultDocumentVariants } from '@/lib/document-variants'

export const Route = createFileRoute('/_app/playground')({
  component: PlaygroundPage,
})

function PlaygroundPage() {
  const initialDraft = useMemo(
    () => createDocumentDraft(createDefaultDocumentVariants()),
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
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={editor.model}
        commands={editor.commands}
      />
    </div>
  )
}
