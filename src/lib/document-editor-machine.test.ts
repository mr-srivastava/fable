import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from 'xstate'
import {
  DRAFT_MUTATION_EVENTS,
  EXPORT_INVALIDATING_EVENTS,
} from './document-editor-machine'
import type { JsonSchema } from '@shared/document'
import type { DocumentEditorEvent } from './document-editor-machine'
import {
  createDocumentDraft,
  getDocumentDraftSnapshot,
} from '@/lib/document-draft'
import {
  advanceDocumentEditorToReady,
  buildMachineVariant,
  createDocumentEditorActor,
  testStatusSchema,
} from '@/test/factories/document-editor'

function draftChangeEvent(
  type: (typeof DRAFT_MUTATION_EVENTS)[number],
): DocumentEditorEvent {
  switch (type) {
    case 'variant.jsonChanged':
      return {
        type,
        variantId: 'variant-1',
        json: '{"status":"changed"}',
      }
    case 'variant.renamed':
      return { type, variantId: 'variant-1', name: 'Renamed' }
    case 'variant.added':
      return { type }
    case 'variant.removed':
      return { type, variantId: 'variant-1' }
    case 'contract.overrideChanged':
      return {
        type,
        change: {
          type: 'descriptionChanged',
          pointer: '/properties/status',
          description: 'Status',
        },
      }
    case 'document.reset':
      return { type }
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('documentEditorMachine', () => {
  it('debounces valid examples and reaches a ready contract', async () => {
    vi.useFakeTimers()
    const { actor, input } = createDocumentEditorActor()

    expect(actor.getSnapshot().matches({ analysis: 'debouncing' })).toBe(true)
    await advanceDocumentEditorToReady(actor)

    expect(input.inferContract).toHaveBeenCalledOnce()
    expect(actor.getSnapshot().context.draft.jsonSchema).toEqual(
      testStatusSchema,
    )
    actor.stop()
  })

  it('retains the last schema while invalid JSON blocks inference', async () => {
    vi.useFakeTimers()
    const { actor, input } = createDocumentEditorActor()
    await advanceDocumentEditorToReady(actor)
    const lastSchema = actor.getSnapshot().context.draft.jsonSchema

    actor.send({
      type: 'variant.jsonChanged',
      variantId: 'variant-1',
      json: '{',
    })

    expect(actor.getSnapshot().matches({ analysis: 'invalidJson' })).toBe(true)
    expect(actor.getSnapshot().context.draft.jsonSchema).toBe(lastSchema)
    expect(input.inferContract).toHaveBeenCalledOnce()
    actor.stop()
  })

  it('blocks persistence while re-inference is pending', async () => {
    vi.useFakeTimers()
    const { actor, input } = createDocumentEditorActor()
    await advanceDocumentEditorToReady(actor)

    actor.send({
      type: 'variant.jsonChanged',
      variantId: 'variant-1',
      json: '{"status":"changed"}',
    })
    actor.send({ type: 'document.submitRequested' })

    expect(actor.getSnapshot().matches({ analysis: 'debouncing' })).toBe(true)
    expect(input.persistDocument).not.toHaveBeenCalled()
    actor.stop()
  })

  it('cancels obsolete inference actors after a newer edit', async () => {
    vi.useFakeTimers()
    let firstSignal: AbortSignal | undefined
    const inferContract = vi.fn(
      (_samples: Array<string>, options: { signal: AbortSignal }) => {
        firstSignal ??= options.signal
        return new Promise<JsonSchema>(() => undefined)
      },
    )
    const { actor } = createDocumentEditorActor({ inferContract })
    await vi.advanceTimersByTimeAsync(250)
    expect(actor.getSnapshot().matches({ analysis: 'inferring' })).toBe(true)

    actor.send({
      type: 'variant.jsonChanged',
      variantId: 'variant-1',
      json: '{"status":"new"}',
    })

    expect(firstSignal?.aborted).toBe(true)
    expect(actor.getSnapshot().matches({ analysis: 'debouncing' })).toBe(true)
    actor.stop()
  })

  it('exposes inference failures without discarding the draft', async () => {
    vi.useFakeTimers()
    const { actor } = createDocumentEditorActor({
      inferContract: vi.fn().mockRejectedValue(new Error('Quicktype failed')),
    })

    await vi.advanceTimersByTimeAsync(250)
    await waitFor(actor, (snapshot) => snapshot.matches({ analysis: 'failed' }))

    expect(actor.getSnapshot().context.analysisError).toBe('Quicktype failed')
    expect(actor.getSnapshot().context.draft.variants).toHaveLength(1)
    actor.stop()
  })

  it('applies pointer-based overrides and exposes violations', async () => {
    vi.useFakeTimers()
    const { actor } = createDocumentEditorActor()
    await advanceDocumentEditorToReady(actor)
    const pointer = actor
      .getSnapshot()
      .context.draft.contract?.fields.find(
        (field) => field.path === 'status',
      )?.schemaPointer
    expect(pointer).toBeDefined()

    actor.send({
      type: 'contract.overrideChanged',
      change: {
        type: 'enumChanged',
        pointer: pointer!,
        enumValues: ['error'],
      },
    })

    expect(actor.getSnapshot().matches({ analysis: 'violations' })).toBe(true)
    expect(actor.getSnapshot().context.draft.contractOverrides).toEqual([
      expect.objectContaining({ pointer, enumValues: ['error'] }),
    ])
    actor.stop()
  })

  it('coordinates persistence, export, and the saved dirty baseline', async () => {
    vi.useFakeTimers()
    const { actor, input } = createDocumentEditorActor()
    await advanceDocumentEditorToReady(actor)
    const originalBaseline = actor.getSnapshot().context.initialSnapshot

    actor.send({ type: 'export.typescriptRequested' })
    await waitFor(actor, (snapshot) => snapshot.matches({ export: 'ready' }))
    expect(actor.getSnapshot().context.exportSource).toContain('Specimen')

    actor.send({ type: 'document.submitRequested' })
    await waitFor(actor, (snapshot) =>
      snapshot.matches({ persistence: 'saved' }),
    )
    expect(input.persistDocument).toHaveBeenCalledOnce()
    expect(actor.getSnapshot().context.initialSnapshot).not.toBe(
      originalBaseline,
    )
    expect(actor.getSnapshot().context.initialDraft).toBe(
      actor.getSnapshot().context.draft,
    )
    actor.stop()
  })

  it('finishes an in-flight save and keeps later edits dirty', async () => {
    vi.useFakeTimers()
    let finishPersistence: (result: { type: 'updated' }) => void = () =>
      undefined
    const persistDocument = vi.fn(
      () =>
        new Promise<{ type: 'updated' }>((resolve) => {
          finishPersistence = resolve
        }),
    )
    const { actor } = createDocumentEditorActor({ persistDocument })
    await advanceDocumentEditorToReady(actor)

    actor.send({ type: 'document.submitRequested' })
    actor.send({
      type: 'variant.jsonChanged',
      variantId: 'variant-1',
      json: '{"status":"edited while saving"}',
    })

    expect(actor.getSnapshot().matches({ persistence: 'saving' })).toBe(true)
    finishPersistence({ type: 'updated' })
    await waitFor(actor, (snapshot) =>
      snapshot.matches({ persistence: 'saved' }),
    )
    expect(actor.getSnapshot().context.initialSnapshot).not.toBe(
      getDocumentDraftSnapshot(actor.getSnapshot().context.draft),
    )
    actor.stop()
  })

  it('settles a cancelled TypeScript export as a failure', async () => {
    vi.useFakeTimers()
    let exportSignal: AbortSignal | undefined
    const generateTypeScript = vi.fn(
      (_schema: JsonSchema, options: { signal: AbortSignal }) => {
        exportSignal = options.signal
        return new Promise<string>(() => undefined)
      },
    )
    const { actor } = createDocumentEditorActor({ generateTypeScript })
    await advanceDocumentEditorToReady(actor)

    actor.send({ type: 'export.typescriptRequested' })
    actor.send({
      type: 'variant.jsonChanged',
      variantId: 'variant-1',
      json: '{"status":"changed"}',
    })

    expect(actor.getSnapshot().matches({ export: 'failed' })).toBe(true)
    expect(actor.getSnapshot().context.exportError).toContain('cancelled')
    expect(exportSignal?.aborted).toBe(true)
    actor.stop()
  })

  it('keeps persistence failures retryable', async () => {
    vi.useFakeTimers()
    const persistDocument = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ type: 'updated' })
    const { actor } = createDocumentEditorActor({ persistDocument })
    await advanceDocumentEditorToReady(actor)

    actor.send({ type: 'document.submitRequested' })
    await waitFor(actor, (snapshot) =>
      snapshot.matches({ persistence: 'failed' }),
    )
    expect(actor.getSnapshot().context.persistenceError).toBe('Offline')

    actor.send({ type: 'document.submitRequested' })
    await waitFor(actor, (snapshot) =>
      snapshot.matches({ persistence: 'saved' }),
    )
    expect(persistDocument).toHaveBeenCalledTimes(2)
    actor.stop()
  })

  it('keeps export failures retryable', async () => {
    vi.useFakeTimers()
    const generateTypeScript = vi
      .fn()
      .mockRejectedValueOnce(new Error('Generation failed'))
      .mockResolvedValueOnce('type Specimen = unknown')
    const { actor } = createDocumentEditorActor({ generateTypeScript })
    await advanceDocumentEditorToReady(actor)

    actor.send({ type: 'export.typescriptRequested' })
    await waitFor(actor, (snapshot) => snapshot.matches({ export: 'failed' }))
    expect(actor.getSnapshot().context.exportError).toBe('Generation failed')

    actor.send({ type: 'export.typescriptRequested' })
    await waitFor(actor, (snapshot) => snapshot.matches({ export: 'ready' }))
    expect(generateTypeScript).toHaveBeenCalledTimes(2)
    actor.stop()
  })

  it.each(DRAFT_MUTATION_EVENTS)(
    'invalidates persistence from %s after a successful save',
    async (eventType) => {
      vi.useFakeTimers()
      const { actor } = createDocumentEditorActor({
        initialDraft: createDocumentDraft([
          buildMachineVariant(),
          buildMachineVariant('{"status":"ok"}', {
            id: 'variant-2',
            name: 'Example 2',
            createdAt: 2,
          }),
        ]),
      })
      await advanceDocumentEditorToReady(actor)

      actor.send({ type: 'document.submitRequested' })
      await waitFor(actor, (snapshot) =>
        snapshot.matches({ persistence: 'saved' }),
      )

      actor.send(draftChangeEvent(eventType))

      expect(actor.getSnapshot().matches({ persistence: 'idle' })).toBe(true)
      expect(actor.getSnapshot().context.persistenceResult).toBeUndefined()
      actor.stop()
    },
  )

  it.each(EXPORT_INVALIDATING_EVENTS)(
    'invalidates a ready export from %s',
    async (eventType) => {
      vi.useFakeTimers()
      const { actor } = createDocumentEditorActor({
        initialDraft: createDocumentDraft([
          buildMachineVariant(),
          buildMachineVariant('{"status":"ok"}', {
            id: 'variant-2',
            name: 'Example 2',
            createdAt: 2,
          }),
        ]),
      })
      await advanceDocumentEditorToReady(actor)

      actor.send({ type: 'export.typescriptRequested' })
      await waitFor(actor, (snapshot) => snapshot.matches({ export: 'ready' }))
      expect(actor.getSnapshot().context.exportSource).toBeDefined()

      actor.send(draftChangeEvent(eventType))

      expect(actor.getSnapshot().matches({ export: 'idle' })).toBe(true)
      expect(actor.getSnapshot().context.exportSource).toBeUndefined()
      actor.stop()
    },
  )
})
