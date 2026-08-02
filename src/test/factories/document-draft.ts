import type { JsonDocumentExample, JsonSchema } from '@shared/document'
import type { DocumentDraft } from '@/lib/document-draft'
import { applyDraftInference, createDocumentDraft } from '@/lib/document-draft'
import { buildDocumentExample } from '@/test/factories/document'

export function buildDraftExample(
  id: string,
  value: unknown,
  overrides: Partial<JsonDocumentExample> = {},
): JsonDocumentExample {
  return buildDocumentExample({
    id,
    name: id,
    data: JSON.stringify(value),
    createdAt: 1,
    ...overrides,
  })
}

export function readyDraft(
  examples: Array<JsonDocumentExample>,
  jsonSchema: JsonSchema,
): DocumentDraft {
  return applyDraftInference(createDocumentDraft(examples), jsonSchema)
}
