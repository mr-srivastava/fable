import {
  assertValidDocumentContract,
  assertValidDocumentExamples,
} from './document'
import {
  MAX_DOCUMENT_BYTES,
  MAX_EXAMPLES_PER_DOCUMENT,
  MAX_EXAMPLE_BYTES,
  getUtf8Size,
} from './document-limits'
import type { JsonContract, JsonDocumentExample } from './document'

export type PreparedDocumentRecord = {
  data: string
  size: number
  totalSize: number
}

function validateExampleData(data: string): number {
  try {
    JSON.parse(data)
  } catch {
    throw new Error('Invalid JSON')
  }

  const size = getUtf8Size(data)
  if (size > MAX_EXAMPLE_BYTES) {
    throw new Error(`JSON too large: ${size} bytes (max ${MAX_EXAMPLE_BYTES})`)
  }
  return size
}

export function prepareDocumentRecord(
  examples: Array<JsonDocumentExample>,
  contract?: JsonContract,
): PreparedDocumentRecord {
  assertValidDocumentExamples(examples)
  if (examples.length > MAX_EXAMPLES_PER_DOCUMENT) {
    throw new Error(
      `Too many examples: ${examples.length} (max ${MAX_EXAMPLES_PER_DOCUMENT})`,
    )
  }

  for (const example of examples) validateExampleData(example.data)
  if (contract) assertValidDocumentContract(contract)

  const data = examples[0].data
  const size = getUtf8Size(data)
  const totalSize = getUtf8Size(JSON.stringify({ examples, contract }))
  if (totalSize > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Document too large: ${totalSize} bytes (max ${MAX_DOCUMENT_BYTES})`,
    )
  }

  return { data, size, totalSize }
}
