# Deployment

Pushing to `main` deploys everything: the **API** to Cloudflare Workers (free plan) and the **website** to GitHub Pages. Do the one-time setup below first. It works from a phone browser.

## 1. Cloudflare account (free, ~5 min)

1. Sign up at <https://dash.cloudflare.com/sign-up> and verify your email.
2. In the dashboard open **Workers & Pages** once. If asked, choose a **workers.dev subdomain** (this becomes part of your API address).
3. Copy your **Account ID** (Workers & Pages → right-hand side, or in the dashboard URL).
4. Create an **API token**: *My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template → Continue → Create Token*. Copy it now — it is shown once.

## 2. GitHub secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1.4 |
| `CLOUDFLARE_ACCOUNT_ID` | the Account ID from step 1.3 |
| `ADMIN_PASSWORD` | the admin password you want (long and unique) |
| `SESSION_SECRET` | 32+ random characters (use a password generator) |
| `RESEND_API_KEY` | *optional* — enables email (see below) |

## 3. GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

## 4. Deploy

Push to `main`, or open **Actions → Deploy → Run workflow**. The run:

1. type-checks and secret-scans the code,
2. deploys the API and sets its secrets,
3. builds the website against the API URL and publishes it,
4. smoke-tests API health, CORS and login protection.

Your site: `https://<owner>.github.io/<repo>/` · admin: `…/admin-boss` · log in with Admin ID `ranahub902` and your `ADMIN_PASSWORD`.

## Optional settings

Repository **Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Effect |
|---|---|
| `CUSTOM_DOMAIN` | Serve the site from your own domain root (also set it under Settings → Pages). |
| `API_URL` | Use a fixed API address instead of the auto-detected `workers.dev` URL. |

**Email (optional).** OTP codes (changing admin credentials) and new-lead alerts use [Resend](https://resend.com). Create a free key, add it as `RESEND_API_KEY`, and optionally set `MAIL_FROM` in `apps/worker/wrangler.toml` after verifying a domain. Without it everything else works; email features report "not configured".

## Moving existing data

Use **Admin → Backup → Restore** with a JSON backup file you exported earlier.

## Local development

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars    # then edit
npm run dev:api                                           # http://localhost:8787
VITE_API_URL=http://localhost:8787 npm run dev            # http://localhost:8080
```

## Rollback

Every deploy is a commit on `main`: revert the commit and push, or re-run an earlier workflow run. Database contents are not touched by redeploys; take a Backup before risky changes.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Deploy fails: *Missing secret* | Add the secret named in the error (step 2). |
| Deploy fails: *workers.dev subdomain* | Open Workers & Pages in Cloudflare once and register a subdomain (step 1.2), or set the `API_URL` variable. |
| Login says "not configured" | `ADMIN_PASSWORD` / `SESSION_SECRET` secret missing — re-run Deploy after adding them. |
| Site loads but data is empty | Check the *Smoke test* job; confirm CORS origin and `API_URL`. |
| "Too many login attempts" | Wait 15 minutes. |
