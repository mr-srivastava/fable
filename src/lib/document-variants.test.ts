import { describe, expect, it } from 'vitest'
import { normalizeDocumentVariants } from '@/lib/document-variants'

describe('normalizeDocumentVariants', () => {
  it('preserves variants on current documents', () => {
    const variants = [
      {
        id: 'one',
        name: 'Success',
        data: '{"ok":true}',
        createdAt: 1,
      },
    ]

    expect(normalizeDocumentVariants({ data: '{}', variants })).toBe(variants)
  })

  it('reads legacy examples records', () => {
    const examples = [
      {
        id: 'one',
        name: 'Success',
        data: '{"ok":true}',
        createdAt: 1,
      },
    ]

    expect(normalizeDocumentVariants({ data: '{}', examples })).toBe(examples)
  })

  it('normalizes legacy data into one default variant', () => {
    expect(
      normalizeDocumentVariants({ data: '{"legacy":true}', _creationTime: 7 }),
    ).toEqual([
      {
        id: 'default',
        name: 'Variant',
        data: '{"legacy":true}',
        createdAt: 7,
      },
    ])
  })
})
