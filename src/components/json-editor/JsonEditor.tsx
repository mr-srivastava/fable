import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { autocompletion } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import { forceLinting, linter, openLintPanel } from '@codemirror/lint'
import { EditorView, keymap } from '@codemirror/view'
import { AlertCircle, Braces } from 'lucide-react'
import type { ViewUpdate } from '@codemirror/view'
import type { JsonEditorProps } from './JsonEditor.types'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getFableCodeMirrorTheme } from '@/lib/codemirror-fable-theme'
import { MAX_JSON_SIZE, formatBytes, formatJson } from '@/lib/json'
import { cn } from '@/lib/utils'
import { getSchemaEditorDiagnostics } from '@/components/json-editor/editor-diagnostics'
import { createContractCompletionSource } from '@/components/json-editor/contract-completions'
import { createContractHover } from '@/components/json-editor/contract-hover'
import {
  findJsonLocationAtPosition,
  findJsonSchemaPointerLocation,
  getJsonPathLocationsFromTree,
} from '@/components/json-editor/json-path-locations'

function formatEditorView(view: EditorView) {
  const source = view.state.doc.toString()
  const formatted = formatJson(source)
  if (!formatted || formatted === source) return true
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
  })
  return true
}

export function JsonEditor({
  value,
  onChange,
  validation,
  size,
  height = 'clamp(22rem, 54vh, 34rem)',
  placeholder = '{"key": "value"}',
  className,
  assistance,
  pathCoordination,
}: JsonEditorProps) {
  const editorViewRef = useRef<EditorView | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const editorTheme = useMemo(() => getFableCodeMirrorTheme(isDark), [isDark])
  const contractFields =
    assistance.status === 'available' ? assistance.fields : []
  const completionFields =
    assistance.status === 'available' && assistance.freshness === 'current'
      ? assistance.fields
      : []
  const schemaDiagnostics =
    assistance.status === 'available' && assistance.freshness === 'current'
      ? assistance.diagnostics
      : []
  const externalError =
    validation.status === 'externalError' ? validation.message : undefined
  const knownPointers = useMemo(
    () =>
      new Set(
        contractFields.flatMap((field) =>
          field.schemaPointer ? [field.schemaPointer] : [],
        ),
      ),
    [contractFields],
  )

  const extensions = useMemo(
    () => [
      json(),
      linter(jsonParseLinter()),
      linter((view) =>
        getSchemaEditorDiagnostics(view.state, schemaDiagnostics),
      ),
      autocompletion({
        override: [createContractCompletionSource(completionFields)],
        activateOnTyping: true,
        activateOnCompletion: (completion) => completion.type === 'property',
      }),
      createContractHover(contractFields),
      keymap.of([
        {
          key: 'Shift-Alt-f',
          run: formatEditorView,
        },
      ]),
    ],
    [completionFields, contractFields, schemaDiagnostics],
  )

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue)
    },
    [onChange],
  )

  const sizePercentage = useMemo(() => {
    if (!size) return 0
    return Math.min((size / MAX_JSON_SIZE) * 100, 100)
  }, [size])

  useEffect(() => {
    const activePointer = pathCoordination?.activePointer
    if (!activePointer) {
      pathCoordination?.onActivePointerPresenceChange(true)
      return
    }

    const view = editorViewRef.current
    const locations =
      view && validation.status === 'valid'
        ? getJsonPathLocationsFromTree(
            view.state.doc.toString(),
            syntaxTree(view.state),
          )
        : []
    const location = findJsonSchemaPointerLocation(locations, activePointer)
    pathCoordination.onActivePointerPresenceChange(Boolean(location))
    if (!location || !view) return

    const current = view.state.selection.main
    if (current.from === location.from && current.to === location.to) return

    view.dispatch({
      selection: { anchor: location.from, head: location.to },
      effects: EditorView.scrollIntoView(location.anchor, { y: 'center' }),
      scrollIntoView: true,
    })
  }, [pathCoordination, validation.status, value])

  const handleEditorUpdate = useCallback(
    (update: ViewUpdate) => {
      if (!update.selectionSet || !pathCoordination) return
      const locations = getJsonPathLocationsFromTree(
        update.state.doc.toString(),
        syntaxTree(update.state),
      )
      const pointer = findJsonLocationAtPosition(
        locations,
        update.state.selection.main.head,
      )?.schemaPointer
      pathCoordination.onActivePointerChange(
        pointer && !knownPointers.has(pointer) ? undefined : pointer,
      )
    },
    [knownPointers, pathCoordination],
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    const view = editorViewRef.current
                    if (view) formatEditorView(view)
                  }}
                  disabled={
                    validation.status !== 'valid' || value.trim() === ''
                  }
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
      <div
        className={cn(
          'overflow-hidden rounded-md border border-border bg-card transition-colors',
          'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          validation.status !== 'valid' &&
            value.length > 0 &&
            'border-destructive/50',
        )}
      >
        <CodeMirror
          value={value}
          height={height}
          theme={editorTheme}
          extensions={extensions}
          onChange={handleChange}
          onCreateEditor={(view) => {
            editorViewRef.current = view
          }}
          onUpdate={handleEditorUpdate}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: false,
            lintKeymap: true,
          }}
        />
      </div>

      {value.length > 0 && size !== undefined && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {formatBytes(size)} / {formatBytes(MAX_JSON_SIZE)}
          </p>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full transition-all duration-300',
                sizePercentage < 70
                  ? 'bg-success'
                  : sizePercentage < 90
                    ? 'bg-warning'
                    : 'bg-destructive',
              )}
              style={{ width: `${sizePercentage}%` }}
            />
          </div>
        </div>
      )}

      {externalError && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {externalError}
        </p>
      )}

      {schemaDiagnostics.length > 0 && (
        <button
          type="button"
          className="w-fit text-xs font-medium text-destructive underline-offset-4 hover:underline"
          onClick={() => {
            const view = editorViewRef.current
            if (!view) return
            forceLinting(view)
            openLintPanel(view)
          }}
        >
          Review {schemaDiagnostics.length} contract issue
          {schemaDiagnostics.length === 1 ? '' : 's'}
        </button>
      )}
    </div>
  )
}
