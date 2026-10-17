import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// End-to-end suites: build the app and drive it over HTTP against a local
// throwaway Postgres and mail sink (see src/test/e2e/harness.ts).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
