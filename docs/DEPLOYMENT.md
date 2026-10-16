# Deployment

## 1. One-time GitHub setup

1. **Settings → Pages → Build and deployment → Source: _GitHub Actions_.**
2. Push to `main`. The *Deploy to GitHub Pages* workflow builds, scans and publishes the site.
3. The site is served at `https://<owner>.github.io/<repo>/` (for this repository: `https://class902.github.io/Earninghub/`).

## 2. Backend configuration (Zite)

The static site calls the published Zite app. In the Zite project:

- Set the environment variable **`ZITE_ADMIN_PASSWORD`** to a long random value. Admin endpoints reject all requests until it is set.
- Keep the app published so `https://workflows.zite.com/public/<flow-id>/api/*` answers (the flow id is in `apps/earning-hub-web-10/zite.config.json`).

After each deploy the workflow runs a **non-blocking backend reachability check** (`scripts/check-backend.mjs`). A warning annotation means browsers on the hosted site cannot reach the backend (for example, no CORS header for your origin) — fix that on the Zite side or use a custom domain that Zite allows.

## 3. Optional repository variables

*Settings → Secrets and variables → Actions → Variables*

| Variable | Effect |
|---|---|
| `CUSTOM_DOMAIN` | Serves the site from the domain root (e.g. `earninghub.in`) and writes `CNAME`. Also set the domain under Settings → Pages. |
| `ZITE_RUNNER_URL` | Override the backend runner origin (default `https://workflows.zite.com`). |
| `ZITE_RUNTIME_URL` | Override the Zite runtime script injected into `<head>`. |

Variables are public build inputs — **never put secrets in them**.

## 4. Local development

```bash
nvm use            # Node 22 (see .nvmrc)
npm ci
npm run dev        # http://localhost:8080
npm run typecheck
npm run build:pages
```

`npm run build:pages` mirrors the production build, including the 404 fallback and the secret scan. Preview the output with `npm run preview`.

## 5. Rollback

Every deploy is a commit on `main`. To roll back, revert the commit and push, or re-run an earlier *Deploy to GitHub Pages* workflow run from the Actions tab.
