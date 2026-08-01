import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const IGNORED_NODE_MODULE_DIRECTIVES = new Set(['use client'])
const IGNORED_NITRO_ROLLUP_WARNING_CODES = new Set([
  'EVAL',
  'CIRCULAR_DEPENDENCY',
  'THIS_IS_UNDEFINED',
  'EMPTY_BUNDLE',
])

function isIgnoredNodeModuleDirectiveWarning(warning: {
  code?: string
  id?: string
  message: string
}) {
  return (
    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
    warning.id?.includes('/node_modules/') &&
    IGNORED_NODE_MODULE_DIRECTIVES.has(
      warning.message.match(/"([^"]+)"/)?.[1] ?? '',
    )
  )
}

function getManualChunk(id: string): string | undefined {
  if (!id.includes('/node_modules/')) return undefined

  if (id.includes('/@codemirror/') || id.includes('/@lezer/')) {
    return 'vendor-codemirror'
  }

  if (
    id.includes('/@tanstack/') ||
    id.includes('/@convex-dev/') ||
    id.includes('/convex/')
  ) {
    return 'vendor-data'
  }

  if (
    id.includes('/node_modules/react/') ||
    id.includes('/node_modules/react-dom/')
  ) {
    return 'vendor-react'
  }

  return undefined
}

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          isIgnoredNodeModuleDirectiveWarning(warning) ||
          IGNORED_NITRO_ROLLUP_WARNING_CODES.has(warning.code ?? '')
        ) {
          return
        }

        warn(warning)
      },
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
  nitro: {
    rollupConfig: {
      onwarn(warning, warn) {
        if (isIgnoredNodeModuleDirectiveWarning(warning)) {
          return
        }

        warn(warning)
      },
    },
    hooks: {
      'rollup:before'(_nitro, rollupConfig) {
        const outputOptions = Array.isArray(rollupConfig.output)
          ? rollupConfig.output
          : [rollupConfig.output]

        for (const outputOption of outputOptions) {
          if (outputOption) {
            outputOption.manualChunks = undefined
          }
        }
      },
    },
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
})

export default config
