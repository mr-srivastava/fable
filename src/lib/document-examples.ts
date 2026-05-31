import type { JsonDocumentExample } from '@/types/document'

const DEFAULT_EXAMPLE_ID = 'default'
const DEFAULT_EXAMPLE_NAME = 'Example'
const NEW_EXAMPLE_DATA = '{\n  \n}'

type DocumentWithExamples = {
  data: string
  _creationTime?: number
  examples?: Array<JsonDocumentExample>
}

export function createExampleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createDocumentExample(
  index: number,
  data = NEW_EXAMPLE_DATA,
): JsonDocumentExample {
  const now = Date.now()

  return {
    id: createExampleId(),
    name: `Example ${index}`,
    data,
    createdAt: now,
  }
}

export function normalizeDocumentExamples(
  document: DocumentWithExamples,
): Array<JsonDocumentExample> {
  if (document.examples && document.examples.length > 0) {
    return document.examples
  }

  return [
    {
      id: DEFAULT_EXAMPLE_ID,
      name: DEFAULT_EXAMPLE_NAME,
      data: document.data,
      createdAt: document._creationTime ?? Date.now(),
    },
  ]
}
