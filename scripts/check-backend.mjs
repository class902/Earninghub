#!/usr/bin/env node
/**
 * Post-deploy smoke test for the EarningHub API.
 *
 *   node scripts/check-backend.mjs --api https://… [--origin https://user.github.io] [--strict]
 *
 * Checks: health endpoint, CORS for the website origin, public data endpoint,
 * and that a deliberately wrong admin login is rejected with HTTP 401.
 * Writes GitHub Actions annotations; exits 1 on failure only with --strict.
 */
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const strict = process.argv.includes('--strict');
const api = (arg('--api') || process.env.API_URL || '').replace(/\/+$/, '');
const origin = arg('--origin') || process.env.SITE_ORIGIN || '';
if (!api) { console.error('Usage: check-backend.mjs --api <url> [--origin <url>] [--strict]'); process.exit(2); }

let failed = false;
const ok = (m) => console.log(`✔ ${m}`);
const bad = (m) => { failed = true; console.log(`::error title=API check::${m}`); console.log(`✖ ${m}`); };
const post = (name, inputs) => fetch(`${api}/api/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin && { Origin: origin }) }, body: JSON.stringify({ inputs }) });

try {
  const health = await fetch(`${api}/api/health`);
  health.ok ? ok(`health: HTTP ${health.status}`) : bad(`health endpoint returned HTTP ${health.status}`);

  if (origin) {
    const pre = await fetch(`${api}/api/getOffers`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
    const allow = pre.headers.get('access-control-allow-origin');
    allow === origin ? ok(`CORS allows ${origin}`) : bad(`CORS does not allow ${origin} (got "${allow ?? 'none'}") — set ALLOWED_ORIGINS`);
  }

  const offers = await post('getOffers', {});
  if (offers.ok) { const j = await offers.json(); ok(`getOffers: HTTP 200 (${Array.isArray(j.offers) ? j.offers.length : '?'} offers)`); }
  else bad(`getOffers returned HTTP ${offers.status}`);

  const login = await post('adminLogin', { username: 'healthcheck', password: 'invalid-probe' });
  login.status === 401 ? ok('adminLogin rejects bad credentials (401)') :
    login.status === 429 ? ok('adminLogin is rate limited (429)') :
    bad(`adminLogin probe expected 401, got HTTP ${login.status} — is ADMIN_PASSWORD / SESSION_SECRET configured?`);
} catch (err) {
  bad(`Could not reach ${api}: ${err.message}`);
}
process.exit(failed && strict ? 1 : 0);
