import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type {
  JsonEditorGridProps,
  JsonEditorPanelHeaderProps,
  JsonEditorPanelProps,
} from './JsonEditorPanel.types'
import { ContractPanel } from '@/components/contract/ContractPanel'
import { ExamplesTabs } from '@/components/examples/ExamplesTabs'
import { DocumentEditorActions } from '@/components/DocumentEditorActions'
import { JsonEditor } from '@/components/json-editor/JsonEditor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/hooks/use-media-query'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

const CREATE_HERO_TITLE = 'Inspect a payload'

const CREATE_DEFAULTS = {
  description:
    'Paste JSON to infer field metadata, annotate the contract, and share the specimen.',
} as const

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
}: {
  contract: JsonEditorPanelProps['model']['contract']
}) {
  if (contract.status.type === 'inferring') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Updating contract…
      </p>
    )
  }
  if (contract.status.type === 'invalidJson') return null
  if (contract.status.type === 'invalidContract') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Invalid contract</AlertTitle>
        <AlertDescription>{contract.status.message}</AlertDescription>
      </Alert>
    )
  }
  if (contract.status.type !== 'violations') return null
  return (
    <p role="status" className="text-sm text-destructive">
      {contract.status.count} contract issue
      {contract.status.count === 1 ? '' : 's'} across the examples. Review the
      marked values and fields.
    </p>
  )
}

function PayloadPanel({
  value,
  onChange,
  validation,
  size,
  assistance,
  pathCoordination,
  examples,
  activeExampleId,
  onSelectExample,
  onRenameExample,
  onAddExample,
  onDeleteExample,
  validationCounts,
  canAddExample,
}: JsonEditorGridProps & {
  examples: JsonEditorPanelProps['model']['examples']['items']
  activeExampleId: string
  onSelectExample: (id: string) => void
  onRenameExample: (id: string, name: string) => void
  onAddExample: () => void
  onDeleteExample: (id: string) => void
  validationCounts: Record<string, number>
  canAddExample: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Payload
        </h2>
        <p className="text-sm text-muted-foreground">
          Source JSON for this specimen.
        </p>
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
          <JsonEditor
            value={value}
            onChange={onChange}
            validation={validation}
            size={size}
            assistance={assistance}
            pathCoordination={pathCoordination}
          />
        </div>
      </ExamplesTabs>
    </div>
  )
}

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const { model, commands, description: descriptionProp, title, mode } = props
  const { contract, examples, payload } = model
  const [activePointer, setActivePointer] = useState<string>()
  const [activePointerPresent, setActivePointerPresent] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const assistance = useMemo<JsonEditorGridProps['assistance']>(() => {
    if (!contract.value) return { status: 'unavailable' }
    const current = contract.valueFreshness === 'current'
    return current
      ? {
          status: 'available',
          freshness: 'current',
          fields: contract.value.fields,
          diagnostics: contract.schemaDiagnostics.filter(
            (diagnostic) => diagnostic.exampleId === examples.activeId,
          ),
        }
      : {
          status: 'available',
          freshness: 'retained',
          fields: contract.value.fields,
        }
  }, [contract, examples.activeId])
  const pathCoordination = useMemo<JsonEditorGridProps['pathCoordination']>(
    () => ({
      activePointer,
      onActivePointerChange: setActivePointer,
      onActivePointerPresenceChange: setActivePointerPresent,
    }),
    [activePointer],
  )
  const validation: JsonEditorGridProps['validation'] =
    payload.status !== 'invalid'
      ? { status: 'valid' }
      : payload.reason === 'syntax'
        ? { status: 'syntaxError' }
        : { status: 'externalError', message: payload.message }

  const isCreate = mode.type === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  const payloadPanel = (
    <PayloadPanel
      value={payload.value}
      onChange={(json) => commands.updateExample(examples.activeId, json)}
      validation={validation}
      size={payload.size}
      assistance={assistance}
      pathCoordination={pathCoordination}
      examples={examples.items}
      activeExampleId={examples.activeId}
      onSelectExample={commands.selectExample}
      onRenameExample={commands.renameExample}
      onAddExample={commands.addExample}
      onDeleteExample={commands.removeExample}
      validationCounts={examples.validationCounts}
      canAddExample={examples.canAdd}
    />
  )

  const contractPanel = (
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
        activePointer={activePointer}
        activePointerPresent={activePointerPresent}
        onSelectPointer={setActivePointer}
      />
    </div>
  )

  return (
    <>
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-32 sm:px-6">
        <JsonEditorPanelHeader
          mode={mode.type}
          title={title}
          description={description}
        />
        <SchemaStatusNotice contract={contract} />

        {isDesktop ? (
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-[36rem] gap-4"
          >
            <ResizablePanel defaultSize={56} minSize={42}>
              {payloadPanel}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={44} minSize={32}>
              {contractPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Tabs
            defaultValue="payload"
            className="gap-4"
            aria-label="Workspace panels"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payload">Examples</TabsTrigger>
              <TabsTrigger value="contract">Contract</TabsTrigger>
            </TabsList>
            <TabsContent value="payload">{payloadPanel}</TabsContent>
            <TabsContent value="contract">{contractPanel}</TabsContent>
          </Tabs>
        )}
      </section>
      <DocumentEditorActions mode={mode} model={model} commands={commands} />
    </>
  )
}
