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

function buildTheme(isDark: boolean): Extension {
  const bg = readCssVar('--card', isDark ? '#2a2a28' : '#f7f7f5')
  const fg = readCssVar('--foreground', isDark ? '#ececec' : '#2a2a2a')
  const border = readCssVar('--border', isDark ? '#444' : '#ddd')
  const primary = readCssVar('--primary', isDark ? '#5eb8d4' : '#2a7a8f')
  const muted = readCssVar('--muted-foreground', isDark ? '#999' : '#666')
  const syntaxProperty = readCssVar(
    '--syntax-property',
    isDark ? '#72d5e8' : '#08758a',
  )
  const syntaxString = readCssVar(
    '--syntax-string',
    isDark ? '#85d69a' : '#287a3d',
  )
  const syntaxNumber = readCssVar(
    '--syntax-number',
    isDark ? '#e9bd72' : '#9a5b13',
  )
  const syntaxBoolean = readCssVar(
    '--syntax-boolean',
    isDark ? '#c3a6ee' : '#7047a3',
  )
  const syntaxNull = readCssVar('--syntax-null', isDark ? '#a9adb7' : '#626773')
  const destructive = readCssVar('--destructive', isDark ? '#e57373' : '#c33')

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
            backgroundColor: `${primary}33`,
          },
        '.cm-activeLine': {
          backgroundColor: `${muted}15`,
        },
        '.cm-gutters': {
          backgroundColor: bg,
          color: muted,
          borderRight: `1px solid ${border}`,
        },
        '.cm-activeLineGutter': {
          backgroundColor: `${muted}10`,
        },
        '.cm-lineNumbers .cm-gutterElement': {
          color: muted,
        },
        '.cm-matchingBracket, .cm-nonmatchingBracket': {
          backgroundColor: `${primary}22`,
        },
      },
      { dark: isDark },
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

let lightCache: Extension | null = null
let darkCache: Extension | null = null

export function getFableCodeMirrorTheme(isDark: boolean): Extension {
  if (isDark) {
    darkCache ??= buildTheme(true)
    return darkCache
  }
  lightCache ??= buildTheme(false)
  return lightCache
}

/** Call when theme toggles so CSS variable reads refresh. */
export function invalidateFableCodeMirrorThemeCache() {
  lightCache = null
  darkCache = null
}
