#!/usr/bin/env node
/**
 * Lightweight secret scanner for tracked source files (CI guard).
 * Fails the build if a credential-looking value is committed.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const SKIP_DIR = new Set(['node_modules', 'dist', '.git']);
const SKIP_FILE = /(package-lock\.json|\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip))$/i;
const SELF = 'scripts/scan-secrets.mjs';

function listFiles() {
  try {
    return execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    const out = [];
    (function walk(d) {
      for (const f of readdirSync(d)) {
        if (SKIP_DIR.has(f)) continue;
        const p = join(d, f);
        statSync(p).isDirectory() ? walk(p) : out.push(relative(root, p));
      }
    })(root);
    return out;
  }
}

const rules = [
  [/zitejwt_[A-Za-z0-9._-]{20,}/, 'Zite JWT token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/sk_live_[0-9A-Za-z]{16,}/, 'Stripe live secret key'],
  [/xox[abprs]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/ZITE_ADMIN_PASSWORD\s*(\|\||\?\?)\s*['"`]/, 'hardcoded fallback for ZITE_ADMIN_PASSWORD'],
  [/\b(?:DEFAULT_)?(?:ADMIN_)?PASSWORD\s*=\s*['"`][^'"`\s]{6,}['"`]/, 'hardcoded password constant'],
];

const findings = [];
for (const file of listFiles()) {
  if (file === SELF || SKIP_FILE.test(file)) continue;
  let text;
  try { text = readFileSync(join(root, file), 'utf8'); } catch { continue; }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const [re, label] of rules) if (re.test(line)) findings.push(`${file}:${i + 1}  ${label}`);
  });
}

if (findings.length) {
  console.error(`✖ Possible secrets found (${findings.length}):\n  ` + findings.join('\n  '));
  process.exit(1);
}
console.log('✔ No secrets detected in tracked files');
