import type { JsonDocumentVariant, JsonSchema } from '@shared/document'
import type { DocumentDraft } from '@/lib/document-draft'
import { applyDraftInference, createDocumentDraft } from '@/lib/document-draft'
import { buildDocumentVariant } from '@/test/factories/document'

export function buildDraftVariant(
  id: string,
  value: unknown,
  overrides: Partial<JsonDocumentVariant> = {},
): JsonDocumentVariant {
  return buildDocumentVariant({
    id,
    name: id,
    data: JSON.stringify(value),
    createdAt: 1,
    ...overrides,
  })
}

export function readyDraft(
  variants: Array<JsonDocumentVariant>,
  jsonSchema: JsonSchema,
): DocumentDraft {
  return applyDraftInference(createDocumentDraft(variants), jsonSchema)
}
