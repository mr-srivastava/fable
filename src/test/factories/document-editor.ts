import { vi } from 'vitest'
import type {
  DocumentEditorCommands,
  DocumentEditorViewModel,
} from '@/lib/document-editor-model'
import { buildDocumentExample } from '@/test/factories/document'

type EditorModelOverrides = Partial<
  Omit<DocumentEditorViewModel, 'contract' | 'examples'>
> & {
  contract?: Partial<DocumentEditorViewModel['contract']>
  examples?: Partial<DocumentEditorViewModel['examples']>
}

export function buildDocumentEditorModel(
  overrides: EditorModelOverrides = {},
): DocumentEditorViewModel {
  const { contract, examples, ...modelOverrides } = overrides

  return {
    payload: { status: 'valid', value: '{}', size: 2 },
    examples: {
      items: [buildDocumentExample()],
      activeId: 'one',
      validationCounts: {},
      canAdd: true,
      ...examples,
    },
    contract: {
      status: { type: 'ready' },
      schemaDiagnostics: [],
      ...contract,
    },
    submission: { status: 'available' },
    exports: { status: 'unavailable' },
    hasUnsavedChanges: false,
    ...modelOverrides,
  }
}

export function buildDocumentEditorCommands(
  overrides: Partial<DocumentEditorCommands> = {},
): DocumentEditorCommands {
  return {
    updateExample: vi.fn(),
    selectExample: vi.fn(),
    renameExample: vi.fn(),
    addExample: vi.fn(),
    removeExample: vi.fn(),
    changeContractOverride: vi.fn(),
    reset: vi.fn(),
    submit: vi.fn().mockResolvedValue({ type: 'updated' }),
    generateTypeScript: vi.fn().mockResolvedValue(''),
    ...overrides,
  }
}
