import type { JsonDocumentExample } from '@shared/document'

export function buildDocumentExample(
  overrides: Partial<JsonDocumentExample> = {},
): JsonDocumentExample {
  return {
    id: 'one',
    name: 'Example',
    data: '{}',
    createdAt: 1,
    ...overrides,
  }
}
