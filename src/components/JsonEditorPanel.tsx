import { useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
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
import { cn } from '@/lib/utils'

export type { JsonEditorPanelProps } from './JsonEditorPanel.types'

const CREATE_HERO_TITLE = 'New specimen'
const WORKSPACE_HEIGHT_CLASS =
  'min-h-[28rem] h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)]'

const CREATE_DEFAULTS = {
  description:
    'Paste JSON, add examples, annotate the contract, then save & share a stable link.',
} as const

const subscribeToHydration = () => () => undefined

function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
}

function JsonEditorPanelHeader({
  mode,
  title,
  description,
}: JsonEditorPanelHeaderProps) {
  const pageTitle = mode === 'create' ? CREATE_HERO_TITLE : title

  return (
    <header className="animate-fade-in-up space-y-2">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">
        Specimen workbench
      </p>
      {pageTitle && (
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {pageTitle}
        </h1>
      )}
      {description && (
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  )
}

function WorkbenchShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('workbench-elevated overflow-hidden rounded-2xl bg-card', className)}
    >
      {children}
    </div>
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
    <Alert className="border-warning/40 bg-warning/15 text-warning-foreground">
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
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
            showGroups
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-3 space-y-2 rounded-md border border-warning/30 bg-background/70 p-3">
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
          </div>
        </div>
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
  fillHeight = false,
}: JsonEditorGridProps & {
  examples: JsonEditorPanelProps['model']['examples']['items']
  activeExampleId: string
  onSelectExample: (id: string) => void
  onRenameExample: (id: string, name: string) => void
  onAddExample: () => void
  onDeleteExample: (id: string) => void
  validationCounts: Record<string, number>
  canAddExample: boolean
  fillHeight?: boolean
}) {
  return (
    <div
      className={
        fillHeight
          ? 'flex h-full min-h-0 flex-col gap-4'
          : 'flex flex-col gap-4'
      }
    >
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        Payload
      </h2>
      <ExamplesTabs
        examples={examples}
        activeExampleId={activeExampleId}
        onSelect={onSelectExample}
        onRename={onRenameExample}
        onAdd={onAddExample}
        onDelete={onDeleteExample}
        validationCounts={validationCounts}
        canAdd={canAddExample}
        fillHeight={fillHeight}
      >
        <div className={fillHeight ? 'h-full min-h-0' : 'space-y-3'}>
          <JsonEditor
            value={value}
            onChange={onChange}
            validation={validation}
            size={size}
            assistance={assistance}
            pathCoordination={pathCoordination}
            height={fillHeight ? '100%' : undefined}
            className={fillHeight ? 'h-full min-h-0' : undefined}
          />
        </div>
      </ExamplesTabs>
    </div>
  )
}

export function JsonEditorPanel(props: JsonEditorPanelProps) {
  const { model, commands, description: descriptionProp, title, mode } = props
  const { contract, examples, payload, editor } = model
  const [activePointer, setActivePointer] = useState<string>()
  const [activePointerPresent, setActivePointerPresent] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const hydrated = useHydrated()
  const pathCoordination = useMemo<JsonEditorGridProps['pathCoordination']>(
    () => ({
      activePointer,
      onActivePointerChange: setActivePointer,
      onActivePointerPresenceChange: setActivePointerPresent,
    }),
    [activePointer],
  )

  const isCreate = mode.type === 'create'
  const description =
    descriptionProp ?? (isCreate ? CREATE_DEFAULTS.description : undefined)

  const payloadPanel = (
    <PayloadPanel
      value={payload.value}
      onChange={(json) => commands.updateExample(examples.activeId, json)}
      validation={editor.validation}
      size={payload.size}
      assistance={editor.assistance}
      pathCoordination={pathCoordination}
      examples={examples.items}
      activeExampleId={examples.activeId}
      onSelectExample={commands.selectExample}
      onRenameExample={commands.renameExample}
      onAddExample={commands.addExample}
      onDeleteExample={commands.removeExample}
      validationCounts={examples.validationCounts}
      canAddExample={examples.canAdd}
      fillHeight={isDesktop}
    />
  )

  const contractPanel = (
    <div
      className={
        isDesktop ? 'flex h-full min-h-0 flex-col gap-3' : 'flex flex-col gap-3'
      }
    >
      <ContractDiagnosticsNotice
        contractDiagnostics={contract.diagnostics}
        examples={examples.items}
      />
      <div className={isDesktop ? 'min-h-0 flex-1' : undefined}>
        <ContractPanel
          contract={contract.value}
          disabled={contract.status.type === 'invalidJson'}
          onOverrideChange={commands.changeContractOverride}
          schemaDiagnostics={contract.schemaDiagnostics}
          activePointer={activePointer}
          activePointerPresent={activePointerPresent}
          onSelectPointer={setActivePointer}
          fillHeight={isDesktop}
        />
      </div>
    </div>
  )

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 pb-28 sm:px-6">
        <JsonEditorPanelHeader
          mode={mode.type}
          title={title}
          description={description}
        />
        <SchemaStatusNotice contract={contract} />

        {!hydrated ? (
          <div className={WORKSPACE_HEIGHT_CLASS} aria-hidden="true" />
        ) : isDesktop ? (
          <WorkbenchShell className={WORKSPACE_HEIGHT_CLASS}>
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={56} minSize={42}>
                <div className="flex h-full min-h-0 flex-col p-5 sm:p-6">
                  {payloadPanel}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={44} minSize={32}>
                <div className="flex h-full min-h-0 flex-col bg-muted/15 p-5 sm:p-6">
                  {contractPanel}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </WorkbenchShell>
        ) : (
          <WorkbenchShell className="p-5 sm:p-6">
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
          </WorkbenchShell>
        )}
      </section>
      <DocumentEditorActions mode={mode} model={model} commands={commands} />
    </>
  )
}
