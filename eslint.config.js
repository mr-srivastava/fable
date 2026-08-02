//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      '.output/**',
      'dist/**',
      'convex/_generated/**',
      'src/routeTree.gen.ts',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  ...tanstackConfig,
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/document-editor-machine',
              message:
                'Presentation modules consume the document editor through model/commands, not the XState machine.',
            },
          ],
          patterns: [
            {
              group: ['convex', 'convex/*'],
              message:
                'Keep Convex calls in routes and integrations; presentation modules stay persistence-free.',
            },
            {
              group: ['@xstate/*', 'xstate', 'xstate/*'],
              message:
                'Presentation modules consume the document editor through model/commands, not XState.',
            },
          ],
        },
      ],
    },
  },
]
