import { Check, Copy } from 'lucide-react'
import type { BlobCreatedAlertProps, BlobEditorActionsProps } from './JsonEditorPanel.types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CopySnippet } from '@/components/CopySnippet'

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

export function BlobEditorActions({
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
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={onSubmit}
          disabled={disabled}
          className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
        >
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
        {showSnippet && typeof blobUrl === 'string' && (
          <CopySnippet url={blobUrl} />
        )}
      </div>
    </div>
  )
}
