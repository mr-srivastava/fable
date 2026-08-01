import type { JsonDocumentExample } from '@shared/document'

const DEFAULT_EXAMPLE_ID = 'default'
const DEFAULT_EXAMPLE_NAME = 'Example'
const NEW_EXAMPLE_DATA = '{\n  \n}'

const DEFAULT_CREATE_EXAMPLES = [
  {
    name: 'Success',
    data: {
      status: 'success',
      requestId: 'req_01JH9ZK7Q6M2Y4P8N3R5T1A0BC',
      data: {
        id: 'user_123',
        name: 'Avery Stone',
        email: 'avery@example.com',
        plan: 'pro',
        verified: true,
        lastLoginAt: '2026-05-31T09:30:00Z',
      },
      error: null,
    },
  },
  {
    name: 'Error',
    data: {
      status: 'error',
      requestId: 'req_01JH9ZK9E8X5F2VCQ7TD4MBH2K',
      data: null,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'No user exists for the supplied identifier.',
        retryable: false,
      },
    },
  },
  {
    name: 'Null State',
    data: {
      status: 'success',
      requestId: 'req_01JH9ZKCPK9M7EA3YB6QK2W4ZD',
      data: {
        id: 'user_456',
        name: null,
        email: 'pending@example.com',
        plan: 'free',
        verified: false,
        lastLoginAt: null,
      },
      error: null,
    },
  },
] as const

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
  name = `Example ${index}`,
): JsonDocumentExample {
  const now = Date.now()

  return {
    id: createExampleId(),
    name,
    data,
    createdAt: now,
  }
}

export function createDefaultDocumentExamples(): Array<JsonDocumentExample> {
  return DEFAULT_CREATE_EXAMPLES.map((example, index) =>
    createDocumentExample(
      index + 1,
      JSON.stringify(example.data, null, 2),
      example.name,
    ),
  )
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
