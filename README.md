# Mizan_FE

Web client for **[Mizan AI](https://heymizan.ai)** — the AI-native operating system for restaurants.

Managers and owners run the business from this SPA. Staff work primarily on **WhatsApp**. The in-app **Agent** (Miya) talks to Django companion (`POST /api/mastra/run/`); Django remains the source of truth.

```text
Browser (this app)
   │  JWT
   ▼
Django /api/*          → domain services → PostgreSQL
   │
   └── Agent panel ──► POST /api/mastra/run/ ──► Miya ──► /internal/v1/*
```

GitHub: **`Mizan-AI-Org/Mizan_FE`**. Production hosting is typically **Vercel** (see CI / org deploy).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Who can use the SPA](#who-can-use-the-spa)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Scripts](#scripts)
- [Routing, RBAC & Agent](#routing-rbac--agent)
- [Data layer](#data-layer)
- [Internationalization](#internationalization)
- [Build & deployment](#build--deployment)
- [Testing & quality](#testing--quality)
- [What must never be committed](#what-must-never-be-committed)
- [Troubleshooting](#troubleshooting)
- [Related repos](#related-repos)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Build | Vite 6 + `@vitejs/plugin-react-swc` |
| UI | React 18, TypeScript 5, Tailwind 3, Radix / shadcn patterns |
| Routing | `react-router-dom` |
| Data | TanStack Query v5, typed `src/lib/api.ts` |
| Forms | `react-hook-form` + Zod |
| Charts / maps | `recharts`, `react-leaflet` |
| DnD | `@dnd-kit/*` |
| i18n | `i18next` (en / fr / ar) |
| Push | Firebase Cloud Messaging (optional) |
| Errors | Sentry (`@sentry/react`) |
| Lint | ESLint 9 + typescript-eslint |

---

## Who can use the SPA

Aligned with Django `CustomUser.Role` and `src/lib/operationalCommandRoles.ts`:

| Roles | Web app | Web Agent (`miya-manager`) |
|-------|---------|----------------------------|
| SUPER_ADMIN, OWNER, ADMIN, MANAGER, SUPERVISOR | Yes | Yes |
| CHEF, WAITER, BARTENDER, STAFF, … | No (WhatsApp-only) | No |

**Agent parity roles** (must match WhatsApp behavior): SUPER_ADMIN, OWNER, ADMIN, MANAGER — see `AGENT_PARITY_ROLES`.

---

## Repository structure

```text
Mizan_FE/
├── public/
│   ├── locales/           # en.json, fr.json, ar.json
│   └── …                  # static assets / icons
├── src/
│   ├── main.tsx           # Providers + mount
│   ├── App.tsx            # Routes + guards
│   ├── pages/             # Route screens (Operations, Team, Financials, …)
│   ├── components/        # UI, layout, agent chat, domain widgets
│   ├── hooks/             # use-auth, permissions, …
│   ├── contexts/          # Auth, theme, language
│   ├── lib/               # api.ts, RBAC helpers, utils
│   ├── i18n/
│   ├── types/
│   └── …
├── scripts/               # i18n sync / audit, image optimize
├── index.html
├── vite.config.ts
├── package.json
├── .env.example
├── .github/workflows/     # frontend-ci
└── README.md
```

Notable product areas in `src/pages/`:

- **Operations:** Live Ops, Approvals, Incidents, Staff Checklists, Requests  
- **Team / scheduling / attendance**  
- **Products, inventory, purchasing, suppliers**  
- **Financials, intelligence, social, settings, platform admin**

---

## Prerequisites

- Node.js **20+** (CI uses 20)
- npm
- Running **Mizan_BE** on `:8000` (or a remote API via `VITE_BACKEND_URL`)

---

## Environment variables

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `VITE_BACKEND_URL` | Optional. Leave unset in dev to use Vite proxy → `localhost:8000` |
| `VITE_MASTRA_CHAT_ENABLED` | In-app Agent (`true` / `false`) |
| `VITE_FIREBASE_*` | FCM push (optional) |
| `VITE_SENTRY_DSN` | Browser Sentry (optional) |

**Never commit** `.env` or files with real Firebase / Sentry keys.

---

## Local development

```bash
npm ci
cp .env.example .env
npm run dev
```

Default Vite port is typically **8080** (see `vite.config.ts`). Ensure Django CORS / `FRONTEND_URL` allow that origin.

With BE + Agent running:

1. Log in as OWNER / MANAGER / ADMIN / SUPER_ADMIN  
2. Open Agent panel — messages go to `/api/mastra/run/`  
3. Dashboard data loads from `/api/*`

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run i18n:check` | Locale parity (CI) |
| `npm run i18n:sync` / `i18n:audit` / `i18n:keys` / `i18n:verify` | i18n maintenance |
| `npm run optimize:images` | Asset pipeline helper |

---

## Routing, RBAC & Agent

- Route guards use role helpers in `src/lib/operationalCommandRoles.ts` and permission hooks  
- Privileged settings / platform admin require SUPER_ADMIN / OWNER / ADMIN as coded  
- `AgentChatPanel` only mounts when `isWebAgentRole(user.role)`  
- Agent confirm flow: draft preview in chat → user says yes → Django executes (same as WhatsApp)

Operations Live defaults to **All** dates (calendar from/to optional). Staff Checklists share that date UX.

---

## Data layer

- Primary client: `src/lib/api.ts` (Bearer JWT, envelope unwrap, refresh handling)  
- Server state: TanStack Query keys per feature  
- Auth: `AuthContext` + localStorage tokens (`access_token` / `refresh_token`)  
- Errors: toast (`sonner`) + optional Sentry

Prefer extending `api.ts` over ad-hoc `fetch` in pages.

---

## Internationalization

- Catalogs: `public/locales/{en,fr,ar}.json`  
- CI fails on key drift (`npm run i18n:check`)  
- RTL supported for Arabic via language context  
- Do not ship raw i18n keys in UI — add strings to all three locales

---

## Build & deployment

```bash
npm ci
npm run i18n:check
npm run build
```

`dist/` is **gitignored** — Vercel (or your host) builds from `main`.

CI (`frontend-ci`): `npm ci` → `i18n:check` → `build` with `VITE_MASTRA_CHAT_ENABLED=true`.

Before production:

1. Set production backend URL / Vercel env  
2. Confirm CORS on Django for the SPA origin  
3. Firebase / Sentry DSNs only via host secrets  
4. Smoke login + Agent + Live Ops

---

## Testing & quality

```bash
npm run lint
npm run test
npm run i18n:verify
```

Keep unit tests for critical libs; prefer BE / Agent gates for ops contracts.

---

## What must never be committed

`.gitignore` blocks:

- `node_modules/`, `dist/`, `dist-ssr/`, `.vite/`
- `.env`, `.env.*` except `.env.example`
- `coverage/`, `.nyc_output/`, `*.tsbuildinfo`
- Logs, editor folders, `.DS_Store`
- Playwright / Vitest artifact dirs if present

If `git status` shows `node_modules` or `.env`, fix before push.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| API 401 loops | Refresh token / clock skew; re-login |
| Agent 403 | Role must be manager-class; staff use WhatsApp |
| CORS errors | Django `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` |
| Empty locales | Run `npm run i18n:check`; hard-refresh |
| Proxy misses | `VITE_BACKEND_URL` vs Vite proxy target |

---

## Related repos

| Repo | Role |
|------|------|
| `Mizan-AI-Org/Mizan_BE` | Django authority |
| `Mizan-AI-Org/Agent` | Miya / Mastra |
| This repo | Dashboard SPA |

---

## License / ownership

Private — Mizan AI / Mizan-AI-Org.
