import { useMemo } from 'react'
import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import { ContractPanel } from '@/components/contract/ContractPanel'
import { ExamplesTabs } from '@/components/examples/ExamplesTabs'
import { DocumentEditorActions } from '@/components/DocumentEditorActions'
import { JsonEditor } from '@/components/JsonEditor'
import { Badge } from '@/components/ui/badge'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { validateJSON } from '@/lib/validators'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

const CREATE_HERO_TITLE = 'Inspect a payload'

const CREATE_DEFAULTS = {
  description:
    'Paste JSON to infer field metadata, annotate the contract, and share the specimen.',
} as const

type PayloadStatus = 'waiting' | 'valid' | 'invalid'

function JsonEditorPanelHeader({
  mode,
  title,
  description,
}: JsonEditorPanelHeaderProps) {
  if (mode === 'create') {
    return (
      <header className="animate-fade-in-up space-y-2">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">
          Specimen workbench
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {CREATE_HERO_TITLE}
        </h1>
        {description && (
          <p className="max-w-xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </header>
    )
  }

  return (
    <header className="animate-fade-in-up space-y-1">
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

function getStatusBadge(status: PayloadStatus) {
  if (status === 'valid') return 'Valid JSON'
  if (status === 'invalid') return 'Invalid JSON'
  return 'Waiting'
}

function PayloadStatusBadge({ status }: { status: PayloadStatus }) {
  return (
    <Badge variant={status === 'valid' ? 'default' : 'secondary'}>
      {getStatusBadge(status)}
    </Badge>
  )
}

function PayloadPanel({
  value,
  onChange,
  error,
  status,
  examples,
  activeExampleId,
  onSelectExample,
  onRenameExample,
  onAddExample,
  onDeleteExample,
}: JsonEditorGridProps & {
  status: PayloadStatus
  examples?: JsonEditorPanelProps['examples']
  activeExampleId?: string
  onSelectExample?: (id: string) => void
  onRenameExample?: (id: string, name: string) => void
  onAddExample?: () => void
  onDeleteExample?: (id: string) => void
}) {
  const showExamples =
    examples &&
    activeExampleId &&
    onSelectExample &&
    onRenameExample &&
    onAddExample &&
    onDeleteExample

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Payload
          </h2>
          <p className="text-sm text-muted-foreground">
            Source JSON for this specimen.
          </p>
        </div>
        <PayloadStatusBadge status={status} />
      </div>
      {showExamples && (
        <ExamplesTabs
          examples={examples}
          activeExampleId={activeExampleId}
          onSelect={onSelectExample}
          onRename={onRenameExample}
          onAdd={onAddExample}
          onDelete={onDeleteExample}
        />
      )}
      <Tabs defaultValue="editor" className="gap-3">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="formatted">Formatted</TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <JsonEditor
            mode="edit"
            value={value}
            onChange={onChange}
            error={error}
          />
        </TabsContent>
        <TabsContent value="formatted">
          <JsonEditor
            mode="view"
            value={value}
            height="clamp(20rem, 48vh, 30rem)"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FormattedPanel({ value }: Pick<JsonEditorGridProps, 'value'>) {
  return (
    <div className="animate-fade-in-up-delay-2 space-y-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Formatted
        </h2>
        <p className="text-sm text-muted-foreground">
          Read-only normalized view of the payload.
        </p>
      </div>
      <JsonEditor
        mode="view"
        value={value}
        height="clamp(20rem, 48vh, 30rem)"
      />
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
    contract,
    onContractChange,
    contractDisabled,
    examples,
    activeExampleId,
    onSelectExample,
    onRenameExample,
    onAddExample,
    onDeleteExample,
  } = props

  const isCreate = mode === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  const submitDisabled = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return true
    if (examples?.some((example) => !validateJSON(example.data).valid)) {
      return true
    }
    return !validateJSON(value).valid
  }, [examples, value])

  const payloadStatus: PayloadStatus = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return 'waiting'
    return validateJSON(value).valid ? 'valid' : 'invalid'
  }, [value])

  return (
    <>
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 md:pb-24">
        <JsonEditorPanelHeader
          mode={mode}
          title={title}
          description={description}
        />

        <Tabs
          defaultValue="payload"
          className="gap-4 md:hidden"
          aria-label="Workspace panels"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="formatted">Formatted</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>
          <TabsContent value="payload">
            <PayloadPanel
              value={value}
              onChange={onChange}
              error={error}
              status={payloadStatus}
              examples={examples}
              activeExampleId={activeExampleId}
              onSelectExample={onSelectExample}
              onRenameExample={onRenameExample}
              onAddExample={onAddExample}
              onDeleteExample={onDeleteExample}
            />
          </TabsContent>
          <TabsContent value="formatted">
            <FormattedPanel value={value} />
          </TabsContent>
          <TabsContent value="contract">
            <ContractPanel
              contract={contract}
              disabled={contractDisabled}
              onChange={onContractChange}
            />
          </TabsContent>
        </Tabs>

        <ResizablePanelGroup
          orientation="horizontal"
          className="hidden min-h-[36rem] gap-4 md:flex"
        >
          <ResizablePanel defaultSize={56} minSize={42}>
            <PayloadPanel
              value={value}
              onChange={onChange}
              error={error}
              status={payloadStatus}
              examples={examples}
              activeExampleId={activeExampleId}
              onSelectExample={onSelectExample}
              onRenameExample={onRenameExample}
              onAddExample={onAddExample}
              onDeleteExample={onDeleteExample}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={44} minSize={32}>
            <ContractPanel
              contract={contract}
              disabled={contractDisabled}
              onChange={onContractChange}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
      <DocumentEditorActions
        onSubmit={onSubmit}
        onReset={onReset}
        disabled={submitDisabled}
        {...(mode === 'view'
          ? { mode: 'view', documentUrl: props.documentUrl }
          : { mode: 'create' })}
      />
    </>
  )
}
