import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**', 'lib/**', 'components/**', 'constants/**'],
      exclude: [
        'lib/generated/**',
        'node_modules/**',
        // Infrastructure: DB singleton and layout wrapper are not unit-testable in isolation
        'lib/db.ts',
        'app/layout.tsx',
        // shadcn generated component variants — not authored code
        'components/ui/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
