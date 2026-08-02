import { and, assign, fromPromise, setup, stateIn } from 'xstate'
import type { JsonSchema } from '@shared/document'
import type {
  ContractOverrideChange,
  DocumentDraft,
  DocumentWriteInput,
} from '@/lib/document-draft'
import {
  addDraftVariant,
  applyDraftInference,
  documentVariantsAreValid,
  getDocumentDraftSnapshot,
  prepareDocumentWrite,
  removeDraftVariant,
  renameDraftVariant,
  selectDraftVariant,
  updateDraftContractOverride,
  updateDraftVariant,
} from '@/lib/document-draft'
import { draftHasUsableEffectiveSchema } from '@/lib/document-editor-capabilities'
import { createDocumentVariant } from '@/lib/document-variants'

export type DocumentPersistenceResult =
  { type: 'created'; documentId: string } | { type: 'updated' }

export type DocumentEditorDependencies = {
  inferContract: (
    samples: Array<string>,
    options: { signal: AbortSignal },
  ) => Promise<JsonSchema>
  generateTypeScript: (
    jsonSchema: JsonSchema,
    options: { signal: AbortSignal },
  ) => Promise<string>
  persistDocument: (
    input: DocumentWriteInput,
  ) => Promise<DocumentPersistenceResult>
}

export type DocumentEditorMachineInput = DocumentEditorDependencies & {
  initialDraft: DocumentDraft
}

export type DocumentEditorEvent =
  | { type: 'variant.jsonChanged'; variantId: string; json: string }
  | { type: 'variant.selected'; variantId: string }
  | { type: 'variant.renamed'; variantId: string; name: string }
  | { type: 'variant.added' }
  | { type: 'variant.removed'; variantId: string }
  | { type: 'contract.overrideChanged'; change: ContractOverrideChange }
  | { type: 'document.reset' }
  | { type: 'document.submitRequested' }
  | { type: 'export.typescriptRequested' }

export type DocumentEditorContext = {
  draft: DocumentDraft
  initialDraft: DocumentDraft
  initialSnapshot: string
  dependencies: DocumentEditorDependencies
  analysisError?: string
  persistenceResult?: DocumentPersistenceResult
  persistenceError?: string
  exportSource?: string
  exportError?: string
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

/**
 * Draft-change event effects by region:
 * | event                    | analysis             | persistence      | export ready/failed | export generating |
 * |--------------------------|----------------------|------------------|---------------------|-------------------|
 * | variant.jsonChanged      | update → checking    | clear → idle*    | clear → idle        | cancel → failed   |
 * | variant.renamed          | rename               | clear → idle*    | —                   | —                 |
 * | variant.added            | add → checking       | clear → idle*    | clear → idle        | cancel → failed   |
 * | variant.removed          | remove → checking    | clear → idle*    | clear → idle        | cancel → failed   |
 * | contract.overrideChanged | override → contract  | clear → idle*    | clear → idle        | cancel → failed   |
 * | document.reset           | reset → checking     | clear → idle*    | clear → idle        | cancel → failed   |
 *
 * * Persistence top-level clears without leaving `saving`; saved/failed also target idle.
 */
export const DRAFT_MUTATION_EVENTS = [
  'variant.jsonChanged',
  'variant.renamed',
  'variant.added',
  'variant.removed',
  'contract.overrideChanged',
  'document.reset',
] as const

export const EXPORT_INVALIDATING_EVENTS = [
  'variant.jsonChanged',
  'variant.added',
  'variant.removed',
  'contract.overrideChanged',
  'document.reset',
] as const

function mapEvents<TEvent extends string, THandler>(
  events: ReadonlyArray<TEvent>,
  handler: THandler,
): Record<TEvent, THandler> {
  return Object.fromEntries(events.map((event) => [event, handler])) as Record<
    TEvent,
    THandler
  >
}

const inferenceEvents = {
  'variant.jsonChanged': {
    actions: 'updateVariant',
    target: '.checking',
  },
  'variant.added': {
    actions: 'addVariant',
    target: '.checking',
  },
  'variant.removed': {
    actions: 'removeVariant',
    target: '.checking',
  },
} as const

const persistenceClearEvents = mapEvents(DRAFT_MUTATION_EVENTS, {
  actions: 'clearPersistence',
} as const)

const persistenceInvalidationEvents = mapEvents(DRAFT_MUTATION_EVENTS, {
  target: 'idle',
  actions: 'clearPersistence',
} as const)

const exportInvalidationEvents = mapEvents(EXPORT_INVALIDATING_EVENTS, {
  target: 'idle',
  actions: 'clearExport',
} as const)

const exportCancellationEvents = mapEvents(EXPORT_INVALIDATING_EVENTS, {
  target: 'failed',
  actions: 'cancelExport',
} as const)

export const documentEditorMachine = setup({
  types: {
    context: {} as DocumentEditorContext,
    events: {} as DocumentEditorEvent,
    input: {} as DocumentEditorMachineInput,
  },
  actors: {
    inferContract: fromPromise(
      ({
        input,
        signal,
      }: {
        input: {
          samples: Array<string>
          infer: DocumentEditorDependencies['inferContract']
        }
        signal: AbortSignal
      }) => input.infer(input.samples, { signal }),
    ),
    generateTypeScript: fromPromise(
      ({
        input,
        signal,
      }: {
        input: {
          jsonSchema: JsonSchema
          generate: DocumentEditorDependencies['generateTypeScript']
        }
        signal: AbortSignal
      }) => input.generate(input.jsonSchema, { signal }),
    ),
    persistDocument: fromPromise(
      ({
        input,
      }: {
        input: {
          draft: DocumentDraft
          persist: DocumentEditorDependencies['persistDocument']
        }
      }) => {
        const snapshot = getDocumentDraftSnapshot(input.draft)
        return input
          .persist(prepareDocumentWrite(input.draft))
          .then((result) => ({
            draft: input.draft,
            result,
            snapshot,
          }))
      },
    ),
  },
  guards: {
    variantsAreInvalid: ({ context }) =>
      !documentVariantsAreValid(context.draft.variants),
    inferenceFailed: ({ context }) => Boolean(context.analysisError),
    hasSchemaViolations: ({ context }) =>
      context.draft.schemaDiagnostics.length > 0,
    canSubmit: and([
      stateIn({ analysis: 'ready' }),
      ({ context }) => draftHasUsableEffectiveSchema(context.draft),
    ]),
    canExport: and([
      stateIn({ analysis: 'ready' }),
      ({ context }) => draftHasUsableEffectiveSchema(context.draft),
    ]),
  },
  actions: {
    updateVariant: assign(({ context, event }) => {
      if (event.type !== 'variant.jsonChanged') return {}
      return {
        draft: updateDraftVariant(context.draft, event.variantId, event.json),
        analysisError: undefined,
      }
    }),
    selectVariant: assign(({ context, event }) => {
      if (event.type !== 'variant.selected') return {}
      return {
        draft: selectDraftVariant(context.draft, event.variantId),
      }
    }),
    renameVariant: assign(({ context, event }) => {
      if (event.type !== 'variant.renamed') return {}
      return {
        draft: renameDraftVariant(context.draft, event.variantId, event.name),
      }
    }),
    addVariant: assign(({ context }) => ({
      draft: addDraftVariant(
        context.draft,
        createDocumentVariant(context.draft.variants.length + 1),
      ),
      analysisError: undefined,
    })),
    removeVariant: assign(({ context, event }) => {
      if (event.type !== 'variant.removed') return {}
      return {
        draft: removeDraftVariant(context.draft, event.variantId),
        analysisError: undefined,
      }
    }),
    updateOverride: assign(({ context, event }) => {
      if (event.type !== 'contract.overrideChanged') return {}
      try {
        return {
          draft: updateDraftContractOverride(context.draft, event.change),
          analysisError: undefined,
        }
      } catch (error) {
        return { analysisError: errorMessage(error, 'Invalid contract') }
      }
    }),
    resetDraft: assign(({ context }) => ({
      draft: context.initialDraft,
      persistenceResult: undefined,
      persistenceError: undefined,
      exportSource: undefined,
      exportError: undefined,
      analysisError: undefined,
    })),
    clearPersistence: assign({
      persistenceResult: undefined,
      persistenceError: undefined,
    }),
    clearExport: assign({
      exportSource: undefined,
      exportError: undefined,
    }),
    cancelExport: assign({
      exportSource: undefined,
      exportError: 'TypeScript export was cancelled because the draft changed',
    }),
  },
}).createMachine({
  id: 'documentEditor',
  type: 'parallel',
  context: ({ input }) => ({
    draft: input.initialDraft,
    initialDraft: input.initialDraft,
    initialSnapshot: getDocumentDraftSnapshot(input.initialDraft),
    dependencies: {
      inferContract: input.inferContract,
      generateTypeScript: input.generateTypeScript,
      persistDocument: input.persistDocument,
    },
  }),
  on: {
    'variant.selected': { actions: 'selectVariant' },
  },
  states: {
    analysis: {
      initial: 'checking',
      on: {
        ...inferenceEvents,
        'variant.renamed': { actions: 'renameVariant' },
        'contract.overrideChanged': {
          actions: 'updateOverride',
          target: '.contractChecking',
        },
        'document.reset': {
          actions: 'resetDraft',
          target: '.checking',
        },
      },
      states: {
        checking: {
          always: [
            { guard: 'variantsAreInvalid', target: 'invalidJson' },
            { target: 'debouncing' },
          ],
        },
        invalidJson: {},
        debouncing: {
          after: { 250: 'inferring' },
        },
        inferring: {
          invoke: {
            src: 'inferContract',
            input: ({ context }) => ({
              samples: context.draft.variants.map((variant) => variant.data),
              infer: context.dependencies.inferContract,
            }),
            onDone: {
              actions: assign(({ context, event }) => {
                try {
                  return {
                    draft: applyDraftInference(context.draft, event.output),
                    analysisError: undefined,
                  }
                } catch (error) {
                  return {
                    analysisError: errorMessage(error, 'Invalid contract'),
                  }
                }
              }),
              target: 'contractChecking',
            },
            onError: {
              actions: assign(({ event }) => ({
                analysisError: errorMessage(
                  event.error,
                  'Contract inference failed',
                ),
              })),
              target: 'failed',
            },
          },
        },
        contractChecking: {
          always: [
            { guard: 'inferenceFailed', target: 'failed' },
            { guard: 'hasSchemaViolations', target: 'violations' },
            { target: 'ready' },
          ],
        },
        ready: {},
        violations: {},
        failed: {},
      },
    },
    persistence: {
      initial: 'idle',
      on: {
        ...persistenceClearEvents,
      },
      states: {
        idle: {
          on: {
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
        saving: {
          invoke: {
            src: 'persistDocument',
            input: ({ context }) => ({
              draft: context.draft,
              persist: context.dependencies.persistDocument,
            }),
            onDone: {
              actions: assign(({ event }) => ({
                persistenceResult: event.output.result,
                persistenceError: undefined,
                initialDraft: event.output.draft,
                initialSnapshot: event.output.snapshot,
              })),
              target: 'saved',
            },
            onError: {
              actions: assign(({ event }) => ({
                persistenceResult: undefined,
                persistenceError: errorMessage(
                  event.error,
                  'Failed to save document',
                ),
              })),
              target: 'failed',
            },
          },
        },
        saved: {
          on: {
            ...persistenceInvalidationEvents,
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
        failed: {
          on: {
            ...persistenceInvalidationEvents,
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
      },
    },
    export: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'export.typescriptRequested': {
              guard: 'canExport',
              target: 'generating',
            },
          },
        },
        generating: {
          on: {
            ...exportCancellationEvents,
          },
          invoke: {
            src: 'generateTypeScript',
            input: ({ context }) => ({
              jsonSchema: context.draft.jsonSchema!,
              generate: context.dependencies.generateTypeScript,
            }),
            onDone: {
              actions: assign(({ event }) => ({
                exportSource: event.output,
                exportError: undefined,
              })),
              target: 'ready',
            },
            onError: {
              actions: assign(({ event }) => ({
                exportSource: undefined,
                exportError: errorMessage(event.error, 'Export failed'),
              })),
              target: 'failed',
            },
          },
        },
        ready: {
          on: {
            ...exportInvalidationEvents,
            'export.typescriptRequested': 'generating',
          },
        },
        failed: {
          on: {
            ...exportInvalidationEvents,
            'export.typescriptRequested': {
              guard: 'canExport',
              target: 'generating',
            },
          },
        },
      },
    },
  },
})
