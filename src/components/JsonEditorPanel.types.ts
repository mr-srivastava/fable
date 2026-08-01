import type { JsonContract, JsonDocumentExample } from '@shared/document'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractInferenceStatus } from '@/lib/document-draft'

export type ExamplesEditorProps = {
  items: Array<JsonDocumentExample>
  activeId: string
  select: (id: string) => void
  rename: (id: string, name: string) => void
  add: () => void
  remove: (id: string) => void
}

export type ContractEditorProps = {
  value?: JsonContract
  change: (contract: JsonContract) => void
  disabled: boolean
  diagnostics?: ContractDiagnostics
  schemaDiagnostics: Array<SchemaValidationDiagnostic>
  inferenceStatus: ContractInferenceStatus
  inferenceError?: string
}

export type EditorActionsProps = {
  submit: () => Promise<void>
  reset: () => void
}

type BaseProps = {
  value: string
  onChange: (value: string) => void
  examples: ExamplesEditorProps
  contract: ContractEditorProps
  actions: EditorActionsProps
  validation: {
    payloadStatus: 'waiting' | 'valid' | 'invalid'
    canSubmit: boolean
  }
  error?: string
  title?: string
  description?: string
  hasUnsavedChanges?: boolean
  exports: {
    jsonSchema?: string
    generateTypeScript: () => Promise<string>
    disabled: boolean
  }
}

export type JsonEditorPanelHeaderProps = Pick<
  BaseProps,
  'description' | 'title'
> & {
  mode: 'create' | 'view'
}

export type DocumentEditorActionsProps = {
  onSubmit: () => Promise<void>
  onReset: () => void
  disabled: boolean
  exports: BaseProps['exports']
} & (
  | { mode: 'create' }
  | {
      mode: 'view'
      documentUrl: string
      apiUrl: string
      json: string
      hasUnsavedChanges?: boolean
    }
)

export type JsonEditorGridProps = Pick<
  BaseProps,
  'value' | 'onChange' | 'error'
>

export type JsonEditorPanelProps =
  | (BaseProps & { mode: 'create' })
  | (BaseProps & {
      mode: 'view'
      documentUrl: string
      apiUrl: string
    })
