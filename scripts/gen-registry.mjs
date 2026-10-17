#!/usr/bin/env node
/** Regenerates apps/worker/src/registry.ts from the files in apps/web/src/api. */
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../apps/web/src/api/', import.meta.url));
const out = fileURLToPath(new URL('../apps/worker/src/registry.ts', import.meta.url));
const names = readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3)).sort();

const lines = [
  '// Generated list of API endpoints (one file per endpoint in apps/web/src/api).',
  '// Run `node scripts/gen-registry.mjs` after adding or removing an endpoint.',
  "import type { EndpointConfig } from './runtime/backend';",
  '',
  ...names.map((n) => `import ${n} from '../../web/src/api/${n}';`),
  '',
  '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
  'export const ENDPOINTS: Record<string, EndpointConfig<any, any, any>> = {',
  ...names.map((n) => `  ${n},`),
  '};',
  '',
];
writeFileSync(out, lines.join('\n'));
console.log(`registry: ${names.length} endpoints`);
