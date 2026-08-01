import { CopyButton } from '@/components/CopyButton'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface CopySnippetProps {
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

export function CopySnippet({ pageUrl, apiUrl }: CopySnippetProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['url', 'curl', 'fetch'] as const).map((type) => (
        <CopyButton
          key={type}
          text={getSnippet(type, pageUrl, apiUrl)}
          label={SNIPPET_LABELS[type]}
        />
      ))}
    </div>
  )
}

export function CopySnippetMenuItems({ pageUrl, apiUrl }: CopySnippetProps) {
  return (
    <>
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
    </>
  )
}
