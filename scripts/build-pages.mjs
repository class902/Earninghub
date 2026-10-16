#!/usr/bin/env node
/**
 * Production build for static hosting (GitHub Pages or any static host).
 *
 * Environment (all optional):
 *   CUSTOM_DOMAIN        e.g. "earninghub.in"  -> served from the domain root, writes dist/CNAME
 *   PAGES_BASE_PATH      explicit base path, e.g. "/Earninghub/" (overrides auto-detection)
 *   GITHUB_REPOSITORY    "owner/Repo" (set automatically in GitHub Actions) -> base "/Repo/"
 *   ZITE_RUNNER_URL      backend runner origin (default https://workflows.zite.com)
 *   ZITE_RUNTIME_URL     override for the Zite app-runtime script injected into <head>
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const appDir = join(root, 'apps', 'earning-hub-web-10');
const dist = join(appDir, 'dist');

const customDomain = (process.env.CUSTOM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const repoName = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || '';

let base = process.env.PAGES_BASE_PATH || (customDomain ? '/' : repoName ? `/${repoName}/` : '/');
if (!base.startsWith('/')) base = `/${base}`;
if (!base.endsWith('/')) base = `${base}/`;

const runner = (process.env.ZITE_RUNNER_URL || 'https://workflows.zite.com').replace(/\/+$/, '');

const env = {
  ...process.env,
  VITE_BASE_PATH: base,
  VITE_ZITE_RUNNER_URL: runner,
  VITE_ZITE_ENV: 'production',
};
if (process.env.ZITE_RUNTIME_URL) env.VITE_APP_RUNTIME_URL = process.env.ZITE_RUNTIME_URL;

console.log(`▶ Building for static hosting\n  base path : ${base}\n  backend   : ${runner}\n  domain    : ${customDomain || '(github.io project site)'}\n`);

const build = spawnSync('npm', ['run', 'build', '-w', '@project/earning-hub-web-10'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
if (build.status !== 0) process.exit(build.status ?? 1);

// ── Post-processing ────────────────────────────────────────────────────────
if (!existsSync(join(dist, 'index.html'))) {
  console.error('✖ dist/index.html missing — build failed'); process.exit(1);
}
// SPA deep-link support on static hosts: unknown paths fall back to the app shell.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
// Disable Jekyll processing so files/folders starting with "_" are served.
writeFileSync(join(dist, '.nojekyll'), '');
if (customDomain) writeFileSync(join(dist, 'CNAME'), `${customDomain}\n`);

// ── Safety net: refuse to publish anything that looks like a credential ──
const patterns = [
  [/zitejwt_[A-Za-z0-9._-]{20,}/, 'Zite JWT token'],
  [/VITE_ZITE_DB_TOKEN/, 'VITE_ZITE_DB_TOKEN reference'],
  [/ZITE_ADMIN_PASSWORD\s*[:=]\s*['"][^'"]+['"]/, 'hardcoded admin password'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/sk_live_[0-9A-Za-z]{16,}/, 'Stripe live secret key'],
];
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dist);
const hits = [];
for (const f of files) {
  if (!/\.(js|css|html|json|txt|map)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const [re, label] of patterns) if (re.test(text)) hits.push(`${label} in ${f.replace(dist, 'dist')}`);
}
if (hits.length) { console.error('✖ Secret scan failed:\n  - ' + hits.join('\n  - ')); process.exit(1); }

const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`\n✔ Build ready: ${files.length} files, ${(bytes / 1048576).toFixed(2)} MB → apps/earning-hub-web-10/dist`);
console.log('✔ Secret scan passed');
