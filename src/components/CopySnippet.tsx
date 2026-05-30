import { CopyButton } from '@/components/CopyButton'

interface CopySnippetProps {
  url: string
}

type SnippetType = 'url' | 'curl' | 'fetch'

const SNIPPET_LABELS: Record<SnippetType, string> = {
  url: 'URL',
  curl: 'curl',
  fetch: 'fetch',
}

function getSnippet(type: SnippetType, url: string): string {
  switch (type) {
    case 'url':
      return url
    case 'curl':
      return `curl -X GET "${url}"`
    case 'fetch':
      return `fetch("${url}")
  .then(res => res.json())
  .then(data => console.log(data))`
    default:
      return url
  }
}

export function CopySnippet({ url }: CopySnippetProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['url', 'curl', 'fetch'] as const).map((type) => (
        <CopyButton
          key={type}
          text={getSnippet(type, url)}
          label={SNIPPET_LABELS[type]}
        />
      ))}
    </div>
  )
}
