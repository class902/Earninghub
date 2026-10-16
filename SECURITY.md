# Security policy

## Reporting a vulnerability

Please report security issues **privately** through GitHub: *Security → Report a vulnerability* on this repository. Do not open a public issue or include credentials, OTPs or personal data in a report.

## Secrets

- No credentials belong in this repository. CI runs `scripts/scan-secrets.mjs` on every push and pull request, and the production build refuses to publish a bundle that contains token-like strings.
- The admin password is configured only through the server-side `ZITE_ADMIN_PASSWORD` environment variable. Admin endpoints fail closed when it is missing.
- If a credential is ever committed, treat it as compromised: rotate it first, then remove it from the code.

## Supported versions

Only the latest commit on `main` is supported.
