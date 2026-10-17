#!/usr/bin/env node
/**
 * Production build of the website for static hosting (GitHub Pages or any static host).
 *
 * Environment:
 *   API_URL            (required) base URL of the EarningHub API, e.g. https://earninghub-api.<account>.workers.dev
 *   CUSTOM_DOMAIN      e.g. "earninghub.in"  -> served from the domain root, writes dist/CNAME
 *   PAGES_BASE_PATH    explicit base path, e.g. "/Earninghub/" (overrides auto-detection)
 *   GITHUB_REPOSITORY  "owner/Repo" (set automatically in GitHub Actions) -> base "/Repo/"
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'apps', 'web', 'dist');

const apiUrl = (process.env.API_URL || '').trim().replace(/\/+$/, '');
if (!/^https?:\/\//.test(apiUrl)) {
  console.error('✖ API_URL is required (e.g. https://earninghub-api.<account>.workers.dev)');
  process.exit(1);
}

const customDomain = (process.env.CUSTOM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const repoName = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || '';
let base = process.env.PAGES_BASE_PATH || (customDomain ? '/' : repoName ? `/${repoName}/` : '/');
if (!base.startsWith('/')) base = `/${base}`;
if (!base.endsWith('/')) base = `${base}/`;

console.log(`▶ Building website\n  base path : ${base}\n  API       : ${apiUrl}\n  domain    : ${customDomain || '(github.io project site)'}\n`);

const build = spawnSync('npm', ['run', 'build', '-w', '@earninghub/web'], {
  cwd: root,
  env: { ...process.env, VITE_BASE_PATH: base, VITE_API_URL: apiUrl },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (build.status !== 0) process.exit(build.status ?? 1);

if (!existsSync(join(dist, 'index.html'))) { console.error('✖ dist/index.html missing — build failed'); process.exit(1); }
// SPA deep links on a static host: unknown paths fall back to the app shell.
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
if (customDomain) writeFileSync(join(dist, 'CNAME'), `${customDomain}\n`);

// Safety net: never publish a bundle that contains something credential-shaped.
const patterns = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{30,}/, 'GitHub fine-grained token'],
  [/re_[A-Za-z0-9]{20,}_[A-Za-z0-9]{10,}/, 'Resend API key'],
  [/ADMIN_PASSWORD\s*[:=]\s*['"][^'"]+['"]/, 'hardcoded admin password'],
];
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dist);
const hits = [];
for (const f of files) {
  if (!/\.(js|css|html|json|txt)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const [re, label] of patterns) if (re.test(text)) hits.push(`${label} in ${f.replace(dist, 'dist')}`);
}
if (hits.length) { console.error('✖ Secret scan failed:\n  - ' + hits.join('\n  - ')); process.exit(1); }

const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`\n✔ Build ready: ${files.length} files, ${(bytes / 1048576).toFixed(2)} MB → apps/web/dist`);
console.log('✔ Secret scan passed');
