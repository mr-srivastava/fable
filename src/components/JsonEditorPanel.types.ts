// ---------------------------------------------------------------------------
// Types: single superset, then Pick-derived interfaces
// ---------------------------------------------------------------------------

export interface JsonEditorPanelFields {
  value: string
  onChange: (value: string) => void
  error?: string
  onSubmit: () => Promise<void>
  title?: string
  description?: string
  blobUrl?: string | null
  onCopyUrl?: () => void
  copied?: boolean
  onReset?: () => void
}

export type JsonEditorPanelHeaderProps = Pick<
  JsonEditorPanelFields,
  'description' | 'title'
> & {
  mode: 'create' | 'view'
}

export type BlobCreatedAlertProps = Required<Pick<JsonEditorPanelFields, 'blobUrl'>> &
  Pick<JsonEditorPanelFields, 'onCopyUrl' | 'copied'>

export type BlobEditorActionsProps = Required<
  Pick<JsonEditorPanelFields, 'onReset'>
> &
  Pick<
    JsonEditorPanelFields,
    'onSubmit' | 'blobUrl' | 'onCopyUrl' | 'copied'
  > & {
    disabled: boolean
    /** When true, show CopySnippet (view mode); when false and blobUrl set, show BlobCreatedAlert (create mode) */
    showCopySnippet: boolean
  }

export type JsonEditorGridProps = Pick<
  JsonEditorPanelFields,
  'value' | 'onChange' | 'error'
>

type BaseProps = Pick<
  JsonEditorPanelFields,
  'value' | 'onChange' | 'error' | 'onSubmit'
>

export type JsonEditorPanelProps =
  | (BaseProps & {
      mode: 'create'
      title?: string
      description?: string
      blobUrl?: string | null
      onCopyUrl?: () => void
      copied?: boolean
      onReset: () => void
    })
  | (BaseProps & {
      mode: 'view'
      title?: string
      description?: string
      blobUrl: string
      onReset: () => void
    })
