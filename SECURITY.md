# Security policy

## Reporting a vulnerability

Please report security issues **privately** through GitHub: *Security → Report a vulnerability* on this repository. Do not open a public issue or include credentials, session tokens or personal data in a report.

## Secrets

- No credentials belong in this repository. CI runs `scripts/scan-secrets.mjs` on every push and pull request, and the production build refuses to publish a bundle containing credential-shaped strings.
- Secrets (`ADMIN_PASSWORD`, `SESSION_SECRET`, `CLOUDFLARE_API_TOKEN`, optional `RESEND_API_KEY`) live only in GitHub Actions secrets and the Cloudflare Worker.
- Admin access fails closed: with no `ADMIN_PASSWORD` or `SESSION_SECRET` configured, every admin request is refused.
- If a credential is ever exposed, rotate it first (change the secret, redeploy), then investigate.

## Controls

- Admin sessions are HMAC-signed, expire after 12 hours and are verified server-side on every admin request.
- Login attempts are rate limited per IP; cross-origin access is limited to the configured website origin.
- Uploads accept images and PDFs only, are size limited and rate limited, and are served with a restrictive content-security policy.

## Supported versions

Only the latest commit on `main` is supported.
