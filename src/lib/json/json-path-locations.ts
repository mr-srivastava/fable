import { jsonLanguage } from '@codemirror/lang-json'

type JsonSyntaxTree = ReturnType<typeof jsonLanguage.parser.parse>
type JsonSyntaxNode = JsonSyntaxTree['topNode']

export type JsonPathLocation = {
  path: string
  from: number
  to: number
  anchor: number
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
          locations.push({
            path: propertyPath,
            from: child.from,
            to: child.to,
            anchor: propertyName.from,
          })
          collectFromValue(source, value, propertyPath, locations)
        }
      }
      child = child.nextSibling
    }
    return
  }

  if (node.name === 'Array') {
    const itemPath = `${path}[]`
    let child = node.firstChild
    while (child) {
      if (child.name !== '[' && child.name !== ']' && child.name !== ',') {
        locations.push({
          path: itemPath,
          from: child.from,
          to: child.to,
          anchor: child.from,
        })
        collectFromValue(source, child, itemPath, locations)
      }
      child = child.nextSibling
    }
  }
}

export function getJsonPathLocations(source: string): Array<JsonPathLocation> {
  const tree = jsonLanguage.parser.parse(source)
  if (hasSyntaxError(tree.topNode)) return []

  const locations: Array<JsonPathLocation> = []
  collectFromValue(
    source,
    tree.topNode.firstChild ?? tree.topNode,
    '',
    locations,
  )
  return locations
}

export function findJsonPathAtPosition(
  locations: Array<JsonPathLocation>,
  position: number,
): string | undefined {
  return locations
    .filter((location) => location.from <= position && position <= location.to)
    .sort((left, right) => right.path.length - left.path.length)[0]?.path
}

export function findJsonPathLocation(
  locations: Array<JsonPathLocation>,
  path: string,
): JsonPathLocation | undefined {
  return locations.find((location) => location.path === path)
}
