import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        resolve: {
          tsconfigPaths: true,
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/**/*.test.ts',
            'shared/**/*.test.ts',
            'convex/**/*.test.ts',
          ],
        },
      },
      {
        resolve: {
          tsconfigPaths: true,
        },
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup/dom.ts'],
        },
      },
    ],
  },
})
