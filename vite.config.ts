import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const IGNORED_NODE_MODULE_DIRECTIVES = new Set(['use client'])
const IGNORED_BUILD_WARNING_CODES = new Set([
  'EVAL',
  'CIRCULAR_DEPENDENCY',
  'THIS_IS_UNDEFINED',
  'EMPTY_BUNDLE',
])

type BuildWarning = {
  code?: string
  id?: string
  message: string
}

function isIgnoredNodeModuleDirectiveWarning(warning: BuildWarning) {
  return (
    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
    warning.id?.includes('/node_modules/') &&
    IGNORED_NODE_MODULE_DIRECTIVES.has(
      warning.message.match(/"([^"]+)"/)?.[1] ?? '',
    )
  )
}

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      onLog(level, warning, defaultHandler) {
        if (
          isIgnoredNodeModuleDirectiveWarning(warning) ||
          IGNORED_BUILD_WARNING_CODES.has(warning.code ?? '')
        ) {
          return
        }

        defaultHandler(level, warning)
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-codemirror',
              test: /node_modules[\\/](?:@codemirror|@lezer)[\\/]/,
            },
            {
              name: 'vendor-data',
              test: /node_modules[\\/](?:@tanstack|@convex-dev|convex)[\\/]/,
            },
            {
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ plugins: ['babel-plugin-react-compiler'] }),
  ],
})

export default config
