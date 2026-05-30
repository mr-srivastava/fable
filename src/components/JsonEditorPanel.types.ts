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
  onReset: () => void
}

export type JsonEditorPanelHeaderProps = Pick<
  JsonEditorPanelFields,
  'description' | 'title'
> & {
  mode: 'create' | 'view'
}

export type BlobEditorActionsProps = Pick<
  JsonEditorPanelFields,
  'onSubmit' | 'onReset'
> & {
  disabled: boolean
} & (
  | { mode: 'create' }
  | { mode: 'view'; blobUrl: string }
)

export type JsonEditorGridProps = Pick<
  JsonEditorPanelFields,
  'value' | 'onChange' | 'error'
>

type BaseProps = Pick<
  JsonEditorPanelFields,
  'value' | 'onChange' | 'error' | 'onSubmit' | 'onReset'
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
      blobUrl: string
    })
