import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load .env.local (Next.js convention) so DATABASE_URL etc. are available
  // in test environments (vitest doesn't auto-load .env.local like Next.js does)
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      env,
      // Exclude Playwright E2E specs — those are run by `playwright test`, not vitest
      exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/e2e/**'],
      // Integration tests hit the live Neon DB — cold connection can be slow
      testTimeout: 15000,
      server: {
        deps: {
          // Prevent Vitest module isolation from breaking Prisma v7's
          // dynamically-generated PrismaClient class (getPrismaClientClass).
          // Without this, vi.mock() scoping causes "Invalid invocation" errors.
          inline: [/lib\/generated\/prisma/, /\.prisma\/client/],
        },
      },
      coverage: {
        provider: 'v8',
        // Scope coverage to pure-logic files exercised by unit + integration tests.
        // UI pages/components (app/**, components/**) are verified by Playwright E2E.
        // External-service adapters and data-only constants are excluded from the
        // automated threshold to avoid requiring live Redis/Resend/Next.js mocks.
        include: [
          'lib/state-machine/**',
          'lib/validations/**',
          'lib/auth-utils.ts',
          'lib/utils.ts',
        ],
        exclude: [
          'lib/generated/**',
          'node_modules/**',
          // idea.ts belongs to Epic-03 and is not exercised by this epic's test suite
          'lib/validations/idea.ts',
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
  }
})
