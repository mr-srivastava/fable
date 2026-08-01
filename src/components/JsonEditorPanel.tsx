import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import { ContractPanel } from '@/components/contract/ContractPanel'
import { ExamplesTabs } from '@/components/examples/ExamplesTabs'
import { DocumentEditorActions } from '@/components/DocumentEditorActions'
import { JsonEditor } from '@/components/JsonEditor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

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

function PayloadStatusBadge({
  status,
  hasUnsavedChanges,
}: {
  status: PayloadStatus
  hasUnsavedChanges?: boolean
}) {
  if (status === 'valid') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1.5 border-success/40 bg-success/10 text-success',
          hasUnsavedChanges &&
            'border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-300',
        )}
      >
        <span
          className={cn(
            'size-2 rounded-full bg-success',
            hasUnsavedChanges &&
              'animate-pulse bg-amber-400 shadow-[0_0_0_3px_rgb(251_191_36_/_0.18)]',
          )}
          aria-hidden="true"
        />
        {hasUnsavedChanges ? (
          'Unsaved changes'
        ) : (
          <>
            <Check className="size-3.5" />
            Valid JSON
          </>
        )}
      </Badge>
    )
  }

  return (
    <Badge variant={status === 'invalid' ? 'default' : 'secondary'}>
      {getStatusBadge(status)}
    </Badge>
  )
}

function ContractDiagnosticsNotice({
  contractDiagnostics,
  examples,
}: {
  contractDiagnostics?: JsonEditorPanelProps['contract']['diagnostics']
  examples: JsonEditorPanelProps['examples']['items']
}) {
  const [dismissed, setDismissed] = useState(false)
  const [showGroups, setShowGroups] = useState(false)

  if (
    dismissed ||
    !contractDiagnostics ||
    contractDiagnostics.severity !== 'warning'
  ) {
    return null
  }

  const exampleNameById = new Map(
    examples.map((example) => [example.id, example.name]),
  )

  return (
    <Alert className="border-amber-400/40 bg-amber-400/10 text-amber-950 dark:text-amber-100">
      <AlertTriangle />
      <AlertTitle>Likely separate contracts</AlertTitle>
      <AlertDescription>
        <p>
          These examples look like separate response shapes. The contract below
          is a broad union; consider splitting them into separate specimens.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setDismissed(true)}
          >
            Keep as variants
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setShowGroups((current) => !current)}
          >
            Review groups
          </Button>
        </div>
        {showGroups && (
          <div className="mt-3 space-y-2 rounded-md border border-amber-400/30 bg-background/70 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Suggested groups
            </p>
            <ul className="space-y-1 text-sm">
              {contractDiagnostics.divergentGroups.map((group, index) => (
                <li key={group.id}>
                  <span className="font-medium">Group {index + 1}:</span>{' '}
                  {group.exampleIds
                    .map((id) => exampleNameById.get(id) ?? id)
                    .join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

function SchemaStatusNotice({
  contract,
  examples,
}: Pick<JsonEditorPanelProps, 'contract' | 'examples'>) {
  if (contract.inferenceStatus === 'pending') {
    return (
      <Alert>
        <AlertTitle>Inferring contract</AlertTitle>
        <AlertDescription>
          Specimen is updating the JSON Schema from all valid examples.
        </AlertDescription>
      </Alert>
    )
  }
  if (contract.inferenceStatus === 'error') {
    const invalidJson = contract.inferenceError?.includes('valid JSON')
    return (
      <Alert variant="destructive">
        <AlertTitle>
          {invalidJson ? 'Invalid JSON' : 'Invalid contract'}
        </AlertTitle>
        <AlertDescription>
          {contract.inferenceError ?? 'The contract could not be generated.'}
        </AlertDescription>
      </Alert>
    )
  }
  if (contract.schemaDiagnostics.length === 0) return null

  const names = new Map(
    examples.items.map((example) => [example.id, example.name]),
  )
  return (
    <Alert variant="destructive">
      <AlertTitle>Examples violate the contract</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {contract.schemaDiagnostics.slice(0, 5).map((diagnostic, index) => (
            <li
              key={`${diagnostic.exampleId}:${diagnostic.schemaPath}:${index}`}
            >
              {names.get(diagnostic.exampleId) ?? diagnostic.exampleId}:{' '}
              <code>{diagnostic.instancePath || '/'}</code> {diagnostic.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
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
  hasUnsavedChanges,
  validationCounts,
}: JsonEditorGridProps & {
  status: PayloadStatus
  examples: JsonEditorPanelProps['examples']['items']
  activeExampleId: string
  onSelectExample: (id: string) => void
  onRenameExample: (id: string, name: string) => void
  onAddExample: () => void
  onDeleteExample: (id: string) => void
  hasUnsavedChanges?: boolean
  validationCounts: Record<string, number>
}) {
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
        <PayloadStatusBadge
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
      <ExamplesTabs
        examples={examples}
        activeExampleId={activeExampleId}
        onSelect={onSelectExample}
        onRename={onRenameExample}
        onAdd={onAddExample}
        onDelete={onDeleteExample}
        validationCounts={validationCounts}
      />
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
    actions,
    description: descriptionProp,
    title,
    mode,
    examples,
    contract,
    validation,
    hasUnsavedChanges,
  } = props

  const isCreate = mode === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)
  const validationCounts = Object.fromEntries(
    examples.items.map((example) => [
      example.id,
      contract.schemaDiagnostics.filter(
        (diagnostic) => diagnostic.exampleId === example.id,
      ).length,
    ]),
  )

  return (
    <>
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 md:pb-24">
        <JsonEditorPanelHeader
          mode={mode}
          title={title}
          description={description}
        />
        <SchemaStatusNotice contract={contract} examples={examples} />

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
              status={validation.payloadStatus}
              examples={examples.items}
              activeExampleId={examples.activeId}
              onSelectExample={examples.select}
              onRenameExample={examples.rename}
              onAddExample={examples.add}
              onDeleteExample={examples.remove}
              hasUnsavedChanges={hasUnsavedChanges}
              validationCounts={validationCounts}
            />
          </TabsContent>
          <TabsContent value="formatted">
            <FormattedPanel value={value} />
          </TabsContent>
          <TabsContent value="contract">
            <ContractDiagnosticsNotice
              contractDiagnostics={contract.diagnostics}
              examples={examples.items}
            />
            <ContractPanel
              contract={contract.value}
              disabled={contract.disabled}
              onChange={contract.change}
              schemaDiagnostics={contract.schemaDiagnostics}
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
              status={validation.payloadStatus}
              examples={examples.items}
              activeExampleId={examples.activeId}
              onSelectExample={examples.select}
              onRenameExample={examples.rename}
              onAddExample={examples.add}
              onDeleteExample={examples.remove}
              hasUnsavedChanges={hasUnsavedChanges}
              validationCounts={validationCounts}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={44} minSize={32}>
            <div className="flex flex-col gap-3">
              <ContractDiagnosticsNotice
                contractDiagnostics={contract.diagnostics}
                examples={examples.items}
              />
              <ContractPanel
                contract={contract.value}
                disabled={contract.disabled}
                onChange={contract.change}
                schemaDiagnostics={contract.schemaDiagnostics}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
      <DocumentEditorActions
        onSubmit={actions.submit}
        onReset={actions.reset}
        disabled={!validation.canSubmit}
        exports={props.exports}
        {...(mode === 'view'
          ? {
              mode: 'view',
              documentUrl: props.documentUrl,
              apiUrl: props.apiUrl,
              json: value,
              hasUnsavedChanges,
            }
          : { mode: 'create' })}
      />
    </>
  )
}
