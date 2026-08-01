import type { syntaxTree } from '@codemirror/language'

type JsonSyntaxTree = ReturnType<typeof syntaxTree>
type JsonSyntaxNode = JsonSyntaxTree['topNode']

export type JsonPathLocation = {
  path: string
  instancePointer: string
  schemaPointer: string
  from: number
  to: number
  anchor: number
  valueFrom: number
  valueTo: number
}

function escapeJsonPointerSegment(segment: string) {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1')
}

function decodePropertyName(
  source: string,
  node: JsonSyntaxNode,
): string | null {
  try {
    return JSON.parse(source.slice(node.from, node.to)) as string
  } catch {
    return null
  }
}

function valueChild(node: JsonSyntaxNode): JsonSyntaxNode | null {
  let child = node.firstChild
  while (child) {
    if (
      child.name !== 'PropertyName' &&
      child.name !== ':' &&
      child.name !== ','
    ) {
      return child
    }
    child = child.nextSibling
  }
  return null
}

function hasSyntaxError(node: JsonSyntaxNode): boolean {
  if (node.type.isError) return true
  let child = node.firstChild
  while (child) {
    if (hasSyntaxError(child)) return true
    child = child.nextSibling
  }
  return false
}

function collectFromValue(
  source: string,
  node: JsonSyntaxNode,
  path: string,
  instancePointer: string,
  schemaPointer: string,
  locations: Array<JsonPathLocation>,
) {
  if (node.name === 'Object') {
    let child = node.firstChild
    while (child) {
      if (child.name === 'Property') {
        const propertyName = child.getChild('PropertyName')
        const value = valueChild(child)
        const segment = propertyName
          ? decodePropertyName(source, propertyName)
          : null

        if (propertyName && value && segment !== null) {
          const propertyPath = path ? `${path}.${segment}` : segment
          const propertyPointer = `${instancePointer}/${escapeJsonPointerSegment(segment)}`
          const propertySchemaPointer = `${schemaPointer}/${escapeJsonPointerSegment(segment)}`
          locations.push({
            path: propertyPath,
            instancePointer: propertyPointer,
            schemaPointer: propertySchemaPointer,
            from: child.from,
            to: child.to,
            anchor: propertyName.from,
            valueFrom: value.from,
            valueTo: value.to,
          })
          collectFromValue(
            source,
            value,
            propertyPath,
            propertyPointer,
            propertySchemaPointer,
            locations,
          )
        }
      }
      child = child.nextSibling
    }
    return
  }

  if (node.name === 'Array') {
    const itemPath = `${path}[]`
    let index = 0
    let child = node.firstChild
    while (child) {
      if (child.name !== '[' && child.name !== ']' && child.name !== ',') {
        const itemPointer = `${instancePointer}/${index}`
        const itemSchemaPointer = `${schemaPointer}/*`
        locations.push({
          path: itemPath,
          instancePointer: itemPointer,
          schemaPointer: itemSchemaPointer,
          from: child.from,
          to: child.to,
          anchor: child.from,
          valueFrom: child.from,
          valueTo: child.to,
        })
        collectFromValue(
          source,
          child,
          itemPath,
          itemPointer,
          itemSchemaPointer,
          locations,
        )
        index += 1
      }
      child = child.nextSibling
    }
  }
}

export function getJsonPathLocationsFromTree(
  source: string,
  tree: JsonSyntaxTree,
): Array<JsonPathLocation> {
  if (hasSyntaxError(tree.topNode)) return []

  const locations: Array<JsonPathLocation> = []
  collectFromValue(
    source,
    tree.topNode.firstChild ?? tree.topNode,
    '',
    '',
    '',
    locations,
  )
  return locations
}

export function findJsonPathAtPosition(
  locations: Array<JsonPathLocation>,
  position: number,
): string | undefined {
  return findJsonLocationAtPosition(locations, position)?.path
}

export function findJsonLocationAtPosition(
  locations: Array<JsonPathLocation>,
  position: number,
): JsonPathLocation | undefined {
  return locations
    .filter((location) => location.from <= position && position <= location.to)
    .sort((left, right) => right.path.length - left.path.length)[0]
}

export function findJsonPathLocation(
  locations: Array<JsonPathLocation>,
  path: string,
): JsonPathLocation | undefined {
  return locations.find((location) => location.path === path)
}

export function findJsonPointerLocation(
  locations: Array<JsonPathLocation>,
  instancePointer: string,
): JsonPathLocation | undefined {
  return locations.find(
    (location) => location.instancePointer === instancePointer,
  )
}

export function findJsonSchemaPointerLocation(
  locations: Array<JsonPathLocation>,
  schemaPointer: string,
): JsonPathLocation | undefined {
  return locations.find((location) => location.schemaPointer === schemaPointer)
}
