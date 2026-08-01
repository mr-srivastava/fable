import type {
  DocumentEditorCommands,
  DocumentEditorViewModel,
} from '@/lib/document-editor-model'
import type {
  JsonEditorAssistance,
  JsonEditorPathCoordination,
  JsonEditorValidation,
} from './json-editor/JsonEditor.types'

type EditorMode =
  | { type: 'create' }
  | {
      type: 'saved'
      documentUrl: string
      apiUrl: string
    }

export type JsonEditorPanelProps = {
  model: DocumentEditorViewModel
  commands: DocumentEditorCommands
  mode: EditorMode
  title?: string
  description?: string
}

export type JsonEditorPanelHeaderProps = Pick<
  JsonEditorPanelProps,
  'description' | 'title'
> & {
  mode: EditorMode['type']
}

export type DocumentEditorActionsProps = {
  mode: EditorMode
  model: DocumentEditorViewModel
  commands: Pick<
    DocumentEditorCommands,
    'generateTypeScript' | 'reset' | 'submit'
  >
}

export type JsonEditorGridProps = {
  value: string
  onChange: (value: string) => void
  validation: JsonEditorValidation
  size?: number
  assistance: JsonEditorAssistance
  pathCoordination: JsonEditorPathCoordination
}
