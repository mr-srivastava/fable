import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

function buildTheme(): Extension {
  const bg = readCssVar('--card', '#fafaf8')
  const fg = readCssVar('--foreground', '#2c2a26')
  const border = readCssVar('--border', '#d8d4cc')
  const primary = readCssVar('--primary', '#1a7a85')
  const muted = readCssVar('--muted-foreground', '#6b6560')
  const mutedSurface = readCssVar('--muted', '#edebe6')
  const syntaxProperty = readCssVar('--syntax-property', '#0d6b7a')
  const syntaxString = readCssVar('--syntax-string', '#2a6e3f')
  const syntaxNumber = readCssVar('--syntax-number', '#8a5a12')
  const syntaxBoolean = readCssVar('--syntax-boolean', '#6b4a9e')
  const syntaxNull = readCssVar('--syntax-null', '#6e6860')
  const destructive = readCssVar('--destructive', '#c33')

  return [
    EditorView.theme(
      {
        '&': {
          backgroundColor: bg,
          color: fg,
          fontSize: '13px',
        },
        '.cm-content': {
          caretColor: primary,
          fontFamily: 'var(--font-mono)',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: primary,
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
          {
            backgroundColor: `${primary}28`,
          },
        '.cm-activeLine': {
          backgroundColor: `${mutedSurface}`,
        },
        '.cm-gutters': {
          backgroundColor: bg,
          color: muted,
          borderRight: `1px solid ${border}`,
        },
        '.cm-activeLineGutter': {
          backgroundColor: mutedSurface,
        },
        '.cm-lineNumbers .cm-gutterElement': {
          color: muted,
        },
        '.cm-matchingBracket, .cm-nonmatchingBracket': {
          backgroundColor: `${primary}1f`,
        },
      },
      { dark: false },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: tags.propertyName, color: syntaxProperty },
        { tag: tags.string, color: syntaxString },
        { tag: tags.number, color: syntaxNumber },
        { tag: tags.bool, color: syntaxBoolean, fontWeight: '600' },
        { tag: tags.null, color: syntaxNull, fontStyle: 'italic' },
        { tag: tags.punctuation, color: muted },
        { tag: tags.invalid, color: destructive, textDecoration: 'underline' },
      ]),
    ),
  ]
}

let themeCache: Extension | null = null

export function getFableCodeMirrorTheme(): Extension {
  themeCache ??= buildTheme()
  return themeCache
}
