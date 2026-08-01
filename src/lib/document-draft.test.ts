import { describe, expect, it } from 'vitest'
import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
import type { JsonDocumentExample } from '@shared/document'
import {
  addDraftExample,
  applyDraftInference,
  createDocumentDraft,
  getActiveExample,
  getDocumentDraftSnapshot,
  prepareDocumentWrite,
  removeDraftExample,
  renameDraftExample,
  updateDraftContractOverride,
  updateDraftExample,
} from '@/lib/document-draft'
import { inferJsonSchema } from '@/lib/contract/quicktype'

function example(id: string, value: unknown): JsonDocumentExample {
  return {
    id,
    name: id,
    data: JSON.stringify(value),
    createdAt: 1,
  }
}

async function readyDraft(examples: Array<JsonDocumentExample>) {
  const draft = createDocumentDraft(examples)
  return applyDraftInference(
    draft,
    await inferJsonSchema(examples.map((item) => item.data)),
  )
}

describe('document draft', () => {
  it('updates examples and preserves editable contract metadata', async () => {
    const initial = await readyDraft([example('one', { id: '1' })])
    const idField = initial.contract?.fields.find(
      (field) => field.path === 'id',
    )
    expect(idField).toBeDefined()

    const described = updateDraftContractOverride(initial, {
      type: 'descriptionChanged',
      pointer: idField!.schemaPointer!,
      description: 'Stable identifier',
    })
    const annotated = updateDraftContractOverride(described, {
      type: 'enumChanged',
      pointer: idField!.schemaPointer!,
      enumValues: ['1', '2'],
    })
    const changed = updateDraftExample(
      annotated,
      'one',
      JSON.stringify({ id: '2', name: 'Avery' }),
      2,
    )
    const updated = applyDraftInference(
      changed,
      await inferJsonSchema(changed.examples.map((item) => item.data)),
    )

    expect(
      updated.contract?.fields.find((field) => field.path === 'id'),
    ).toMatchObject({
      description: 'Stable identifier',
      enumValues: ['1', '2'],
    })
    expect(
      updated.contract?.fields.some((field) => field.path === 'name'),
    ).toBe(true)
  })

  it('disables contract analysis while any example is invalid', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    const invalid = updateDraftExample(initial, 'one', '{', 2)

    expect(invalid.diagnostics).toBeUndefined()
    expect(invalid.contract).toEqual(initial.contract)
  })

  it('selects a newly added example and selects the first after deletion', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    const added = addDraftExample(initial, example('two', { id: '2' }))
    const removed = removeDraftExample(added, 'two')

    expect(getActiveExample(added).id).toBe('two')
    expect(getActiveExample(removed).id).toBe('one')
  })

  it('does not remove the final example', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    expect(removeDraftExample(initial, 'one')).toBe(initial)
  })

  it('does not add examples beyond the document limit', () => {
    const initial = createDocumentDraft(
      Array.from({ length: MAX_EXAMPLES_PER_DOCUMENT }, (_, index) =>
        example(String(index), { index }),
      ),
    )

    expect(addDraftExample(initial, example('extra', {}))).toBe(initial)
  })

  it('renames without recomputing the contract', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    const renamed = renameDraftExample(initial, 'one', 'Success', 2)

    expect(renamed.examples[0]).toMatchObject({
      name: 'Success',
      updatedAt: 2,
    })
    expect(renamed.contract).toBe(initial.contract)
  })

  it('prepares one canonical persistence input', async () => {
    const draft = await readyDraft([
      example('one', { id: '1' }),
      example('two', { id: '2' }),
    ])

    expect(prepareDocumentWrite(draft)).toMatchObject({
      examples: draft.examples,
      jsonSchema: draft.jsonSchema,
      contractOverrides: draft.contractOverrides,
    })
  })

  it('rejects invalid drafts before persistence', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    const invalid = updateDraftExample(initial, 'one', '{', 2)

    expect(() => prepareDocumentWrite(invalid)).toThrow(
      'All examples must contain valid JSON',
    )
  })

  it('treats edited enum values as authoritative constraints', async () => {
    const initial = await readyDraft([example('one', { status: 'ok' })])
    const field = initial.contract!.fields.find(
      (item) => item.path === 'status',
    )!
    const constrained = updateDraftContractOverride(initial, {
      type: 'enumChanged',
      pointer: field.schemaPointer!,
      enumValues: ['error'],
    })

    expect(constrained.schemaDiagnostics).toEqual([
      expect.objectContaining({ exampleId: 'one', fieldPointer: '/status' }),
    ])
    expect(() => prepareDocumentWrite(constrained)).toThrow(
      'All examples must satisfy the contract',
    )
  })

  it('retains the last schema when examples change', async () => {
    const initial = await readyDraft([example('one', { id: 1 })])
    const changed = updateDraftExample(initial, 'one', '{"id":2}', 2)

    expect(changed.jsonSchema).toBe(initial.jsonSchema)
  })

  it('produces stable snapshots for dirty-state comparison', () => {
    const initial = createDocumentDraft([example('one', { id: '1' })])
    expect(getDocumentDraftSnapshot(initial)).toBe(
      getDocumentDraftSnapshot(initial),
    )
  })
})
