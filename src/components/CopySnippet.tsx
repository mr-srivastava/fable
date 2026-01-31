import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const [copiedType, setCopiedType] = useState<SnippetType | null>(null)

  const handleCopy = async (type: SnippetType) => {
    const snippet = getSnippet(type, url)
    try {
      await navigator.clipboard.writeText(snippet)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['url', 'curl', 'fetch'] as const).map((type) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => handleCopy(type)}
          className="gap-2"
        >
          {copiedType === type ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {SNIPPET_LABELS[type]}
        </Button>
      ))}
    </div>
  )
}
