import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { AlertCircle, Check, X } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { getFableCodeMirrorTheme } from '@/lib/codemirror-fable-theme'
import { MAX_JSON_SIZE, formatBytes, parseJsonSafely } from '@/lib/json'
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

  const validation = useMemo(() => {
    const isEmpty = value.trim() === ''
    if (isEmpty) {
      return { valid: true as const, size: 0 }
    }

    const result = parseJsonSafely(value)
    if (result.ok) {
      return { valid: true as const, size: result.size }
    }

    return {
      valid: false as const,
      error: result.error,
      size: result.size,
    }
  }, [value])

  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(newValue)
    },
    [onChange],
  )

  const sizePercentage = useMemo(() => {
    if (!validation.size) return 0
    return Math.min((validation.size / MAX_JSON_SIZE) * 100, 100)
  }, [validation.size])

  const pathLocations = useMemo(
    () => (validation.valid ? getJsonPathLocations(value) : []),
    [validation.valid, value],
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
          !validation.valid && value.length > 0 && 'border-destructive/50',
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
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
          }}
        />
      </div>

      {value.length > 0 && validation.size !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {formatBytes(validation.size)} / {formatBytes(MAX_JSON_SIZE)}
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

          {validation.valid ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              Valid JSON
            </span>
          ) : (
            'error' in validation &&
            validation.error && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <X className="h-3.5 w-3.5" />
                {validation.error}
              </span>
            )
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
