import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { AlertCircle, Check, X } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { getFableCodeMirrorTheme } from '@/lib/codemirror-fable-theme'
import { MAX_JSON_SIZE, formatBytes } from '@/lib/json'
import { cn } from '@/lib/utils'
import {
  findJsonPathAtPosition,
  findJsonPathLocation,
  getJsonPathLocations,
} from '@/lib/json/json-path-locations'

interface JsonEditorProps {
  value: string
  onChange?: (value: string) => void
  error?: string
  size?: number
  height?: string
  placeholder?: string
  className?: string
  activePath?: string
  contractPaths?: ReadonlySet<string>
  onActivePathChange?: (path?: string) => void
  onActivePathPresenceChange?: (present: boolean) => void
}

export function JsonEditor({
  value,
  onChange,
  error,
  size,
  height = 'clamp(22rem, 54vh, 34rem)',
  placeholder = '{"key": "value"}',
  className,
  activePath,
  contractPaths,
  onActivePathChange,
  onActivePathPresenceChange,
}: JsonEditorProps) {
  const editorViewRef = useRef<EditorView | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const editorTheme = useMemo(() => getFableCodeMirrorTheme(isDark), [isDark])

  const extensions = useMemo(() => [json(), linter(jsonParseLinter())], [])

  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(newValue)
    },
    [onChange],
  )

  const sizePercentage = useMemo(() => {
    if (!size) return 0
    return Math.min((size / MAX_JSON_SIZE) * 100, 100)
  }, [size])

  const pathLocations = useMemo(
    () => (!error ? getJsonPathLocations(value) : []),
    [error, value],
  )

  useEffect(() => {
    if (!activePath) {
      onActivePathPresenceChange?.(true)
      return
    }

    const location = findJsonPathLocation(pathLocations, activePath)
    onActivePathPresenceChange?.(Boolean(location))
    const view = editorViewRef.current
    if (!location || !view) return

    const current = view.state.selection.main
    if (current.from === location.from && current.to === location.to) return

    view.dispatch({
      selection: { anchor: location.from, head: location.to },
      effects: EditorView.scrollIntoView(location.anchor, { y: 'center' }),
      scrollIntoView: true,
    })
  }, [activePath, onActivePathPresenceChange, pathLocations])

  const handleEditorUpdate = useCallback(
    (update: {
      selectionSet: boolean
      state: { selection: { main: { head: number } } }
    }) => {
      if (!update.selectionSet || !onActivePathChange) return
      const path = findJsonPathAtPosition(
        pathLocations,
        update.state.selection.main.head,
      )
      onActivePathChange(
        path && contractPaths?.has(path) === false ? undefined : path,
      )
    },
    [contractPaths, onActivePathChange, pathLocations],
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-md border border-border bg-card transition-colors',
          'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          error && value.length > 0 && 'border-destructive/50',
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
        <div className="flex items-center justify-between gap-4">
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

          {!error ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              Valid JSON
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <X className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
