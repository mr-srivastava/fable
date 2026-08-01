import Ajv from 'ajv'
import type { ErrorObject, ValidateFunction } from 'ajv'
import type {
  ContractFieldOverride,
  ContractOverrides,
  JsonContract,
  JsonContractField,
  JsonDocumentExample,
  JsonFieldType,
  JsonSchema,
} from './document'

export const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#'

type SchemaValidationDiagnosticBase = {
  exampleId: string
  instancePointer: string
  fieldPointer: string
  rulePointer: string
  message: string
}

export type SchemaValidationDiagnostic =
  | (SchemaValidationDiagnosticBase & {
      code: 'typeMismatch'
      expected: string
    })
  | (SchemaValidationDiagnosticBase & {
      code: 'enumMismatch'
      allowedValues: Array<unknown>
    })
  | (SchemaValidationDiagnosticBase & {
      code: 'missingProperty'
      missingProperty: string
    })
  | (SchemaValidationDiagnosticBase & {
      code: 'unexpectedProperty'
      unexpectedProperty: string
    })
  | (SchemaValidationDiagnosticBase & {
      code: 'constraintViolation'
      constraint: string
    })

type SchemaNode = JsonSchema & {
  $ref?: string
  type?: string | Array<string>
  properties?: Record<string, SchemaNode>
  items?: SchemaNode | Array<SchemaNode>
  required?: Array<string>
  enum?: Array<unknown>
  description?: string
  anyOf?: Array<SchemaNode>
  oneOf?: Array<SchemaNode>
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: false,
  validateSchema: true,
})

export function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1')
}

export function unescapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~')
}

export function normalizeJsonSchema(value: unknown): JsonSchema {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON Schema must be an object')
  }

  const jsonSchema = structuredClone(value) as JsonSchema
  jsonSchema.$schema = JSON_SCHEMA_DRAFT_7
  assertLocalReferences(jsonSchema)
  if (!ajv.validateSchema(jsonSchema)) {
    throw new Error(ajv.errorsText(ajv.errors, { separator: '; ' }))
  }
  return jsonSchema
}

function visitSchema(value: unknown, visit: (node: SchemaNode) => void) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => visitSchema(item, visit))
    return
  }

  const node = value as SchemaNode
  visit(node)
  Object.values(node).forEach((child) => visitSchema(child, visit))
}

export function assertLocalReferences(jsonSchema: JsonSchema) {
  visitSchema(jsonSchema, (node) => {
    if (node.$ref && !node.$ref.startsWith('#/')) {
      throw new Error(`Unsupported remote JSON Schema reference: ${node.$ref}`)
    }
  })
}

function resolvePointer(root: JsonSchema, pointer: string): unknown {
  if (pointer === '#') return root
  if (!pointer.startsWith('#/')) return undefined

  return pointer
    .slice(2)
    .split('/')
    .map(unescapeJsonPointerSegment)
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[segment]
    }, root)
}

function resolveNode(
  root: JsonSchema,
  node: SchemaNode,
  visited = new Set<string>(),
): SchemaNode {
  if (!node.$ref) return node
  if (visited.has(node.$ref))
    throw new Error(`Cyclic JSON Schema reference: ${node.$ref}`)
  const resolved = resolvePointer(root, node.$ref)
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
    throw new Error(`Unresolved JSON Schema reference: ${node.$ref}`)
  }
  return resolveNode(
    root,
    resolved as SchemaNode,
    new Set(visited).add(node.$ref),
  )
}

function getNodeType(node: SchemaNode): {
  type: JsonFieldType
  nullable: boolean
} {
  const unionCases = node.anyOf ?? node.oneOf ?? []
  const types = [
    ...(Array.isArray(node.type) ? node.type : node.type ? [node.type] : []),
    ...unionCases.flatMap((item) =>
      Array.isArray(item.type) ? item.type : item.type ? [item.type] : [],
    ),
  ]
  const nonNullTypes = types.filter((type) => type !== 'null')
  const rawType = nonNullTypes.length === 1 ? nonNullTypes[0] : undefined
  const type: JsonFieldType =
    rawType === 'integer' || rawType === 'number'
      ? 'number'
      : rawType === 'string' ||
          rawType === 'boolean' ||
          rawType === 'array' ||
          rawType === 'object'
        ? rawType
        : types.length === 1 && types[0] === 'null'
          ? 'null'
          : 'unknown'
  return { type, nullable: types.includes('null') }
}

export function projectJsonSchemaToContract(
  jsonSchema: JsonSchema,
): JsonContract {
  const fields: Array<JsonContractField> = []
  const rootNode = resolveNode(jsonSchema, jsonSchema)

  function walk(
    nodeInput: SchemaNode,
    path: string,
    pointer: string,
    required: boolean,
  ) {
    const node = resolveNode(jsonSchema, nodeInput)
    if (path) {
      const { type, nullable } = getNodeType(node)
      fields.push({
        path,
        schemaPointer: pointer,
        type,
        required,
        nullable,
        enumValues: Array.isArray(node.enum)
          ? node.enum.filter(
              (value): value is string => typeof value === 'string',
            )
          : undefined,
        description: node.description,
      })
    }

    if (node.properties) {
      const requiredFields = new Set(node.required ?? [])
      for (const [key, child] of Object.entries(node.properties)) {
        walk(
          child,
          path ? `${path}.${key}` : key,
          `${pointer}/${escapeJsonPointerSegment(key)}`,
          requiredFields.has(key),
        )
      }
    }

    const items = Array.isArray(node.items) ? node.items[0] : node.items
    if (items) walk(items, `${path}[]`, `${pointer}/*`, true)
  }

  walk(rootNode, '', '', true)
  return {
    version: 1,
    fields: fields.sort((a, b) => a.path.localeCompare(b.path)),
  }
}

type LocatedNode = {
  node: SchemaNode
  parent?: SchemaNode
  propertyName?: string
}

function findFieldNode(
  root: JsonSchema,
  pointer: string,
): LocatedNode | undefined {
  const segments = pointer
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map(unescapeJsonPointerSegment)
  let node = resolveNode(root, root)
  let parent: SchemaNode | undefined
  let propertyName: string | undefined

  for (const segment of segments) {
    if (segment === '*') {
      const child = Array.isArray(node.items) ? node.items[0] : node.items
      if (!child) return undefined
      parent = undefined
      propertyName = undefined
      node = resolveNode(root, child)
    } else {
      propertyName = segment
      parent = node
      const child = node.properties?.[propertyName]
      if (!child) return undefined
      node = resolveNode(root, child)
    }
  }

  return { node, parent, propertyName }
}

function applyOverride(
  root: JsonSchema,
  override: ContractFieldOverride,
): boolean {
  const located = findFieldNode(root, override.pointer)
  if (!located) return false
  const { node, parent, propertyName } = located

  if (override.required !== undefined && parent && propertyName) {
    const required = new Set(parent.required ?? [])
    if (override.required) required.add(propertyName)
    else required.delete(propertyName)
    parent.required = [...required].sort()
  }

  if (override.nullable !== undefined) {
    const unionKey = node.anyOf ? 'anyOf' : node.oneOf ? 'oneOf' : undefined
    if (unionKey) {
      const cases = node[unionKey] ?? []
      const withoutNull = cases.filter((item) => item.type !== 'null')
      node[unionKey] = override.nullable
        ? [...withoutNull, { type: 'null' }]
        : withoutNull
    } else {
      const current = Array.isArray(node.type)
        ? [...node.type]
        : node.type
          ? [node.type]
          : []
      const withoutNull = current.filter((type) => type !== 'null')
      node.type = override.nullable
        ? [...withoutNull, 'null']
        : withoutNull.length === 1
          ? withoutNull[0]
          : withoutNull
    }
  }
  if (override.enumValues !== undefined) node.enum = override.enumValues
  if (override.description !== undefined)
    node.description = override.description || undefined
  return true
}

export function applyContractOverrides(
  inferredSchema: JsonSchema,
  overrides: ContractOverrides,
): { jsonSchema: JsonSchema; overrides: ContractOverrides } {
  const jsonSchema = structuredClone(inferredSchema)
  const survivingOverrides = overrides.filter((override) =>
    applyOverride(jsonSchema, override),
  )
  return { jsonSchema, overrides: survivingOverrides }
}

export function validateExamplesAgainstSchema(
  examples: Array<JsonDocumentExample>,
  jsonSchema: JsonSchema,
): Array<SchemaValidationDiagnostic> {
  let validate: ValidateFunction
  try {
    assertLocalReferences(jsonSchema)
    validate = ajv.compile(jsonSchema)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Invalid JSON Schema',
    )
  }

  return examples.flatMap((example) => {
    const value = JSON.parse(example.data)
    if (validate(value)) return []
    return (validate.errors ?? []).map((error: ErrorObject) => {
      const missingProperty =
        error.keyword === 'required' && 'missingProperty' in error.params
          ? String(error.params.missingProperty)
          : undefined
      const unexpectedProperty =
        error.keyword === 'additionalProperties' &&
        'additionalProperty' in error.params
          ? String(error.params.additionalProperty)
          : undefined
      const instancePointer = unexpectedProperty
        ? `${error.instancePath}/${escapeJsonPointerSegment(unexpectedProperty)}`
        : error.instancePath
      const fieldPointer = missingProperty
        ? `${error.instancePath}/${escapeJsonPointerSegment(missingProperty)}`
        : error.instancePath
            .split('/')
            .map((segment) => (/^\d+$/.test(segment) ? '*' : segment))
            .join('/')
      const base: SchemaValidationDiagnosticBase = {
        exampleId: example.id,
        instancePointer,
        fieldPointer,
        rulePointer: error.schemaPath,
        message: '',
      }

      if (error.keyword === 'type' && 'type' in error.params) {
        const expected = String(error.params.type)
        return {
          ...base,
          code: 'typeMismatch',
          expected,
          message: `Expected ${expected}.`,
        }
      }
      if (error.keyword === 'enum' && 'allowedValues' in error.params) {
        return {
          ...base,
          code: 'enumMismatch',
          allowedValues: error.params.allowedValues as Array<unknown>,
          message: 'Use one of the allowed values.',
        }
      }
      if (missingProperty) {
        return {
          ...base,
          code: 'missingProperty',
          missingProperty,
          message: `Missing required property ${JSON.stringify(missingProperty)}.`,
        }
      }
      if (unexpectedProperty) {
        return {
          ...base,
          code: 'unexpectedProperty',
          unexpectedProperty,
          message: `Property ${JSON.stringify(unexpectedProperty)} is not allowed.`,
        }
      }
      return {
        ...base,
        code: 'constraintViolation',
        constraint: error.keyword,
        message: `Does not satisfy the ${error.keyword} constraint.`,
      }
    })
  })
}

export function getSchemaFieldPointer(
  jsonSchema: JsonSchema,
  path: string,
): string | undefined {
  const root = resolveNode(jsonSchema, jsonSchema)
  const parts = path.split('.').filter(Boolean)
  let node = root
  let pointer = ''
  for (const rawPart of parts) {
    const isArray = rawPart.endsWith('[]')
    const key = isArray ? rawPart.slice(0, -2) : rawPart
    const child = node.properties?.[key]
    if (!child) return undefined
    pointer += `/${escapeJsonPointerSegment(key)}`
    node = resolveNode(jsonSchema, child)
    if (isArray) {
      const items = Array.isArray(node.items) ? node.items[0] : node.items
      if (!items) return undefined
      pointer += '/*'
      node = resolveNode(jsonSchema, items)
    }
  }
  return pointer
}
