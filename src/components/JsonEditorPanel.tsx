import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import { JsonEditor } from '@/components/JsonEditor'
import { BlobEditorActions } from '@/components/BlobEditorActions'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

function JsonEditorPanelHeader({
  description,
}: JsonEditorPanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

function JsonEditorGrid({ value, onChange, error }: JsonEditorGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Input</h3>
        <JsonEditor
          mode="edit"
          value={value}
          onChange={onChange}
          error={error}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Formatted Preview
        </h3>
        <JsonEditor mode="view" value={value} />
      </div>
    </div>
  )
}

const CREATE_DEFAULTS = {
  description:
    'Paste or type valid JSON below. Max size 100KB. No auth required.',
} as const

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const {
    value,
    onChange,
    error,
    onSubmit,
    description: descriptionProp,
  } = props

  const isCreate = props.mode === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  const submitDisabled = !value.trim()

  return (
    <>
      <section className="space-y-2 pb-20">
        <JsonEditorPanelHeader description={description} />
        <JsonEditorGrid value={value} onChange={onChange} error={error} />
      </section>
      <BlobEditorActions
        onSubmit={onSubmit}
        onReset={props.onReset}
        disabled={submitDisabled}
        blobUrl={props.mode === 'create' ? props.blobUrl : props.blobUrl}
        onCopyUrl={props.mode === 'create' ? props.onCopyUrl : undefined}
        copied={props.mode === 'create' ? props.copied : undefined}
        showCopySnippet={!isCreate}
      />
    </>
  )
}
