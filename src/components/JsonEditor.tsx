import { useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  X,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { getFableCodeMirrorTheme } from '@/lib/codemirror-fable-theme'
import { MAX_BLOB_SIZE, formatBytes, parseJSONInput } from '@/lib/validators'
import { cn } from '@/lib/utils'

interface JsonEditorProps {
  value: string
  mode: 'edit' | 'view'
  onChange?: (value: string) => void
  error?: string
  height?: string
  placeholder?: string
  className?: string
}

export function JsonEditor({
  value,
  mode,
  onChange,
  error,
  height = '580px',
  placeholder = '{"key": "value"}',
  className,
}: JsonEditorProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const editorTheme = useMemo(
    () => getFableCodeMirrorTheme(isDark),
    [isDark]
  )

  const extensions = useMemo(
    () => [json(), linter(jsonParseLinter())],
    []
  )

  const { validation, formatted, parseError } = useMemo(() => {
    const isEmpty = value.trim() === ''
    if (isEmpty) {
      return {
        validation: { valid: true as const, size: 0 },
        formatted: '',
        parseError: null as string | null,
      }
    }

    const result = parseJSONInput(value)
    if (result.ok) {
      return {
        validation: { valid: true as const, size: result.size },
        formatted: JSON.stringify(result.parsed, null, 2),
        parseError: null as string | null,
      }
    }

    return {
      validation: {
        valid: false as const,
        error: result.error,
        size: result.size,
      },
      formatted: '',
      parseError: result.error,
    }
  }, [value])

  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(newValue)
    },
    [onChange]
  )

  const sizePercentage = useMemo(() => {
    if (!validation.size) return 0
    return Math.min((validation.size / MAX_BLOB_SIZE) * 100, 100)
  }, [validation.size])

  if (mode === 'edit') {
    return (
      <div className={cn('space-y-2', className)}>
        <div
          className={cn(
            'rounded-md border border-border bg-card overflow-hidden transition-colors',
            'ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            !validation.valid && value.length > 0 && 'border-destructive/50'
          )}
        >
          <CodeMirror
            value={value}
            height={height}
            theme={editorTheme}
            extensions={extensions}
            onChange={handleChange}
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
                {formatBytes(validation.size)} / {formatBytes(MAX_BLOB_SIZE)}
              </p>
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    sizePercentage < 70
                      ? 'bg-success'
                      : sizePercentage < 90
                        ? 'bg-warning'
                        : 'bg-destructive'
                  )}
                  style={{ width: `${sizePercentage}%` }}
                />
              </div>
            </div>

            {validation.valid ? (
              <span className="text-xs text-success flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Valid JSON
              </span>
            ) : (
              'error' in validation &&
              validation.error && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  {validation.error}
                </span>
              )
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  }

  const isEmpty = value.trim() === ''
  if (isEmpty) {
    return (
      <div
        className={cn(
          'rounded-md border bg-muted/50 flex items-center justify-center p-6',
          className
        )}
        style={{ height }}
      >
        <div className="text-center space-y-2">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            JSON input is empty. Adding JSON will show preview here.
          </p>
        </div>
      </div>
    )
  }

  if (parseError) {
    return (
      <div
        className={cn(
          'rounded-md border border-destructive/50 bg-destructive/5 flex items-center justify-center p-6',
          className
        )}
        style={{ height }}
      >
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive mb-1">
              Invalid JSON
            </p>
            <pre className="font-mono text-xs text-destructive/80 whitespace-pre-wrap wrap-break-word">
              {parseError}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-md border border-border bg-card overflow-hidden', className)}>
      <CodeMirror
        value={formatted}
        height={height}
        theme={editorTheme}
        extensions={extensions}
        editable={false}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
      />
    </div>
  )
}
