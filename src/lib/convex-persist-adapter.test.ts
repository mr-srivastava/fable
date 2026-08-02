import { describe, expect, it, vi } from 'vitest'
import { serializeJsonSchema } from '@shared/document'
import type { DocumentWriteInput } from '@/lib/document-draft'
import {
  createConvexPersistAdapter,
  toConvexDocumentWriteArgs,
} from '@/lib/convex-persist-adapter'

const writeInput: DocumentWriteInput = {
  variants: [
    {
      id: 'one',
      name: 'One',
      data: '{"id":1}',
      createdAt: 1,
    },
  ],
  jsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'number' } },
    required: ['id'],
  },
  contractOverrides: [{ pointer: '/properties/id', description: 'Identifier' }],
}

describe('convex persist adapter', () => {
  it('serializes JSON schema for Convex writes', () => {
    expect(toConvexDocumentWriteArgs(writeInput)).toEqual({
      variants: writeInput.variants,
      contractOverrides: writeInput.contractOverrides,
      jsonSchemaJson: serializeJsonSchema(writeInput.jsonSchema),
    })
  })

  it('creates documents and reports the new id', async () => {
    const createDocument = vi.fn().mockResolvedValue('doc-1')
    const onCreated = vi.fn()
    const persist = createConvexPersistAdapter({
      mode: 'create',
      createDocument,
      onCreated,
    })

    await expect(persist(writeInput)).resolves.toEqual({
      type: 'created',
      documentId: 'doc-1',
    })
    expect(createDocument).toHaveBeenCalledWith(
      toConvexDocumentWriteArgs(writeInput),
    )
    expect(onCreated).toHaveBeenCalledWith('doc-1')
  })

  it('updates an existing document', async () => {
    const updateDocument = vi.fn().mockResolvedValue(undefined)
    const persist = createConvexPersistAdapter({
      mode: 'update',
      documentId: 'doc-1',
      updateDocument,
    })

    await expect(persist(writeInput)).resolves.toEqual({ type: 'updated' })
    expect(updateDocument).toHaveBeenCalledWith({
      id: 'doc-1',
      ...toConvexDocumentWriteArgs(writeInput),
    })
  })
})
