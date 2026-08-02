import type { JsonContract, JsonDocumentVariant } from '@shared/document'

export type ContractWarningSeverity = 'none' | 'warning'

export type ContractVariantGroup = {
  id: string
  variantIds: Array<string>
}

export type ContractDiagnostics = {
  severity: ContractWarningSeverity
  similarityScore: number
  sharedEnvelopeFields: Array<string>
  divergentGroups: Array<ContractVariantGroup>
  optionalFieldRatio: number
}

type VariantShape = {
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

function collectShape(
  value: unknown,
  path: string,
  paths: Set<string>,
  topLevelFields: Set<string>,
  discriminatorFields: Set<string>,
) {
  if (path) {
    paths.add(path)
    if (!path.includes('.')) topLevelFields.add(path)

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

function getVariantShapes(
  variants: Array<JsonDocumentVariant>,
): Array<VariantShape> {
  return variants.map((variant) => {
    const paths = new Set<string>()
    const topLevelFields = new Set<string>()
    const discriminatorFields = new Set<string>()

    collectShape(
      JSON.parse(variant.data),
      '',
      paths,
      topLevelFields,
      discriminatorFields,
    )

    return { id: variant.id, paths, topLevelFields, discriminatorFields }
  })
}

function getOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 && right.size === 0) return 1

  const union = new Set([...left, ...right])
  const intersection = [...left].filter((value) => right.has(value))
  return intersection.length / union.size
}

function getSharedFields(
  shapes: Array<VariantShape>,
  field: 'topLevelFields' | 'discriminatorFields',
) {
  if (shapes.length === 0) return []
  return [...shapes[0][field]].filter((value) =>
    shapes.every((shape) => shape[field].has(value)),
  )
}

function getAveragePairwiseOverlap(
  shapes: Array<VariantShape>,
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

  return total / count
}

function getDivergentGroups(shapes: Array<VariantShape>) {
  const groups: Array<ContractVariantGroup> = []
  const visited = new Set<string>()

  for (const shape of shapes) {
    if (visited.has(shape.id)) continue

    const groupIds = [shape.id]
    visited.add(shape.id)
    for (const candidate of shapes) {
      if (
        !visited.has(candidate.id) &&
        getOverlap(shape.paths, candidate.paths) >= SIMILARITY_THRESHOLD
      ) {
        groupIds.push(candidate.id)
        visited.add(candidate.id)
      }
    }

    groups.push({ id: groupIds.join(':'), variantIds: groupIds })
  }

  return groups
}

export function analyzeContractCompatibility(
  variants: Array<JsonDocumentVariant>,
  contract: JsonContract,
): ContractDiagnostics {
  const shapes = getVariantShapes(variants)
  const sharedTopLevelFields = getSharedFields(shapes, 'topLevelFields')
  const sharedEnvelopeFields = sharedTopLevelFields.filter((field) =>
    ENVELOPE_FIELDS.has(field),
  )
  const hasSharedDiscriminator =
    getSharedFields(shapes, 'discriminatorFields').length > 0
  const similarityScore = getAveragePairwiseOverlap(shapes, 'paths')
  const topLevelSimilarityScore = getAveragePairwiseOverlap(
    shapes,
    'topLevelFields',
  )
  const optionalFieldRatio = contract.fields.length
    ? contract.fields.filter((field) => !field.required).length /
      contract.fields.length
    : 0
  const divergentGroups = getDivergentGroups(shapes)
  const looksDivergent =
    variants.length > 1 &&
    sharedEnvelopeFields.length < 2 &&
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
