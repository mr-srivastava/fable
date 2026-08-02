import {
  assertValidDocumentContract,
  assertValidDocumentVariants,
  parseContractOverrides,
} from './document'
import {
  MAX_DOCUMENT_BYTES,
  MAX_VARIANTS_PER_DOCUMENT,
  MAX_VARIANT_BYTES,
  getUtf8Size,
} from './document-limits'
import {
  applyContractOverrides,
  normalizeJsonSchema,
  projectJsonSchemaToContract,
  validateVariantsAgainstSchema,
} from './json-schema'
import type {
  ContractOverrides,
  JsonContract,
  JsonDocumentVariant,
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

function validateVariantData(data: string): number {
  try {
    JSON.parse(data)
  } catch {
    throw new Error('Invalid JSON')
  }

  const size = getUtf8Size(data)
  if (size > MAX_VARIANT_BYTES) {
    throw new Error(`JSON too large: ${size} bytes (max ${MAX_VARIANT_BYTES})`)
  }
  return size
}

export function prepareDocumentRecord(
  variants: Array<JsonDocumentVariant>,
  contract?: JsonContract,
  jsonSchema?: JsonSchema,
  contractOverrides: ContractOverrides = [],
): PreparedDocumentRecord {
  assertValidDocumentVariants(variants)
  if (variants.length > MAX_VARIANTS_PER_DOCUMENT) {
    throw new Error(
      `Too many variants: ${variants.length} (max ${MAX_VARIANTS_PER_DOCUMENT})`,
    )
  }

  for (const variant of variants) validateVariantData(variant.data)
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
      validateVariantsAgainstSchema(variants, effectiveJsonSchema).length > 0
    ) {
      throw new Error('All variants must satisfy the contract')
    }
  } else if (parsedOverrides.length > 0) {
    throw new Error('Contract overrides require a JSON Schema')
  }

  const data = variants[0].data
  const size = getUtf8Size(data)
  const totalSize = getUtf8Size(
    JSON.stringify({
      variants,
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
