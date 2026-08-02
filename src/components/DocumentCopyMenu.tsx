import { Copy } from 'lucide-react'
import { CopyButton } from '@/components/CopyButton'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type DocumentCopyMenuProps = {
  json: string
  pageUrl: string
  apiUrl: string
}

type SnippetType = 'url' | 'curl' | 'fetch'

const SNIPPET_LABELS: Record<SnippetType, string> = {
  url: 'URL',
  curl: 'curl',
  fetch: 'fetch',
}

function getSnippet(
  type: SnippetType,
  pageUrl: string,
  apiUrl: string,
): string {
  switch (type) {
    case 'url':
      return pageUrl
    case 'curl':
      return `curl -X GET "${apiUrl}"`
    case 'fetch':
      return `fetch("${apiUrl}")
  .then(res => res.json())
  .then(data => console.log(data))`
    default:
      return pageUrl
  }
}

export function DocumentCopyMenuItems({
  json,
  pageUrl,
  apiUrl,
}: DocumentCopyMenuProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        render={
          <CopyButton
            text={json}
            label="JSON"
            ariaLabel="Copy saved JSON"
            variant="ghost"
            className="w-full justify-start"
          />
        }
      />
      {(['url', 'curl', 'fetch'] as const).map((type) => (
        <DropdownMenuItem
          key={type}
          render={
            <CopyButton
              text={getSnippet(type, pageUrl, apiUrl)}
              label={SNIPPET_LABELS[type]}
              variant="ghost"
              className="w-full justify-start"
            />
          }
        />
      ))}
    </DropdownMenuGroup>
  )
}

export function DocumentCopyMenu(props: DocumentCopyMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(buttonVariants({ variant: 'outline' }))}
        aria-label="Copy specimen"
      >
        <Copy />
        Copy
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-44">
        <DocumentCopyMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
