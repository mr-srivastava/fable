import type { JsonContractField } from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'

export type JsonEditorAssistance =
  | { status: 'unavailable' }
  | ({
      status: 'available'
      fields: ReadonlyArray<JsonContractField>
    } & (
      | {
          freshness: 'current'
          diagnostics: ReadonlyArray<SchemaValidationDiagnostic>
        }
      | { freshness: 'retained' }
    ))

export type JsonEditorPathCoordination = {
  activePointer?: string
  onActivePointerChange: (pointer?: string) => void
  onActivePointerPresenceChange: (present: boolean) => void
}

export type JsonEditorValidation =
  | { status: 'valid' }
  | { status: 'syntaxError' }
  | { status: 'externalError'; message: string }

export type JsonEditorProps = {
  value: string
  onChange: (value: string) => void
  validation: JsonEditorValidation
  size?: number
  height?: string
  placeholder?: string
  className?: string
  assistance: JsonEditorAssistance
  pathCoordination?: JsonEditorPathCoordination
}
