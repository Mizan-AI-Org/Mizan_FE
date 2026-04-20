# Mizan Frontend

Web client for **Mizan AI** — a restaurant operations platform covering scheduling, staff, attendance, POS, checklists, multi-location reporting, and the **Miya** AI assistant. Built with Vite, React 18, TypeScript, Tailwind CSS, shadcn/Radix, and TanStack Query.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Available Scripts](#available-scripts)
- [Build & Deployment](#build--deployment)
- [Architecture Notes](#architecture-notes)
- [UI System](#ui-system)
- [Internationalization](#internationalization)
- [Routing & RBAC](#routing--rbac)
- [Data Layer](#data-layer)
- [Testing & Quality](#testing--quality)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Build tool** | [Vite 6](https://vitejs.dev/) + `@vitejs/plugin-react-swc` |
| **Framework** | React 18 + TypeScript 5 |
| **Routing** | `react-router-dom` v6 |
| **Styling** | Tailwind CSS 3 + `tailwindcss-animate` |
| **Component primitives** | [Radix UI](https://www.radix-ui.com/) (via shadcn/ui patterns) |
| **Icons** | `lucide-react` |
| **State / Data fetching** | [TanStack Query](https://tanstack.com/query) v5, React context |
| **Forms** | `react-hook-form` + `zod` (`@hookform/resolvers`) |
| **Charts / Maps** | `recharts`, `react-leaflet` |
| **Tables / DnD** | `@tanstack/react-table` patterns, `@dnd-kit/*`, `react-dnd` |
| **i18n** | `i18next` + `react-i18next` (en / fr / ar) |
| **Notifications** | `sonner` (toasts), Firebase Cloud Messaging (push) |
| **PDF / CSV** | `jspdf`, `jspdf-autotable`, `xlsx` |
| **Realtime** | WebSocket → backend Django Channels |
| **AI assistant** | Lua agent SDK (Miya) |
| **Testing** | Vitest + Testing Library + jsdom |
| **Linting** | ESLint 9 (`typescript-eslint`, `react-hooks`, `jsx-a11y`) |

---

## Repository Structure

```
mizan-frontend/
├── public/
│   ├── locales/              # i18n JSON catalogs (en.json, fr.json, ar.json)
│   ├── icons/                # PWA-style icons
│   └── *                     # Static assets served from "/"
│
├── src/
│   ├── main.tsx              # Vite entry: mounts <App /> with providers
│   ├── App.tsx               # Top-level routes, providers, RBAC route guards
│   ├── index.css             # Tailwind base + global tokens
│   ├── App.css               # Misc. global styles
│   ├── vite-env.d.ts         # Vite type augmentation
│   ├── firebase-config.ts    # Firebase init for FCM push
│   │
│   ├── pages/                # Route-level screens (Dashboard, Settings, etc.)
│   │   ├── Dashboard.tsx     # Main owner/manager dashboard (with side pane)
│   │   ├── ShiftReviewsAdminPage.tsx
│   │   ├── BranchDetailPage.tsx
│   │   ├── LocationsOverview.tsx
│   │   └── …                 # one file per top-level route
│   │
│   ├── components/           # Reusable UI building blocks
│   │   ├── ui/               # shadcn/Radix-based primitives (Button, Card, …)
│   │   ├── layout/           # DashboardLayout, UserAvatarMenu, headers
│   │   ├── schedule/         # Shift modals, schedule views
│   │   ├── reviews/          # Shift review widgets
│   │   └── …
│   │
│   ├── hooks/                # Reusable hooks (use-auth, use-permissions,
│   │                         # use-locations-portfolio, use-language, …)
│   │
│   ├── contexts/             # React contexts (Auth, Theme, Language)
│   │
│   ├── lib/                  # Cross-cutting libs
│   │   ├── api.ts            # Typed API client (fetch wrapper)
│   │   ├── logging.ts        # Structured client logging
│   │   └── utils.ts          # `cn` (tailwind-merge), helpers
│   │
│   ├── i18n/                 # i18next bootstrap + language switching
│   ├── config/               # Static config (roles by vertical, etc.)
│   ├── integrations/         # 3rd-party adapters (Firebase, Lua agent, …)
│   ├── services/             # Service-level wrappers around api.ts
│   ├── types/                # Shared TypeScript types
│   └── utils/                # Pure utility functions
│
├── index.html                # Vite HTML entry
├── vite.config.ts            # Vite + Rollup config (manual chunks, proxy)
├── tailwind.config.ts        # Tailwind theme + plugins
├── postcss.config.js
├── tsconfig.json             # Base TS config
├── tsconfig.app.json         # App-only TS config (strict-ish)
├── eslint.config.js          # Flat ESLint config
├── package.json
└── README.md                 # ← you are here
```

---

## Prerequisites

- **Node.js 20.x LTS** (or newer)
- **npm 10+** (the lockfile is `package-lock.json`)
- A running [Mizan backend](../mizan-backend/README.md) reachable at `http://localhost:8000` (or whatever you proxy to). The Vite dev server proxies `/api` to that origin.

> If you only need to look at the UI without a live backend, you can run the dev server and most pages will render skeletons / empty states. Anything that requires authentication will redirect to `/auth`.

---

## Environment Variables

All client-readable variables **must be prefixed with `VITE_`** (Vite only exposes those to the bundle).

Create `mizan-frontend/.env.local` (preferred — gitignored) or edit `.env`:

```dotenv
# Firebase Cloud Messaging — required for browser push notifications
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Lua AI agent (Miya)
VITE_LUA_AGENT_ID=baseAgent_agent_xxxxxxxxxxxxx

# Optional — override the API base URL (defaults to "/api" via the Vite proxy
# in dev, or same-origin in prod). Useful when the frontend is hosted on a
# different domain than the backend (e.g. Vercel + EC2).
# VITE_API_BASE_URL=https://api.heymizan.ai/api
```

> ⚠️ Anything in `VITE_*` is shipped to the browser. Never put server secrets here.

---

## Local Development

```bash
# from repo root
cd mizan-frontend

# install dependencies
npm install

# start the dev server (Vite, port 8080)
npm run dev
```

Then open **http://localhost:8080**.

The dev server proxies `/api/*` to `http://localhost:8000` (Django backend). To change that target, edit `vite.config.ts → server.proxy`.

### Hot module reload

`@vitejs/plugin-react-swc` provides fast Refresh out of the box. State is preserved across most edits to component files.

### Working with the backend

If you change a Django model or URL, restart the backend — the frontend will pick up the new shape automatically because all data goes through `src/lib/api.ts`. If the schema changes are breaking, update the matching call in `api.ts` (and any consumer hooks).

---

## Available Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Vite dev server on `:8080` with HMR + API proxy |
| `npm run build` | Production build → `dist/` |
| `npm run build:dev` | Production build using the `development` mode (keeps the [lovable-tagger](https://github.com/lovable/tagger) dev decorations) |
| `npm run preview` | Serve the built `dist/` locally for smoke-testing the production bundle |
| `npm run lint` | Run ESLint over the whole project |
| `npm run test` | Run the Vitest suite (jsdom + Testing Library) |

---

## Build & Deployment

### Production build

```bash
npm run build
```

The output is a fully static site in `dist/`. Deploy it behind any CDN or static host (Vercel, Cloudflare Pages, S3 + CloudFront, Nginx, …).

### Custom chunking

`vite.config.ts` deliberately keeps React, Radix, recharts, leaflet, and react-leaflet **in the entry/per-route chunks** instead of carving out a `vendor-react` bundle. Splitting React into its own bundle previously caused circular ESM cycles between vendor chunks (e.g. `vendor-react ↔ vendor-map`), producing a runtime `Cannot read properties of undefined (reading 'createContext')` and a blank screen.

Only true leaf libraries are split off:

- `vendor-xlsx` — `xlsx`
- `vendor-pdf` — `jspdf`, `html2canvas`
- `vendor-firebase` — `firebase`

Read the comments in `vite.config.ts` before changing this — circular ESM cycles are silent and only show up in the production bundle.

### Hosting tips

- **SPA fallback**: configure your host to rewrite all unknown routes to `index.html` so client-side routing works (e.g. Vercel does this by default; Nginx needs a `try_files $uri /index.html;` directive).
- **API base**: production builds use same-origin `/api/*` by default. If the API lives on a different domain, set `VITE_API_BASE_URL` at build time and rebuild.
- **Cache headers**: Vite emits hashed filenames (`*.[hash].js`), so it's safe to set long-lived `Cache-Control: public, max-age=31536000, immutable` for `dist/assets/*`. Keep `index.html` short-lived (e.g. `no-cache`) so users always pick up the latest manifest.

---

## Architecture Notes

### Application shell

```
<App>
 ├── Providers (QueryClient, AuthProvider, LanguageProvider, ThemeProvider, …)
 └── Routes
     ├── /auth        → public auth screens
     ├── /onboarding  → first-run wizard (OnboardingGate)
     ├── /staff/*     → staff-only routes
     └── /dashboard/* → DashboardLayout
                        └── pages: Dashboard, Settings, Reports, …
```

- `App.tsx` defines all routes and wraps protected ones in `ProtectedRoute` / `RoleBasedRoute`.
- `DashboardLayout.tsx` is the shared chrome (sticky top bar, notifications dropdown, mobile avatar). On the dashboard root at `lg+` the avatar is **moved into the side pane** and hidden in the top bar (see `Dashboard.tsx`).
- Each top-level page is its own file under `src/pages/`. Most are lazy-loaded with `React.lazy` to keep the initial chunk small.

### State

- **Server state** lives in TanStack Query — almost no hand-rolled `useEffect` data fetching.
- **Auth state** lives in `AuthContext` (`src/contexts/AuthContext.tsx`).
- **Theme & language** live in their own contexts and persist via `localStorage`.
- **UI ephemeral state** (modals, side-pane collapsed/expanded, dashboard widget order, etc.) is colocated in components and persisted to `localStorage` per-user where it makes sense.

### Realtime & push

- WebSocket connections (notifications, kitchen feeds) are managed by hooks under `src/hooks/`.
- Firebase Cloud Messaging is initialised in `src/firebase-config.ts`; the service worker lives at `public/firebase-messaging-sw.js`.

---

## UI System

The UI is **shadcn/Radix-based** (no MUI). Primitives live in `src/components/ui/` and follow the shadcn pattern — copy-and-own, styled with Tailwind, composable.

Conventions:

- Use `cn()` from `@/lib/utils` to merge Tailwind classes.
- Compose primitives in `src/components/<feature>/...`. Don't reach into `ui/*` and modify it for a one-off — wrap it.
- Color tokens come from Tailwind config; for accents prefer the shared gradients (`from-emerald-500 to-teal-500`, `from-rose-500 to-pink-500`, …).
- Animations use `tailwindcss-animate` and small `transition-*` utilities. Avoid framer-motion unless you really need it.

### Notable shared components

| Path | Purpose |
|------|---------|
| `src/components/layout/DashboardLayout.tsx` | Outer chrome for `/dashboard/*` |
| `src/components/layout/UserAvatarMenu.tsx` | Reusable avatar/account dropdown (icon + row variants) |
| `src/components/skeletons/` | Loading skeletons used across queries |
| `src/components/schedule/` | Shift modals, weekly views |
| `src/components/reviews/ShiftReviewsView.tsx` | Staff-facing reviews widget |

---

## Internationalization

Catalogs are JSON files in `public/locales/{en,fr,ar}.json`, loaded at runtime by `i18next-http-backend`.

- The active language is selected through `useLanguage()` (see `src/hooks/use-language.ts`) and persisted to `localStorage`.
- Add new keys to **all three** catalogs at the same time. Missing keys fall back to the key string and look ugly in the UI.
- Arabic (`ar`) is RTL — components must use logical Tailwind utilities (`ms-*`/`me-*`, `start-*`/`end-*`) where directionality matters.
- Legacy `'ma'` (Moroccan Darija) is remapped to `'ar'`; there is no separate `ma.json`.

---

## Routing & RBAC

Routes are declared centrally in `src/App.tsx`. Two guards are commonly used:

- `<ProtectedRoute>` — requires an authenticated user.
- `<RoleBasedRoute roles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>` — requires one of the listed roles.

App-level capability checks (which Quick Action tiles to show, which dashboard widgets to surface, etc.) come from `usePermissions()`, which reads the backend RBAC catalog on login.

When adding a new route:

1. Create the page under `src/pages/`.
2. Add a lazy-loaded `<Route>` in `App.tsx`, wrapped in the appropriate guard.
3. If the route should appear as an app tile in the dashboard side pane, add it to the `apps` array in `src/pages/Dashboard.tsx`.
4. If it needs i18n keys, add them to all three locale files in `public/locales/`.

---

## Data Layer

All HTTP traffic goes through `src/lib/api.ts`. Each method:

- Accepts the bearer token explicitly (or pulls it from `localStorage`).
- Returns a typed response.
- Normalises paginated DRF responses (`{ count, next, previous, results }`) where appropriate. Be aware: many older endpoints are paginated — when adding a new caller, always handle both `Array.isArray(body)` and `Array.isArray(body.results)`.

For caching, use TanStack Query keys that include any inputs (token, filters, IDs). Example:

```ts
useQuery({
  queryKey: ["shiftReviews", accessToken, { from, to }],
  queryFn: () => api.getShiftReviews(accessToken!, { from, to }),
  enabled: !!accessToken,
  staleTime: 60_000,
});
```

Mutations should invalidate the relevant queries on success:

```ts
const mut = useMutation({
  mutationFn: api.createShift,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["assignedShifts"] }),
});
```

---

## Testing & Quality

```bash
# unit + component tests
npm run test

# lint everything
npm run lint

# type-check the app
npx tsc -p tsconfig.app.json --noEmit
```

- Tests live next to the file they cover (`Foo.test.tsx`) or under `__tests__/`.
- The TS config uses `strict: false` for now (see comment in `tsconfig.app.json`) — this is being tightened incrementally. Don't make it worse.
- ESLint enforces:
  - `react-hooks` rules of hooks
  - `react-refresh` only-export-components
  - `@typescript-eslint/no-unused-vars` with an `_`-prefix escape hatch
  - `jsx-a11y` recommended rules (as warnings)

---

## Troubleshooting

### Blank screen / `Cannot read properties of undefined (reading 'createContext')`

Almost always a Rollup chunk cycle. **Don't** add a `vendor-react` bucket to `vite.config.ts`. Read the long comment in that file before touching `manualChunks`.

### `users.forEach is not a function` (or any `.forEach` / `.map`-on-undefined)

A DRF endpoint that switched to pagination. Normalize the response in your `queryFn`:

```ts
const body = await response.json();
if (Array.isArray(body)) return body;
if (body && Array.isArray(body.results)) return body.results;
return [];
```

### Translations show as raw keys (`app.locations_overview`)

The key is missing from one of the locale files. Add it to **all three** — `en.json`, `fr.json`, `ar.json`.

### CORS / 401 errors in dev

Make sure the backend is running on `:8000` and that the Vite dev proxy (`/api`) is hitting it. If you're calling the API from production directly, set `VITE_API_BASE_URL` and rebuild.

### Bundle too large / slow first paint

Check `dist/assets/*.js` sizes after `npm run build`. Heavy pages should be `React.lazy`'d in `App.tsx`. Heavy leaf libraries can be added to the `manualChunks` allow-list — but only if they really are leaves (no other libraries import them and they don't import React).

---

## Contributing

1. Branch off `dev`.
2. Make your change. Keep diffs focused — one feature/fix per PR.
3. Run `npm run lint` and `npm run test` before pushing.
4. Open a PR against `dev`. CI runs lint + typecheck + tests.
5. The PR description should explain **why** more than **what**.

When adding new UI:

- Reuse `src/components/ui/*` primitives instead of inventing one-offs.
- Add i18n keys for any user-facing string.
- Provide loading skeletons and empty states. The product is used in low-bandwidth environments — never show a blank screen while data loads.

---

## License

Proprietary — © Mizan AI. All rights reserved.
