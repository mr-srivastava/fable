import type {
  JsonContract,
  JsonContractField,
  JsonFieldType,
} from '@/types/contract'
import type { JsonDocumentExample } from '@/types/document'

type FieldAccumulator = {
  path: string
  type: JsonFieldType
  required: boolean
  nullable: boolean
  seen: number
}

type ExampleFieldAccumulator = {
  path: string
  type: JsonFieldType
  nullable: boolean
  seenInExamples: Set<number>
}

export type ContractWarningSeverity = 'none' | 'warning'

export type ContractExampleGroup = {
  id: string
  exampleIds: Array<string>
}

export type ContractDiagnostics = {
  severity: ContractWarningSeverity
  similarityScore: number
  sharedEnvelopeFields: Array<string>
  divergentGroups: Array<ContractExampleGroup>
  optionalFieldRatio: number
}

export type ContractAnalysis = {
  contract: JsonContract
  diagnostics: ContractDiagnostics
}

type ExampleShape = {
  id: string
  paths: Set<string>
  topLevelFields: Set<string>
  discriminatorFields: Set<string>
}

const SIMILARITY_THRESHOLD = 0.35
const LOW_TOP_LEVEL_OVERLAP_THRESHOLD = 0.25
const HIGH_OPTIONAL_FIELD_RATIO = 0.65
const ENVELOPE_FIELDS = new Set(['status', 'requestId', 'data', 'error'])
const DISCRIMINATOR_FIELDS = new Set(['status', 'type', 'kind', 'code'])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getValueType(value: unknown): JsonFieldType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isPlainObject(value)) return 'object'

  const valueType = typeof value
  if (valueType === 'string') return 'string'
  if (valueType === 'number') return 'number'
  if (valueType === 'boolean') return 'boolean'
  return 'unknown'
}

function combineTypes(
  current: JsonFieldType,
  next: JsonFieldType,
): JsonFieldType {
  if (current === next) return current
  if (current === 'null') return next
  if (next === 'null') return current
  return 'unknown'
}

function upsertField(
  fields: Map<string, FieldAccumulator>,
  path: string,
  value: unknown,
  required: boolean,
) {
  const nextType = getValueType(value)
  const existing = fields.get(path)

  if (!existing) {
    fields.set(path, {
      path,
      type: nextType,
      required,
      nullable: value === null,
      seen: 1,
    })
    return
  }

  existing.type = combineTypes(existing.type, nextType)
  existing.required = existing.required && required
  existing.nullable = existing.nullable || value === null
  existing.seen += 1
}

function upsertExampleField(
  fields: Map<string, ExampleFieldAccumulator>,
  path: string,
  value: unknown,
  exampleIndex: number,
) {
  const nextType = getValueType(value)
  const existing = fields.get(path)

  if (!existing) {
    fields.set(path, {
      path,
      type: nextType,
      nullable: value === null,
      seenInExamples: new Set([exampleIndex]),
    })
    return
  }

  existing.type = combineTypes(existing.type, nextType)
  existing.nullable = existing.nullable || value === null
  existing.seenInExamples.add(exampleIndex)
}

function walkValue(
  value: unknown,
  path: string,
  fields: Map<string, FieldAccumulator>,
  required: boolean,
) {
  if (path) {
    upsertField(fields, path, value, required)
  }

  if (Array.isArray(value)) {
    walkArray(value, path, fields)
    return
  }

  if (isPlainObject(value)) {
    for (const [key, childValue] of Object.entries(value)) {
      walkValue(childValue, path ? `${path}.${key}` : key, fields, true)
    }
  }
}

function walkArray(
  items: Array<unknown>,
  arrayPath: string,
  fields: Map<string, FieldAccumulator>,
) {
  if (items.length === 0) return

  const itemPath = `${arrayPath}[]`
  const objectItems = items.filter(isPlainObject)

  if (objectItems.length > 0) {
    const keys = new Set(objectItems.flatMap((item) => Object.keys(item)))
    for (const key of keys) {
      for (const item of objectItems) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          walkValue(item[key], `${itemPath}.${key}`, fields, true)
        } else {
          const field = fields.get(`${itemPath}.${key}`)
          if (field) field.required = false
        }
      }

      const field = fields.get(`${itemPath}.${key}`)
      if (field && field.seen < objectItems.length) {
        field.required = false
      }
    }
  } else {
    for (const item of items) {
      walkValue(item, itemPath, fields, true)
    }
  }
}

function walkExampleValue(
  value: unknown,
  path: string,
  fields: Map<string, ExampleFieldAccumulator>,
  exampleIndex: number,
) {
  if (path) {
    upsertExampleField(fields, path, value, exampleIndex)
  }

  if (Array.isArray(value)) {
    walkExampleArray(value, path, fields, exampleIndex)
    return
  }

  if (isPlainObject(value)) {
    for (const [key, childValue] of Object.entries(value)) {
      walkExampleValue(
        childValue,
        path ? `${path}.${key}` : key,
        fields,
        exampleIndex,
      )
    }
  }
}

function walkExampleArray(
  items: Array<unknown>,
  arrayPath: string,
  fields: Map<string, ExampleFieldAccumulator>,
  exampleIndex: number,
) {
  if (items.length === 0) return

  const itemPath = `${arrayPath}[]`
  const objectItems = items.filter(isPlainObject)

  if (objectItems.length > 0) {
    const keys = new Set(objectItems.flatMap((item) => Object.keys(item)))
    for (const key of keys) {
      for (const item of objectItems) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          walkExampleValue(
            item[key],
            `${itemPath}.${key}`,
            fields,
            exampleIndex,
          )
        }
      }
    }
  } else {
    for (const item of items) {
      walkExampleValue(item, itemPath, fields, exampleIndex)
    }
  }
}

function collectShape(
  value: unknown,
  path: string,
  paths: Set<string>,
  topLevelFields: Set<string>,
  discriminatorFields: Set<string>,
) {
  if (path) {
    paths.add(path)
    if (!path.includes('.')) {
      topLevelFields.add(path)
    }
    const fieldName = path.split('.').at(-1)
    if (fieldName && DISCRIMINATOR_FIELDS.has(fieldName)) {
      discriminatorFields.add(path)
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectShape(
        item,
        path ? `${path}[]` : '[]',
        paths,
        topLevelFields,
        discriminatorFields,
      )
    }
    return
  }

  if (isPlainObject(value)) {
    for (const [key, childValue] of Object.entries(value)) {
      collectShape(
        childValue,
        path ? `${path}.${key}` : key,
        paths,
        topLevelFields,
        discriminatorFields,
      )
    }
  }
}

function getExampleShapes(
  examples: Array<JsonDocumentExample>,
): Array<ExampleShape> {
  return examples.map((example) => {
    const paths = new Set<string>()
    const topLevelFields = new Set<string>()
    const discriminatorFields = new Set<string>()

    collectShape(
      JSON.parse(example.data),
      '',
      paths,
      topLevelFields,
      discriminatorFields,
    )

    return {
      id: example.id,
      paths,
      topLevelFields,
      discriminatorFields,
    }
  })
}

function getOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 && right.size === 0) return 1

  const union = new Set([...left, ...right])
  const intersection = [...left].filter((value) => right.has(value))
  return intersection.length / union.size
}

function getSharedFields(
  shapes: Array<ExampleShape>,
  field: keyof ExampleShape,
) {
  if (shapes.length === 0) return []

  const first = shapes[0][field]
  if (!(first instanceof Set)) return []

  return [...first].filter((value) =>
    shapes.every((shape) => {
      const values = shape[field]
      return values instanceof Set && values.has(value)
    }),
  )
}

function getAveragePairwiseOverlap(
  shapes: Array<ExampleShape>,
  field: 'paths' | 'topLevelFields',
) {
  if (shapes.length < 2) return 1

  let total = 0
  let count = 0

  for (let leftIndex = 0; leftIndex < shapes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < shapes.length;
      rightIndex += 1
    ) {
      total += getOverlap(shapes[leftIndex][field], shapes[rightIndex][field])
      count += 1
    }
  }

  return count === 0 ? 1 : total / count
}

function getDivergentGroups(shapes: Array<ExampleShape>) {
  const groups: Array<ContractExampleGroup> = []
  const visited = new Set<string>()

  for (const shape of shapes) {
    if (visited.has(shape.id)) continue

    const groupIds = [shape.id]
    visited.add(shape.id)

    for (const candidate of shapes) {
      if (visited.has(candidate.id)) continue

      if (getOverlap(shape.paths, candidate.paths) >= SIMILARITY_THRESHOLD) {
        groupIds.push(candidate.id)
        visited.add(candidate.id)
      }
    }

    groups.push({
      id: groupIds.join(':'),
      exampleIds: groupIds,
    })
  }

  return groups
}

function getOptionalFieldRatio(contract: JsonContract) {
  if (contract.fields.length === 0) return 0

  const optionalCount = contract.fields.filter(
    (field) => !field.required,
  ).length
  return optionalCount / contract.fields.length
}

function getContractDiagnostics(
  examples: Array<JsonDocumentExample>,
  contract: JsonContract,
): ContractDiagnostics {
  const shapes = getExampleShapes(examples)
  const sharedTopLevelFields = getSharedFields(shapes, 'topLevelFields')
  const sharedEnvelopeFields = sharedTopLevelFields.filter((field) =>
    ENVELOPE_FIELDS.has(field),
  )
  const sharedDiscriminatorFields = getSharedFields(
    shapes,
    'discriminatorFields',
  )
  const similarityScore = getAveragePairwiseOverlap(shapes, 'paths')
  const topLevelSimilarityScore = getAveragePairwiseOverlap(
    shapes,
    'topLevelFields',
  )
  const optionalFieldRatio = getOptionalFieldRatio(contract)
  const hasSharedEnvelope = sharedEnvelopeFields.length >= 2
  const hasSharedDiscriminator = sharedDiscriminatorFields.length > 0
  const divergentGroups = getDivergentGroups(shapes)
  const looksDivergent =
    examples.length > 1 &&
    !hasSharedEnvelope &&
    !hasSharedDiscriminator &&
    similarityScore < SIMILARITY_THRESHOLD &&
    topLevelSimilarityScore < LOW_TOP_LEVEL_OVERLAP_THRESHOLD &&
    optionalFieldRatio >= HIGH_OPTIONAL_FIELD_RATIO

  return {
    severity: looksDivergent ? 'warning' : 'none',
    similarityScore,
    sharedEnvelopeFields,
    divergentGroups,
    optionalFieldRatio,
  }
}

export function inferContractFromJson(value: unknown): JsonContract {
  const fields = new Map<string, FieldAccumulator>()
  walkValue(value, '', fields, true)

  const contractFields: Array<JsonContractField> = Array.from(
    fields.values(),
  ).map(({ path, type, required, nullable }) => ({
    path,
    type,
    required,
    nullable,
  }))

  return {
    version: 1,
    fields: contractFields.sort((a, b) => a.path.localeCompare(b.path)),
  }
}

export function analyzeExamplesForContract(
  examples: Array<JsonDocumentExample>,
): ContractAnalysis {
  const contract = inferContractFromExamples(examples)

  return {
    contract,
    diagnostics: getContractDiagnostics(examples, contract),
  }
}

export function inferContractFromExamples(
  examples: Array<JsonDocumentExample>,
): JsonContract {
  const fields = new Map<string, ExampleFieldAccumulator>()

  examples.forEach((example, index) => {
    walkExampleValue(JSON.parse(example.data), '', fields, index)
  })

  const contractFields: Array<JsonContractField> = Array.from(
    fields.values(),
  ).map(({ path, type, nullable, seenInExamples }) => ({
    path,
    type,
    required: seenInExamples.size === examples.length,
    nullable,
  }))

  return {
    version: 1,
    fields: contractFields.sort((a, b) => a.path.localeCompare(b.path)),
  }
}
