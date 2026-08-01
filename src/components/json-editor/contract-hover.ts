import { hoverTooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import {
  findJsonLocationAtPosition,
  getJsonPathLocationsFromTree,
} from './json-path-locations'
import type { JsonContractField } from '@shared/document'

function appendText(parent: HTMLElement, text: string, className: string) {
  const element = document.createElement('p')
  element.className = className
  element.textContent = text
  parent.append(element)
}

export function createContractHover(fields: ReadonlyArray<JsonContractField>) {
  if (fields.length === 0) return []
  const fieldsByPointer = new Map(
    fields.flatMap((field) =>
      field.schemaPointer ? [[field.schemaPointer, field] as const] : [],
    ),
  )

  return hoverTooltip((view, position) => {
    const source = view.state.doc.toString()
    const location = findJsonLocationAtPosition(
      getJsonPathLocationsFromTree(source, syntaxTree(view.state)),
      position,
    )
    const field = location
      ? fieldsByPointer.get(location.schemaPointer)
      : undefined
    if (!location || !field) return null

    return {
      pos: location.from,
      end: location.to,
      above: true,
      create() {
        const dom = document.createElement('div')
        dom.className = 'max-w-72 space-y-1 px-3 py-2 text-xs'
        appendText(dom, field.path, 'font-mono font-medium text-foreground')
        appendText(
          dom,
          [
            field.type,
            field.required ? 'required' : 'optional',
            field.nullable ? 'nullable' : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
          'text-muted-foreground',
        )
        if (field.description) {
          appendText(dom, field.description, 'text-foreground')
        }
        if (field.enumValues?.length) {
          appendText(
            dom,
            `Allowed: ${field.enumValues.map((value) => JSON.stringify(value)).join(', ')}`,
            'text-muted-foreground',
          )
        }
        return { dom }
      },
    }
  })
}
