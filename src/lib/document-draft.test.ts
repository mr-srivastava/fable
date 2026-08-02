import { describe, expect, it } from 'vitest'
import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
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
import { buildDraftExample, readyDraft } from '@/test/factories/document-draft'
import {
  draftIdAndNameSchema,
  draftIdNumberSchema,
  draftIdOptionalSchema,
  draftIdStringSchema,
  draftStatusSchema,
} from '@/test/factories/schema'

describe('document draft', () => {
  it('updates examples and preserves editable contract metadata', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { id: '1' })],
      draftIdStringSchema,
    )
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
    const updated = applyDraftInference(changed, draftIdAndNameSchema)

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
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    const invalid = updateDraftExample(initial, 'one', '{', 2)

    expect(invalid.diagnostics).toBeUndefined()
    expect(invalid.contract).toEqual(initial.contract)
  })

  it('selects a newly added example and selects the first after deletion', () => {
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    const added = addDraftExample(
      initial,
      buildDraftExample('two', { id: '2' }),
    )
    const removed = removeDraftExample(added, 'two')

    expect(getActiveExample(added).id).toBe('two')
    expect(getActiveExample(removed).id).toBe('one')
  })

  it('does not remove the final example', () => {
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    expect(removeDraftExample(initial, 'one')).toBe(initial)
  })

  it('does not add examples beyond the document limit', () => {
    const initial = createDocumentDraft(
      Array.from({ length: MAX_EXAMPLES_PER_DOCUMENT }, (_, index) =>
        buildDraftExample(String(index), { index }),
      ),
    )

    expect(addDraftExample(initial, buildDraftExample('extra', {}))).toBe(
      initial,
    )
  })

  it('renames without recomputing the contract', () => {
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    const renamed = renameDraftExample(initial, 'one', 'Success', 2)

    expect(renamed.examples[0]).toMatchObject({
      name: 'Success',
      updatedAt: 2,
    })
    expect(renamed.contract).toBe(initial.contract)
  })

  it('prepares one canonical persistence input', () => {
    const draft = readyDraft(
      [
        buildDraftExample('one', { id: '1' }),
        buildDraftExample('two', { id: '2' }),
      ],
      draftIdStringSchema,
    )

    expect(prepareDocumentWrite(draft)).toMatchObject({
      examples: draft.examples,
      jsonSchema: draft.jsonSchema,
      contractOverrides: draft.contractOverrides,
    })
  })

  it('rejects invalid drafts before persistence', () => {
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    const invalid = updateDraftExample(initial, 'one', '{', 2)

    expect(() => prepareDocumentWrite(invalid)).toThrow(
      'All examples must contain valid JSON',
    )
  })

  it('treats edited enum values as authoritative constraints', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { status: 'ok' })],
      draftStatusSchema,
    )
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

  it('applies required overrides directly and clears them when matching inference', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { id: '1' }), buildDraftExample('two', {})],
      draftIdOptionalSchema,
    )
    const field = initial.contract!.fields.find((item) => item.path === 'id')!
    expect(field.required).toBe(false)

    const required = updateDraftContractOverride(initial, {
      type: 'requiredChanged',
      pointer: field.schemaPointer!,
      required: true,
    })
    expect(
      required.contract?.fields.find((item) => item.path === 'id'),
    ).toMatchObject({ required: true })
    expect(required.contractOverrides).toEqual([
      expect.objectContaining({ pointer: field.schemaPointer, required: true }),
    ])
    expect(required.schemaDiagnostics.length).toBeGreaterThan(0)

    const restored = updateDraftContractOverride(required, {
      type: 'requiredChanged',
      pointer: field.schemaPointer!,
      required: false,
    })
    expect(
      restored.contract?.fields.find((item) => item.path === 'id'),
    ).toMatchObject({ required: false })
    expect(restored.contractOverrides).toEqual([])
    expect(restored.schemaDiagnostics).toEqual([])
  })

  it('applies nullable overrides directly and clears them when matching inference', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { id: '1' })],
      draftIdStringSchema,
    )
    const field = initial.contract!.fields.find((item) => item.path === 'id')!
    expect(field.nullable).toBe(false)

    const nullable = updateDraftContractOverride(initial, {
      type: 'nullableChanged',
      pointer: field.schemaPointer!,
      nullable: true,
    })
    expect(
      nullable.contract?.fields.find((item) => item.path === 'id'),
    ).toMatchObject({ nullable: true })
    expect(nullable.contractOverrides).toEqual([
      expect.objectContaining({
        pointer: field.schemaPointer,
        nullable: true,
      }),
    ])

    const restored = updateDraftContractOverride(nullable, {
      type: 'nullableChanged',
      pointer: field.schemaPointer!,
      nullable: false,
    })
    expect(
      restored.contract?.fields.find((item) => item.path === 'id'),
    ).toMatchObject({ nullable: false })
    expect(restored.contractOverrides).toEqual([])
  })

  it('ignores override changes for unknown schema pointers', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { id: '1' })],
      draftIdStringSchema,
    )
    const unchanged = updateDraftContractOverride(initial, {
      type: 'descriptionChanged',
      pointer: '/properties/missing',
      description: 'Gone',
    })

    expect(unchanged).toBe(initial)
  })

  it('retains the last schema when examples change', () => {
    const initial = readyDraft(
      [buildDraftExample('one', { id: 1 })],
      draftIdNumberSchema,
    )
    const changed = updateDraftExample(initial, 'one', '{"id":2}', 2)

    expect(changed.jsonSchema).toBe(initial.jsonSchema)
  })

  it('produces stable snapshots for dirty-state comparison', () => {
    const initial = createDocumentDraft([buildDraftExample('one', { id: '1' })])
    expect(getDocumentDraftSnapshot(initial)).toBe(
      getDocumentDraftSnapshot(initial),
    )
  })
})
