<div align="center">

# EarningHub

**Cashback offers, lead tracking and a full referral programme — with an admin console to run it.**

[![Deploy to GitHub Pages](https://github.com/class902/Earninghub/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/class902/Earninghub/actions/workflows/deploy-pages.yml)
[![CI](https://github.com/class902/Earninghub/actions/workflows/ci.yml/badge.svg)](https://github.com/class902/Earninghub/actions/workflows/ci.yml)

[Live site](https://class902.github.io/Earninghub/) · [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) · [Data model](docs/DATA_MODEL.md)

</div>

---

## What it does

| For visitors | For referrers | For the admin |
|---|---|---|
| Browse live cashback offers by category | Generate a personal referral link per offer | Create, order, expire and archive offers |
| Submit a lead through a configurable form | Share it and track clicks, leads and earnings | Review and update leads, remarks and payouts |
| Track a lead's status with a UPI ID | Follow every referral through cashback → reward → payment | Referral command centre: funnel, metrics, link lifecycle, audit trail |
| Use standalone cashback forms | | Analytics, reports, backups & restore, trash, UI builder, link health tester |

## Tech stack

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Radix UI / shadcn, TanStack Query, React Router, Framer Motion
- **Backend** — 70 typed endpoints (Zod-validated) and a 10-table database on the [Zite](https://zite.com) platform
- **Hosting** — static frontend on GitHub Pages, deployed by GitHub Actions; backend stays on Zite

## Quick start

```bash
git clone https://github.com/class902/Earninghub.git
cd Earninghub
nvm use            # Node 22
npm ci
npm run dev        # http://localhost:8080
```

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run typecheck` | TypeScript project check |
| `npm run build:pages` | Production build for static hosting (adds the SPA 404 fallback and runs the secret scan) |
| `npm run preview` | Preview the built site |
| `npm run check:backend` | Check that the hosted site can reach the backend |

## Deploying

Push to `main` — the **Deploy to GitHub Pages** workflow typechecks, scans for secrets, builds and publishes. First-time setup (Pages source, backend variable, optional custom domain) is in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Configuration

| Name | Where | Purpose |
|---|---|---|
| `ZITE_ADMIN_PASSWORD` | Zite project environment variable (**server-side**) | Required for every admin endpoint. The server refuses admin requests until it is set. |
| `CUSTOM_DOMAIN` | GitHub repository variable | Serve from a custom domain root |
| `ZITE_RUNNER_URL` | GitHub repository variable | Override the backend runner origin |

See [`.env.example`](.env.example). **Never commit credentials** — CI blocks it.

## Repository layout

```text
.
├── apps/earning-hub-web-10/    # React app + backend endpoints
│   ├── src/api/                #   70 endpoints (one file each)
│   ├── src/components/         #   UI, incl. admin/ panel
│   ├── src/pages/              #   routes
│   └── src/lib/                #   shared helpers (admin auth, base-path URLs, referral rules)
├── packages/components/        # shared shadcn/ui primitives
├── .zite/                      # generated typed DB client
├── scripts/                    # build, secret scan, backend smoke test
├── docs/                       # architecture, deployment, data model
└── .github/                    # CI, Pages deploy, templates, Dependabot
```

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability and the repository's secret-handling rules.

## License

Proprietary — © EarningHub. All rights reserved.
