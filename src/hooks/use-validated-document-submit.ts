import { useCallback, useState } from 'react'
import { parseJsonSafely } from '@/lib/json'

export function useValidatedDocumentSubmit(
  getJson: () => string,
  onSubmit: (json: string) => Promise<void>,
  failureMessage: string,
) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    setError(null)
    const json = getJson()
    const result = parseJsonSafely(json)
    if (!result.ok) {
      setError(result.error)
      return
    }
    try {
      await onSubmit(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : failureMessage)
    }
  }, [getJson, onSubmit, failureMessage])

  return { error, setError, handleSubmit }
}
