import { afterEach, describe, expect, it, vi } from 'vitest'
import { createActor, waitFor } from 'xstate'
import { documentEditorMachine } from './document-editor-machine'
import type { JsonDocumentExample, JsonSchema } from '@shared/document'
import type { DocumentEditorMachineInput } from './document-editor-machine'
import { createDocumentDraft } from '@/lib/document-draft'

const schema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    status: { type: 'string' },
  },
  required: ['status'],
}

function example(data = '{"status":"ok"}'): JsonDocumentExample {
  return {
    id: 'example-1',
    name: 'Example 1',
    data,
    createdAt: 1,
  }
}

function createEditor(overrides: Partial<DocumentEditorMachineInput> = {}) {
  const input: DocumentEditorMachineInput = {
    initialDraft: createDocumentDraft([example()]),
    inferContract: vi.fn().mockResolvedValue(schema),
    generateTypeScript: vi
      .fn()
      .mockResolvedValue('export interface Specimen {}'),
    persistDocument: vi.fn().mockResolvedValue({ type: 'updated' }),
    ...overrides,
  }
  const actor = createActor(documentEditorMachine, { input })
  actor.start()
  return { actor, input }
}

async function advanceToReady(actor: ReturnType<typeof createEditor>['actor']) {
  await vi.advanceTimersByTimeAsync(250)
  return waitFor(actor, (snapshot) => snapshot.matches({ analysis: 'ready' }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('documentEditorMachine', () => {
  it('debounces valid examples and reaches a ready contract', async () => {
    vi.useFakeTimers()
    const { actor, input } = createEditor()

    expect(actor.getSnapshot().matches({ analysis: 'debouncing' })).toBe(true)
    await advanceToReady(actor)

    expect(input.inferContract).toHaveBeenCalledOnce()
    expect(actor.getSnapshot().context.draft.jsonSchema).toEqual(schema)
    actor.stop()
  })

  it('retains the last schema while invalid JSON blocks inference', async () => {
    vi.useFakeTimers()
    const { actor, input } = createEditor()
    await advanceToReady(actor)
    const lastSchema = actor.getSnapshot().context.draft.jsonSchema

    actor.send({
      type: 'example.jsonChanged',
      exampleId: 'example-1',
      json: '{',
    })

    expect(actor.getSnapshot().matches({ analysis: 'invalidJson' })).toBe(true)
    expect(actor.getSnapshot().context.draft.jsonSchema).toBe(lastSchema)
    expect(input.inferContract).toHaveBeenCalledOnce()
    actor.stop()
  })

  it('blocks persistence while re-inference is pending', async () => {
    vi.useFakeTimers()
    const { actor, input } = createEditor()
    await advanceToReady(actor)

    actor.send({
      type: 'example.jsonChanged',
      exampleId: 'example-1',
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
    const { actor } = createEditor({ inferContract })
    await vi.advanceTimersByTimeAsync(250)
    expect(actor.getSnapshot().matches({ analysis: 'inferring' })).toBe(true)

    actor.send({
      type: 'example.jsonChanged',
      exampleId: 'example-1',
      json: '{"status":"new"}',
    })

    expect(firstSignal?.aborted).toBe(true)
    expect(actor.getSnapshot().matches({ analysis: 'debouncing' })).toBe(true)
    actor.stop()
  })

  it('exposes inference failures without discarding the draft', async () => {
    vi.useFakeTimers()
    const { actor } = createEditor({
      inferContract: vi.fn().mockRejectedValue(new Error('Quicktype failed')),
    })

    await vi.advanceTimersByTimeAsync(250)
    await waitFor(actor, (snapshot) => snapshot.matches({ analysis: 'failed' }))

    expect(actor.getSnapshot().context.analysisError).toBe('Quicktype failed')
    expect(actor.getSnapshot().context.draft.examples).toHaveLength(1)
    actor.stop()
  })

  it('applies pointer-based overrides and exposes violations', async () => {
    vi.useFakeTimers()
    const { actor } = createEditor()
    await advanceToReady(actor)
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
    const { actor, input } = createEditor()
    await advanceToReady(actor)
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

  it('keeps persistence failures retryable', async () => {
    vi.useFakeTimers()
    const persistDocument = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ type: 'updated' })
    const { actor } = createEditor({ persistDocument })
    await advanceToReady(actor)

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
    const { actor } = createEditor({ generateTypeScript })
    await advanceToReady(actor)

    actor.send({ type: 'export.typescriptRequested' })
    await waitFor(actor, (snapshot) => snapshot.matches({ export: 'failed' }))
    expect(actor.getSnapshot().context.exportError).toBe('Generation failed')

    actor.send({ type: 'export.typescriptRequested' })
    await waitFor(actor, (snapshot) => snapshot.matches({ export: 'ready' }))
    expect(generateTypeScript).toHaveBeenCalledTimes(2)
    actor.stop()
  })
})
