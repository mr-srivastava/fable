import {
  assertValidDocumentContract,
  assertValidDocumentExamples,
  parseContractOverrides,
} from './document'
import {
  MAX_DOCUMENT_BYTES,
  MAX_EXAMPLES_PER_DOCUMENT,
  MAX_EXAMPLE_BYTES,
  getUtf8Size,
} from './document-limits'
import {
  applyContractOverrides,
  normalizeJsonSchema,
  projectJsonSchemaToContract,
  validateExamplesAgainstSchema,
} from './json-schema'
import type {
  ContractOverrides,
  JsonContract,
  JsonDocumentExample,
  JsonSchema,
} from './document'

export type PreparedDocumentRecord = {
  data: string
  size: number
  totalSize: number
  contract?: JsonContract
  jsonSchema?: JsonSchema
  contractOverrides?: ContractOverrides
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
  jsonSchema?: JsonSchema,
  contractOverrides: ContractOverrides = [],
): PreparedDocumentRecord {
  assertValidDocumentExamples(examples)
  if (examples.length > MAX_EXAMPLES_PER_DOCUMENT) {
    throw new Error(
      `Too many examples: ${examples.length} (max ${MAX_EXAMPLES_PER_DOCUMENT})`,
    )
  }

  for (const example of examples) validateExampleData(example.data)
  if (contract) assertValidDocumentContract(contract)
  const parsedOverrides = parseContractOverrides(contractOverrides)
  let effectiveContract = contract
  let effectiveJsonSchema: JsonSchema | undefined
  let effectiveOverrides: ContractOverrides | undefined
  if (jsonSchema) {
    const normalizedSchema = normalizeJsonSchema(jsonSchema)
    const applied = applyContractOverrides(normalizedSchema, parsedOverrides)
    if (applied.overrides.length !== parsedOverrides.length) {
      throw new Error('Contract override target does not exist')
    }
    effectiveJsonSchema = normalizeJsonSchema(applied.jsonSchema)
    effectiveOverrides = applied.overrides
    effectiveContract = projectJsonSchemaToContract(effectiveJsonSchema)
    if (
      validateExamplesAgainstSchema(examples, effectiveJsonSchema).length > 0
    ) {
      throw new Error('All examples must satisfy the contract')
    }
  } else if (parsedOverrides.length > 0) {
    throw new Error('Contract overrides require a JSON Schema')
  }

  const data = examples[0].data
  const size = getUtf8Size(data)
  const totalSize = getUtf8Size(
    JSON.stringify({
      examples,
      contract: effectiveContract,
      jsonSchema: effectiveJsonSchema,
      contractOverrides: effectiveOverrides,
    }),
  )
  if (totalSize > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Document too large: ${totalSize} bytes (max ${MAX_DOCUMENT_BYTES})`,
    )
  }

  return {
    data,
    size,
    totalSize,
    contract: effectiveContract,
    jsonSchema: effectiveJsonSchema,
    contractOverrides: effectiveOverrides,
  }
}
