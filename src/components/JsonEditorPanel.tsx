import { Link } from '@tanstack/react-router'
import { Check, Copy } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CopySnippet } from '@/components/CopySnippet'
import { JsonEditor } from '@/components/JsonEditor'

// ---------------------------------------------------------------------------
// Types: single superset, then Pick-derived interfaces
// ---------------------------------------------------------------------------

interface JsonEditorPanelFields {
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

type JsonEditorPanelHeaderProps = Pick<
  JsonEditorPanelFields,
  'title' | 'description'
> & { mode?: 'create' | 'view' }

type BlobCreatedAlertProps = Required<Pick<JsonEditorPanelFields, 'blobUrl'>> &
  Pick<JsonEditorPanelFields, 'onCopyUrl' | 'copied'>

type BlobEditorActionsProps = Required<
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

type JsonEditorGridProps = Pick<
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JsonEditorPanelHeader({
  title,
  description,
  mode,
}: JsonEditorPanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 pb-4">
      <div>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {mode === 'view' && (
        <div className="shrink-0">
          <Link to="/">
            <span className="text-sm text-primary hover:underline">
              Create new
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}

function BlobCreatedAlert({
  blobUrl,
  onCopyUrl,
  copied,
}: BlobCreatedAlertProps) {
  return (
    <Alert className="flex-1 min-w-0 py-2">
      <AlertDescription>
        <div className="flex items-center gap-2">
          <span className="font-medium shrink-0">Blob created</span>
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm min-w-0">
            {blobUrl}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={onCopyUrl}
            aria-label="Copy URL"
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

function BlobEditorActions({
  onSubmit,
  onReset,
  disabled,
  blobUrl,
  onCopyUrl,
  copied,
  showCopySnippet,
}: BlobEditorActionsProps) {
  const showBlobCreatedAlert =
    !showCopySnippet && blobUrl != null && blobUrl !== ''
  const showSnippet = showCopySnippet && blobUrl

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSubmit} disabled={disabled}>
            Save
          </Button>
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          {showBlobCreatedAlert && (
            <BlobCreatedAlert
              blobUrl={blobUrl}
              onCopyUrl={onCopyUrl}
              copied={copied}
            />
          )}
        </div>
        {showSnippet && typeof blobUrl === 'string' && (
          <CopySnippet url={blobUrl} />
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CREATE_DEFAULTS = {
  title: 'Create a JSON blob',
  description:
    'Paste or type valid JSON below. Max size 100KB. No auth required.',
} as const

const VIEW_DEFAULTS = {
  title: 'JSON blob',
} as const

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const {
    value,
    onChange,
    error,
    onSubmit,
    title: titleProp,
    description: descriptionProp,
  } = props

  const isCreate = props.mode === 'create'
  const title =
    titleProp ?? (isCreate ? CREATE_DEFAULTS.title : VIEW_DEFAULTS.title)
  const description =
    descriptionProp ??
    (isCreate ? CREATE_DEFAULTS.description : undefined)

  const submitDisabled = !value.trim()

  return (
    <section className="space-y-4">
      <JsonEditorPanelHeader
        title={title}
        description={description}
        mode={props.mode}
      />
      <div className="space-y-4">
        <BlobEditorActions
          onSubmit={onSubmit}
          onReset={props.onReset}
          disabled={submitDisabled}
          blobUrl={props.mode === 'create' ? props.blobUrl : props.blobUrl}
          onCopyUrl={props.mode === 'create' ? props.onCopyUrl : undefined}
          copied={props.mode === 'create' ? props.copied : undefined}
          showCopySnippet={!isCreate}
        />
        <JsonEditorGrid value={value} onChange={onChange} error={error} />
      </div>
    </section>
  )
}
