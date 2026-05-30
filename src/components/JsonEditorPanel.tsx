import { useMemo } from 'react'
import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import { JsonEditor } from '@/components/JsonEditor'
import { BlobEditorActions } from '@/components/BlobEditorActions'
import { validateJSON } from '@/lib/validators'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

const CREATE_HERO_TITLE = 'Paste JSON, get a link'

const CREATE_DEFAULTS = {
  description:
    'Paste or type valid JSON below. Max size 100KB. No auth required.',
} as const

function JsonEditorPanelHeader({
  mode,
  title,
  description,
}: JsonEditorPanelHeaderProps) {
  if (mode === 'create') {
    return (
      <header className="animate-fade-in-up space-y-2 pb-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          {CREATE_HERO_TITLE}
        </h1>
        {description && (
          <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        )}
      </header>
    )
  }

  return (
    <header className="animate-fade-in-up space-y-1 pb-4">
      {title && (
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  )
}

function JsonEditorGrid({ value, onChange, error }: JsonEditorGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="animate-fade-in-up-delay-1 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Input</h3>
        <JsonEditor
          mode="edit"
          value={value}
          onChange={onChange}
          error={error}
        />
      </div>
      <div className="animate-fade-in-up-delay-2 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Formatted Preview
        </h3>
        <JsonEditor mode="view" value={value} />
      </div>
    </div>
  )
}

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const {
    value,
    onChange,
    error,
    onSubmit,
    onReset,
    description: descriptionProp,
    title,
    mode,
  } = props

  const isCreate = mode === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  const submitDisabled = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return !validateJSON(value).valid
  }, [value])

  return (
    <>
      <section className={isCreate ? 'space-y-8 pb-20' : 'space-y-6 pb-20'}>
        <JsonEditorPanelHeader
          mode={mode}
          title={title}
          description={description}
        />
        <JsonEditorGrid value={value} onChange={onChange} error={error} />
      </section>
      <BlobEditorActions
        onSubmit={onSubmit}
        onReset={onReset}
        disabled={submitDisabled}
        {...(mode === 'view'
          ? { mode: 'view', blobUrl: props.blobUrl }
          : { mode: 'create' })}
      />
    </>
  )
}
