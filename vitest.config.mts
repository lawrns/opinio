import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Resolve the `@/` path alias from tsconfig so route handlers can be tested.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // End-to-end suites run separately with `pnpm test:e2e`.
  test: { exclude: [...configDefaults.exclude, 'src/**/*.e2e.test.ts'] },
});
