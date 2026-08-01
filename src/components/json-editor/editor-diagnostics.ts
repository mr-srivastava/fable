import { syntaxTree } from '@codemirror/language'
import {
  findJsonPointerLocation,
  getJsonPathLocationsFromTree,
} from './json-path-locations'
import type { Diagnostic } from '@codemirror/lint'
import type { EditorState } from '@codemirror/state'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'

function diagnosticMessage(diagnostic: SchemaValidationDiagnostic) {
  const location = diagnostic.instancePointer || 'root'
  return `${location}: ${diagnostic.message}`
}

export function getSchemaEditorDiagnostics(
  state: EditorState,
  diagnostics: ReadonlyArray<SchemaValidationDiagnostic>,
): Array<Diagnostic> {
  const source = state.doc.toString()
  const locations = getJsonPathLocationsFromTree(source, syntaxTree(state))

  return diagnostics.map((diagnostic) => {
    const location = findJsonPointerLocation(
      locations,
      diagnostic.instancePointer,
    )

    const actions = (
      diagnostic.code === 'enumMismatch' ? diagnostic.allowedValues : undefined
    )
      ?.filter(
        (value) =>
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean',
      )
      .slice(0, 5)
      .map((value) => ({
        name: `Use ${JSON.stringify(value)}`,
        apply(
          view: Parameters<
            NonNullable<Diagnostic['actions']>[number]['apply']
          >[0],
          from: number,
          to: number,
        ) {
          view.dispatch({
            changes: { from, to, insert: JSON.stringify(value) },
          })
        },
      }))

    return {
      from: location?.valueFrom ?? 0,
      to: location?.valueTo ?? Math.min(source.length, 1),
      severity: 'error',
      source: 'Contract',
      message: diagnosticMessage(diagnostic),
      actions,
    }
  })
}
