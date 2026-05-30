import { useCallback, useState } from 'react'
import { validateJSON } from '@/lib/validators'

export function useValidatedBlobSubmit(
  getJson: () => string,
  onSubmit: (json: string) => Promise<void>,
  failureMessage: string,
) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    setError(null)
    const json = getJson()
    const validation = validateJSON(json)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid JSON')
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
