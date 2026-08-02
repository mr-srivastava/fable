import { serializeJsonSchema } from '@shared/document'
import type { DocumentWriteInput } from '@/lib/document-draft'
import type { DocumentPersistenceResult } from '@/lib/document-editor-machine'

export type ConvexDocumentWriteArgs = Omit<DocumentWriteInput, 'jsonSchema'> & {
  jsonSchemaJson?: string
}

export function toConvexDocumentWriteArgs(
  input: DocumentWriteInput,
): ConvexDocumentWriteArgs {
  const { jsonSchema, ...documentInput } = input
  return {
    ...documentInput,
    jsonSchemaJson: serializeJsonSchema(jsonSchema),
  }
}

export function createConvexPersistAdapter<TDocumentId extends string>(
  options:
    | {
        mode: 'create'
        createDocument: (args: ConvexDocumentWriteArgs) => Promise<TDocumentId>
        onCreated: (documentId: TDocumentId) => void | Promise<void>
      }
    | {
        mode: 'update'
        documentId: TDocumentId
        updateDocument: (
          args: ConvexDocumentWriteArgs & { id: TDocumentId },
        ) => Promise<unknown>
      },
): (input: DocumentWriteInput) => Promise<DocumentPersistenceResult> {
  if (options.mode === 'create') {
    return async (input) => {
      const documentId = await options.createDocument(
        toConvexDocumentWriteArgs(input),
      )
      await options.onCreated(documentId)
      return { type: 'created', documentId }
    }
  }

  return async (input) => {
    await options.updateDocument({
      id: options.documentId,
      ...toConvexDocumentWriteArgs(input),
    })
    return { type: 'updated' }
  }
}
