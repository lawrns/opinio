import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Resolve the `@/` path alias from tsconfig so route handlers can be tested.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
