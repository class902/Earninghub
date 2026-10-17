#!/usr/bin/env node
/**
 * Post-deploy smoke test: can a browser on the hosted site reach the Zite backend?
 *
 *   node scripts/check-backend.mjs [--origin https://user.github.io] [--strict]
 *
 * Sends a CORS preflight and a real public API call (getOffers) with the site's
 * Origin header. Non-blocking by default (exit 0) so a hiccup never blocks a
 * deploy; pass --strict to exit 1 on failure.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const strict = process.argv.includes('--strict');
const cfg = JSON.parse(readFileSync(fileURLToPath(new URL('../apps/earning-hub-web-10/zite.config.json', import.meta.url)), 'utf8'));
const runner = (process.env.ZITE_RUNNER_URL || 'https://workflows.zite.com').replace(/\/+$/, '');
const origin = arg('--origin') || process.env.SITE_ORIGIN || 'https://class902.github.io';
const url = `${runner}/public/${cfg.id}/api/getOffers`;

const fail = (msg) => { console.log(`::warning title=Backend check::${msg}`); console.log(`✖ ${msg}`); process.exit(strict ? 1 : 0); };

// Admin login endpoint probe: a deliberately wrong credential must be rejected (HTTP 401).
// Confirms the auth endpoint is deployed and answering; never uses a real credential.
try {
  const r = await fetch(`${runner}/public/${cfg.id}/api/adminLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ inputs: { username: 'healthcheck', password: 'invalid-probe' }, mode: 'live' }),
  });
  const text = (await r.text()).replace(/\s+/g, ' ').slice(0, 200);
  const level = r.status === 401 ? 'notice' : 'warning';
  console.log(`::${level} title=adminLogin probe::HTTP ${r.status} ${text}`);
  console.log(`adminLogin : HTTP ${r.status} (expected 401 for a bad credential)`);
} catch (err) {
  console.log(`::warning title=adminLogin probe::${err.message}`);
}

try {
  const pre = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } });
  const allow = pre.headers.get('access-control-allow-origin');
  console.log(`preflight  : HTTP ${pre.status}  allow-origin=${allow ?? '(none)'}`);

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ inputs: {}, mode: 'live' }) });
  const allow2 = res.headers.get('access-control-allow-origin');
  console.log(`getOffers  : HTTP ${res.status}  allow-origin=${allow2 ?? '(none)'}`);
  if (!res.ok) fail(`Backend answered HTTP ${res.status}. Check the Zite app is published and the flow id in zite.config.json is correct.`);
  if (!allow && !allow2) fail(`Backend reachable but sends no CORS header for ${origin}; browsers on the hosted site will be blocked.`);
  const body = await res.json().catch(() => null);
  const n = Array.isArray(body?.offers) ? body.offers.length : '?';
  console.log(`✔ Backend reachable from ${origin} (offers returned: ${n})`);
} catch (err) {
  fail(`Could not reach ${url}: ${err.message}`);
}
