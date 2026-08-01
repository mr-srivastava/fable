import { snippetCompletion } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import {
  escapeJsonPointerSegment,
  unescapeJsonPointerSegment,
} from '@shared/json-schema'
import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete'
import type { JsonContractField } from '@shared/document'

type SyntaxNode = ReturnType<typeof syntaxTree>['topNode']

function decodePropertyName(source: string, property: SyntaxNode) {
  const name = property.getChild('PropertyName')
  if (!name) return undefined
  try {
    return JSON.parse(source.slice(name.from, name.to)) as string
  } catch {
    return undefined
  }
}

function ancestor(node: SyntaxNode, name: string) {
  let current: SyntaxNode | null = node
  while (current && current.name !== name) current = current.parent
  return current
}

function objectSchemaPointer(source: string, object: SyntaxNode) {
  const segments: Array<string> = []
  let current: SyntaxNode | null = object
  let arrayDepth = 0

  while (current.parent) {
    if (current.parent.name === 'Property') {
      const name = decodePropertyName(source, current.parent)
      if (name !== undefined) {
        segments.unshift(
          escapeJsonPointerSegment(name),
          ...Array.from({ length: arrayDepth }, () => '*'),
        )
        arrayDepth = 0
      }
    } else if (current.parent.name === 'Array') {
      arrayDepth += 1
    }
    current = current.parent
  }

  return segments.length ? `/${segments.join('/')}` : ''
}

function directChildFields(
  fields: ReadonlyArray<JsonContractField>,
  objectPointer: string,
) {
  const prefix = `${objectPointer}/`
  return fields.filter((field) => {
    const pointer = field.schemaPointer
    if (!pointer?.startsWith(prefix) || pointer === objectPointer) return false
    const remainder = pointer.slice(prefix.length)
    return !remainder.includes('/') && remainder !== '*'
  })
}

function fieldName(field: JsonContractField) {
  const segment = field.schemaPointer?.split('/').at(-1)
  return segment ? unescapeJsonPointerSegment(segment) : field.path
}

function propertySnippet(field: JsonContractField) {
  const name = JSON.stringify(fieldName(field))
  switch (field.type) {
    case 'string':
      return `${name}: "\${}"`
    case 'number':
      return `${name}: \${0}`
    case 'boolean':
      return `${name}: \${false}`
    case 'array':
      return `${name}: [\n\t\${}\n]`
    case 'object':
      return `${name}: {\n\t\${}\n}`
    case 'null':
    case 'unknown':
      return `${name}: null`
  }
}

function propertyCompletions(
  context: CompletionContext,
  source: string,
  fields: ReadonlyArray<JsonContractField>,
  node: SyntaxNode,
): CompletionResult | null {
  const object = ancestor(node, 'Object')
  if (!object) return null
  const partial = context.matchBefore(/"[^"\n]*$/)
  if (!partial && !context.explicit) return null

  const existing = new Set<string>()
  let child = object.firstChild
  while (child) {
    if (child.name === 'Property') {
      const name = decodePropertyName(source, child)
      if (name !== undefined) existing.add(name)
    }
    child = child.nextSibling
  }

  const options = directChildFields(fields, objectSchemaPointer(source, object))
    .filter((field) => !existing.has(fieldName(field)))
    .map((field) =>
      snippetCompletion(propertySnippet(field), {
        label: fieldName(field),
        detail: `${field.type}${field.required ? ' · required' : ''}`,
        info: field.description,
        type: 'property',
      }),
    )

  if (options.length === 0) return null
  return {
    from: partial?.from ?? context.pos,
    options,
    validFor: /^"?[^"\n]*$/,
  }
}

function enumCompletions(
  context: CompletionContext,
  source: string,
  fields: ReadonlyArray<JsonContractField>,
  node: SyntaxNode,
): CompletionResult | null {
  const property = ancestor(node, 'Property')
  const object = property?.parent
  if (!property || object?.name !== 'Object') return null
  const name = decodePropertyName(source, property)
  if (name === undefined) return null
  const objectPointer = objectSchemaPointer(source, object)
  const pointer = `${objectPointer}/${escapeJsonPointerSegment(name)}`
  const field = fields.find((candidate) => candidate.schemaPointer === pointer)
  if (!field?.enumValues?.length) return null

  const propertyText = source.slice(property.from, context.pos)
  const valueMatch = /:\s*("?[^"\s,}]*)$/.exec(propertyText)
  if (!valueMatch) return null
  const from =
    property.from + valueMatch.index + valueMatch[0].indexOf(valueMatch[1])
  const options: Array<Completion> = field.enumValues.map((value) => ({
    label: JSON.stringify(value),
    apply: JSON.stringify(value),
    detail: 'Allowed value',
    type: 'enum',
  }))

  return { from, options, validFor: /^"?[^"\s,}]*$/ }
}

export function createContractCompletionSource(
  fields: ReadonlyArray<JsonContractField>,
): CompletionSource {
  return (context) => {
    if (fields.length === 0) return null
    const source = context.state.doc.toString()
    const tree = syntaxTree(context.state)
    const node = tree.resolve(context.pos, -1)

    return (
      enumCompletions(context, source, fields, node) ??
      propertyCompletions(context, source, fields, node)
    )
  }
}
