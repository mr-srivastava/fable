import type { JsonDocumentVariant } from '@shared/document'

const DEFAULT_VARIANT_ID = 'default'
const DEFAULT_VARIANT_NAME = 'Variant'
const NEW_VARIANT_DATA = '{\n  \n}'

const DEFAULT_CREATE_VARIANTS = [
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

type DocumentWithVariants = {
  data: string
  _creationTime?: number
  variants?: Array<JsonDocumentVariant>
  /** Legacy persisted field. Prefer `variants`. */
  examples?: Array<JsonDocumentVariant>
}

export function createVariantId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createDocumentVariant(
  index: number,
  data = NEW_VARIANT_DATA,
  name = `Variant ${index}`,
): JsonDocumentVariant {
  const now = Date.now()

  return {
    id: createVariantId(),
    name,
    data,
    createdAt: now,
  }
}

export function createDefaultDocumentVariants(): Array<JsonDocumentVariant> {
  return DEFAULT_CREATE_VARIANTS.map((variant, index) =>
    createDocumentVariant(
      index + 1,
      JSON.stringify(variant.data, null, 2),
      variant.name,
    ),
  )
}

export function normalizeDocumentVariants(
  document: DocumentWithVariants,
): Array<JsonDocumentVariant> {
  const variants = document.variants ?? document.examples
  if (variants && variants.length > 0) {
    return variants
  }

  return [
    {
      id: DEFAULT_VARIANT_ID,
      name: DEFAULT_VARIANT_NAME,
      data: document.data,
      createdAt: document._creationTime ?? Date.now(),
    },
  ]
}
