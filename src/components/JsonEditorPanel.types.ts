import type { JsonContract } from '@/types/contract'
import type { JsonDocumentExample } from '@/types/document'

export interface JsonEditorPanelFields {
  value: string
  onChange: (value: string) => void
  examples?: Array<JsonDocumentExample>
  activeExampleId?: string
  onSelectExample?: (id: string) => void
  onRenameExample?: (id: string, name: string) => void
  onAddExample?: () => void
  onDeleteExample?: (id: string) => void
  error?: string
  onSubmit: () => Promise<void>
  title?: string
  description?: string
  onReset: () => void
  contract?: JsonContract
  onContractChange: (contract: JsonContract) => void
  contractDisabled?: boolean
}

export type JsonEditorPanelHeaderProps = Pick<
  JsonEditorPanelFields,
  'description' | 'title'
> & {
  mode: 'create' | 'view'
}

export type DocumentEditorActionsProps = Pick<
  JsonEditorPanelFields,
  'onSubmit' | 'onReset'
> & {
  disabled: boolean
} & (
  | { mode: 'create' }
  | { mode: 'view'; documentUrl: string }
)

export type JsonEditorGridProps = Pick<
  JsonEditorPanelFields,
  'value' | 'onChange' | 'error'
>

type BaseProps = Pick<
  JsonEditorPanelFields,
  | 'value'
  | 'onChange'
  | 'examples'
  | 'activeExampleId'
  | 'onSelectExample'
  | 'onRenameExample'
  | 'onAddExample'
  | 'onDeleteExample'
  | 'error'
  | 'onSubmit'
  | 'onReset'
  | 'contract'
  | 'onContractChange'
  | 'contractDisabled'
>

export type JsonEditorPanelProps =
  | (BaseProps & {
      mode: 'create'
      title?: string
      description?: string
    })
  | (BaseProps & {
      mode: 'view'
      title?: string
      description?: string
      documentUrl: string
    })
