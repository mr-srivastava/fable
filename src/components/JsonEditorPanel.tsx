import { useMemo, useState } from 'react'
import { AlertTriangle, Braces, Check } from 'lucide-react'
import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import type { PayloadViewState } from '@/lib/document-editor-model'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatJson } from '@/lib/json'
import { cn } from '@/lib/utils'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

const CREATE_HERO_TITLE = 'Inspect a payload'

const CREATE_DEFAULTS = {
  description:
    'Paste JSON to infer field metadata, annotate the contract, and share the specimen.',
} as const

type PayloadStatus = PayloadViewState['status']

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
  contractDiagnostics?: JsonEditorPanelProps['model']['contract']['diagnostics']
  examples: JsonEditorPanelProps['model']['examples']['items']
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
}: {
  contract: JsonEditorPanelProps['model']['contract']
  examples: JsonEditorPanelProps['model']['examples']
}) {
  if (contract.status.type === 'inferring') {
    return (
      <Alert>
        <AlertTitle>Inferring contract</AlertTitle>
        <AlertDescription>
          Specimen is updating the JSON Schema from all valid examples.
        </AlertDescription>
      </Alert>
    )
  }
  if (contract.status.type === 'invalidJson') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid JSON</AlertTitle>
        <AlertDescription>
          Fix the malformed example before contract inference can continue.
        </AlertDescription>
      </Alert>
    )
  }
  if (contract.status.type === 'invalidContract') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid contract</AlertTitle>
        <AlertDescription>{contract.status.message}</AlertDescription>
      </Alert>
    )
  }
  if (contract.status.type !== 'violations') return null

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
  canAddExample,
  activePath,
  contractPaths,
  onActivePathChange,
  onActivePathPresenceChange,
}: JsonEditorGridProps & {
  status: PayloadStatus
  examples: JsonEditorPanelProps['model']['examples']['items']
  activeExampleId: string
  onSelectExample: (id: string) => void
  onRenameExample: (id: string, name: string) => void
  onAddExample: () => void
  onDeleteExample: (id: string) => void
  hasUnsavedChanges?: boolean
  validationCounts: Record<string, number>
  canAddExample: boolean
  activePath?: string
  contractPaths: ReadonlySet<string>
  onActivePathChange: (path?: string) => void
  onActivePathPresenceChange: (present: boolean) => void
}) {
  const formattedValue = status === 'valid' ? formatJson(value) : ''
  const canFormat = formattedValue !== '' && formattedValue !== value
  const handleFormat = () => {
    if (canFormat) onChange(formattedValue)
  }

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          handleFormat()
        }
      }}
    >
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
        canAdd={canAddExample}
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={handleFormat}
                      disabled={!canFormat}
                      aria-label="Format JSON"
                      aria-keyshortcuts="Alt+Shift+F"
                    />
                  }
                >
                  <Braces />
                </TooltipTrigger>
                <TooltipContent>
                  Format JSON <span className="ml-1 opacity-70">⇧⌥F</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <JsonEditor
            value={value}
            onChange={onChange}
            error={error}
            activePath={activePath}
            contractPaths={contractPaths}
            onActivePathChange={onActivePathChange}
            onActivePathPresenceChange={onActivePathPresenceChange}
          />
        </div>
      </ExamplesTabs>
    </div>
  )
}

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const { model, commands, description: descriptionProp, title, mode } = props
  const { contract, examples, payload } = model
  const [activePath, setActivePath] = useState<string>()
  const [activePathPresent, setActivePathPresent] = useState(true)
  const contractPaths = useMemo(
    () => new Set(contract.value?.fields.map((field) => field.path) ?? []),
    [contract.value?.fields],
  )

  const isCreate = mode.type === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  return (
    <>
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-32 sm:px-6">
        <JsonEditorPanelHeader
          mode={mode.type}
          title={title}
          description={description}
        />
        <SchemaStatusNotice contract={contract} examples={examples} />

        <Tabs
          defaultValue="payload"
          className="gap-4 md:hidden"
          aria-label="Workspace panels"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payload">Examples</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>
          <TabsContent value="payload">
            <PayloadPanel
              value={payload.value}
              onChange={(json) =>
                commands.updateExample(examples.activeId, json)
              }
              error={payload.status === 'invalid' ? payload.message : undefined}
              status={payload.status}
              examples={examples.items}
              activeExampleId={examples.activeId}
              onSelectExample={commands.selectExample}
              onRenameExample={commands.renameExample}
              onAddExample={commands.addExample}
              onDeleteExample={commands.removeExample}
              hasUnsavedChanges={model.hasUnsavedChanges}
              validationCounts={examples.validationCounts}
              canAddExample={examples.canAdd}
              activePath={activePath}
              contractPaths={contractPaths}
              onActivePathChange={setActivePath}
              onActivePathPresenceChange={setActivePathPresent}
            />
          </TabsContent>
          <TabsContent value="contract">
            <ContractDiagnosticsNotice
              contractDiagnostics={contract.diagnostics}
              examples={examples.items}
            />
            <ContractPanel
              contract={contract.value}
              disabled={contract.status.type === 'invalidJson'}
              onOverrideChange={commands.changeContractOverride}
              schemaDiagnostics={contract.schemaDiagnostics}
              activePath={activePath}
              activePathPresent={activePathPresent}
              onSelectPath={setActivePath}
            />
          </TabsContent>
        </Tabs>

        <ResizablePanelGroup
          orientation="horizontal"
          className="hidden min-h-[36rem] gap-4 md:flex"
        >
          <ResizablePanel defaultSize={56} minSize={42}>
            <PayloadPanel
              value={payload.value}
              onChange={(json) =>
                commands.updateExample(examples.activeId, json)
              }
              error={payload.status === 'invalid' ? payload.message : undefined}
              status={payload.status}
              examples={examples.items}
              activeExampleId={examples.activeId}
              onSelectExample={commands.selectExample}
              onRenameExample={commands.renameExample}
              onAddExample={commands.addExample}
              onDeleteExample={commands.removeExample}
              hasUnsavedChanges={model.hasUnsavedChanges}
              validationCounts={examples.validationCounts}
              canAddExample={examples.canAdd}
              activePath={activePath}
              contractPaths={contractPaths}
              onActivePathChange={setActivePath}
              onActivePathPresenceChange={setActivePathPresent}
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
                disabled={contract.status.type === 'invalidJson'}
                onOverrideChange={commands.changeContractOverride}
                schemaDiagnostics={contract.schemaDiagnostics}
                activePath={activePath}
                activePathPresent={activePathPresent}
                onSelectPath={setActivePath}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
      <DocumentEditorActions mode={mode} model={model} commands={commands} />
    </>
  )
}
