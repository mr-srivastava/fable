import type { JsonDocumentVariant } from '@shared/document'

export function buildDocumentVariant(
  overrides: Partial<JsonDocumentVariant> = {},
): JsonDocumentVariant {
  return {
    id: 'one',
    name: 'Variant',
    data: '{}',
    createdAt: 1,
    ...overrides,
  }
}
