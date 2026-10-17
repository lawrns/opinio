import { buildApp } from './harness';

/** Builds the app once per `pnpm test:e2e` run; suites then reuse `.next-e2e`. */
export default function setup() {
  buildApp('.next-e2e');
  process.env.OPINIO_E2E_SKIP_BUILD = '1';
}
