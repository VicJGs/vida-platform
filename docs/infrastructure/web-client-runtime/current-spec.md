# Web Client Runtime — Current Spec (durable · §XXIX promotion target)

> **Context:** `@vida/web` → `apps/web/src/` — the client runtime AR-4 (LIF-75) stands up: **state** (Zustand),
> **async/DB state** (React Query v5), **routing** (TanStack Router), **forms** (TanStack Form + Zod). Companion:
> `current-business-rules.md`. **Seeded from documentation** (from-zero — no runtime code exists yet, so the
> architecture docs are the anchor). Sources: ADR-001 §12/§21, `docs/core/architecture/{data-flow.md §7,
> performance-strategy.md §5–6, platform-strategy.md §9, system-overview.md}`.
> **No-Guessing:** `[FACT: src]` (verified on disk) · `[INTENT]` (documented target, not yet built) · `[UNKNOWN]`.

## What the web client runtime is
The `apps/web` layer that mounts the app and gives every feature route four shared planes: React Query as the
sole cache over local-SQLite reads, Zustand for ephemeral UI state, TanStack Router for type-safe routing, and
TanStack Form + Zod for validated forms. It owns the **mechanism** (provider hierarchy, query-client config,
store pattern, form factory, route tree); each module owns its **instances** (per-module hooks/stores/forms land
in that module's own later wave). `[INTENT: ADR-001 §12; data-flow.md §7]`

## Topology (target — AR-4 stands it up)
```
apps/web/src/
├── main.tsx          # React 19 root, StrictMode — renders <App/>            [FACT: exists]
├── App.tsx           # App shell: the PROVIDER HIERARCHY (QueryClientProvider + RouterProvider)  [INTENT: platform-strategy.md:296]
├── app/              # Page-route components (TanStack Router), one dir per module  [FACT: dirs exist, mostly .gitkeep]
├── stores/           # Zustand UI stores, one per feature (`<feature>-ui-store.ts`)  [INTENT: data-flow.md:434]
├── hooks/            # React Query hooks (`use<Entity>.ts`) wrapping core services   [INTENT: data-flow.md:390; performance-strategy.md:253]
├── routes.tsx        # central route tree + lazy() code-split imports of app/*        [INTENT: performance-strategy.md:323]
└── db/               # wa-sqlite/OPFS adapter (AR-2, implemented)                     [FACT: db/ tree]
```
> ✅ **HOME RECONCILE — RESOLVED (AR-4 built 2026-07-30):** homes are `stores/` (Zustand) · `hooks/` (React Query)
> · `routes.tsx` (router) · `App.tsx` (providers) · `lib/` (query-client + form factory, engineering §XX) · `db/`
> (client + worker). The delivery-plan §149 `{stores,router,forms}` shorthand was rejected (architecture governs);
> §149 Home cell is a flagged hygiene follow-up. `[FACT: apps/web/src/* as-built]`

## Pre-AR-4 baseline (the from-zero floor AR-4 started from — kept as the audit record)
- `main.tsx` = bare React root rendering `<App/>`; **no providers, no router**. `[FACT: apps/web/src/main.tsx]`
- `App.tsx` = static placeholder (`<h1>{APP_NAME}</h1>`); no state/routing/forms wiring. `[FACT: apps/web/src/App.tsx]`
- `stores/`, `router/`, `forms/`, `hooks/`, `routes.tsx` — **absent**. From-zero for all planes. `[FACT: find]`
- `app/` carries a partial page convention — `class-notes/`, `journals/`, `notes/` have `[id].tsx`/`[date].tsx`/
  `index.tsx`; the rest are `.gitkeep`. These are page **components**, wired by `routes.tsx` (code-based routing),
  NOT file-based routes. `[FACT: ls app/*; performance-strategy.md:323]`
- `apps/web/package.json` declares **none** of the four planes' deps (no `zustand`, `@tanstack/react-query`,
  `@tanstack/react-router`, `@tanstack/react-form`, `zod`). AR-4 adds them. `[FACT: apps/web/package.json]`
- No `current-*` docs existed for this context before this baseline. `[FACT: find]`

## The four planes — target contracts (INTENT, harvested)
- **React Query (data layer).** Sole cache for all SQLite entity data. `queryKey` = `[entity]` (lists) /
  `[entity, id]` (single). `queryFn` calls a **core service over local SQLite** — never HTTP (local-first).
  Mutations `invalidateQueries` their own list + any reactive cross-module view. No optimistic updates (local
  reads <10 ms). `[INTENT: data-flow.md:387-427]`
- **QueryClient config.** Global defaults: `staleTime 30_000`, `gcTime 5*60_000`, `retry 1`,
  `refetchOnWindowFocus false` (no server to re-fetch from). Per-volatility overrides per the cache table
  (high 30s/5m · medium 60s/10m · low 5m/30m · reactive 0s/5m). `[INTENT: performance-strategy.md:238-301]`
- **Zustand (UI state only).** Ephemeral, non-persisted UI state: view mode, filters, selected IDs, sort, sidebar,
  editor focus, modal state. One store per feature at `stores/<feature>-ui-store.ts`. Entity data and preferences
  do NOT go here. `[INTENT: data-flow.md:429-466]`
- **TanStack Router.** Type-safe routes; **route-based lazy code-splitting** (`lazy(() => import('./app/x'))`);
  Zod-validated search params. Provider mounted in `App.tsx`. `[INTENT: performance-strategy.md:320-327; ADR-001:146,155]`
- **TanStack Form + Zod.** Framework-agnostic forms validated by Zod schemas (shared with the same validators used
  for DB/params). `[INTENT: ADR-001:146-147]`

## Bundle budget (DoD input)
Initial bundle (shell + router + core React) **< 80 KB gzipped**; framework < 120 KB. `[FACT: performance-strategy.md:311]`

## AR-4 — IMPLEMENTED (2026-07-30 · LIF-75 · branch `ar-4-state-routing-forms`)
The client runtime + its DB binding are built. `[FACT: apps/web/src/*]`
- **D5 main↔worker binding** — `db/client.ts` (`WorkerDbClient`): spawns the worker (injectable for tests),
  `{id}`-correlated promisified RPC, shaped as an `SqliteDriver` proxy (`query`/`run`/`close` live; `exec`/`values`/
  `batch` throw a documented deferred seam → land with entity CRUD). `db/worker.ts` protocol extended to
  `open·exists·migrate·run·query·close` (`exec` KEPT as an alias — AR-2 compat). `db/boot.ts` = StrictMode-safe
  single client + memoized open. `[FACT: db/{client,worker,boot}.ts]`
- **React Query** — `lib/query-client.ts` module-scope singleton (defaults 30s/5m/retry1/no-refocus);
  `hooks/useSchemaVersion.ts` reference hook (`queryFn` = `getSchemaVersion(client.driver)`, no HTTP). `[FACT]`
- **Router** — `routes.tsx` code-based tree (root + index + not-found + one `lazy()` `/notes` route via
  `lazyRouteComponent`, verified splitting to its own chunk); module-scope `router` + `Register` typegen. `[FACT]`
- **Zustand** — `stores/app-shell-ui-store.ts` (UI-only; v5 curried). `[FACT]`
- **Forms** — `lib/forms.ts` `useZodForm` (Zod → `validators.onChange`, Standard Schema; no adapter pkg). `[FACT]`
- **Providers** — `App.tsx`: DB-ready gate → `QueryClientProvider ⊃ RouterProvider`; `main.tsx` bare. `[FACT]`
- **Resilience (post-impl gate):** RPC client rejects on worker crash (`onerror`) + per-request timeout (no hang);
  worker replies an error for unknown ops (no id-less `undefined`); `App.tsx` shows an error+retry state; `boot.ts`
  clears the open-memo on failure (retry works) + terminates the worker on unload. `[FACT: client.ts, worker.ts, boot.ts, App.tsx]`
- **Verify:** typecheck 10/10 · `@vida/web` 21/21 (incl. timeout/crash/malformed-reply paths; env-split node + jsdom mock-worker) · build green · grep-clean. `[FACT]`
- **Follow-up (non-blocking):** Vite `^6.3.5` vs ADR-001 §22 `7.x` — deferred to its own build-infra unit; live
  OPFS round-trip → Playwright (LIF-103); bundle budget (<80 KB) is a UI-4/shell-era gate, not AR-4 DoD.

## Decisions RESOLVED by AR-4 (were open at baseline)
1. **HOME** — resolved (see topology callout): architecture homes adopted over the §149 shorthand.
2. **Store placement (ADR-001:286)** — **RESOLVED by [ADR-020]**: per-app React hooks in `apps/web/src/stores/`;
   vanilla-in-`core` deferred until an M4 cross-platform consumer exists. `[FACT: ADR-020; ADR-001:286 pointer]`
3. **Router shape** — resolved: single central `routes.tsx` tree with `lazy()` code-split routes; no per-module
   self-registration seam (YAGNI until many modules). `[FACT: routes.tsx]`

## UX-1 — IMPLEMENTED (2026-08-02 · LIF-90 · Information Architecture)
New home **`apps/web/src/nav/`** (ADR-018 §3.6 layer-doc'd) — the canonical nav/module map as **central data** (no JSX):
- `module-map.ts` exports `ModuleGroup`, `NavPlacement`, `ModuleNavEntry`, `NAV_AXES`, `MODULE_MAP` (23 modules
  placed — every system-overview §2 module + the substrate-derived ones + dissolved Spaces entries), `GLOBAL_SURFACES`
  (6 global-bar surfaces). Read by the nav chrome (UI-4) + M1.1+ route wiring; **does not touch `routes.tsx`**.
- The IA design doc is `docs/core/architecture/information-architecture.md` (the co-primary dual-axis nav model).
  `[FACT: apps/web/src/nav/*; typecheck 10/10, lint 0-err]`

## UX-2 / UI-4 — IMPLEMENTED (runtime deltas · 2026-08-09→08-17 · LIF-91/LIF-89)
The UX-2 command bar + UI-4 app-shell waves reshaped two AR-4 runtime homes (`routes.tsx`, `stores/`). The shell/
command-bar UI mechanics themselves live in their own convention docs (`apps/web/src/{shell,command-bar}/CLAUDE.md`
+ `docs/core/architecture/{shell-layout,command-bar-and-search}.md`); recorded here are only the **runtime-level**
facts (routing tree + store inventory) that the AR-4 snapshot above no longer describes:
- **Router (`routes.tsx`)** — `RootComponent` now wraps the routed `<Outlet/>` in `<AppShell>` (mounted INSIDE the
  router, not above `<RouterProvider>`, because it hosts the Outlet) `[FACT: routes.tsx:20-33, UI-4·S1]`. Tree =
  root + index `/` + lazy `/notes` (the AR-4 reference route) + **lazy `/graph`** (UI-4·S5 — sigma/graphology split
  out of the initial bundle per BR-7 / performance-strategy §6, mirrors the notes route). `[FACT: routes.tsx:46-63]`
- **Zustand (`stores/`)** — a **2nd UI-only store** `command-bar-ui-store.ts` (UX-2: ephemeral open/query/mode,
  never persisted, two-mode command↔search auto-switch) now sits alongside `app-shell-ui-store.ts`, both following
  the AR-4 UI-only pattern (ADR-020; no vanilla-in-core until an M4 cross-platform consumer). `[FACT: stores/command-bar-ui-store.ts:1-4]`
- The command-bar itself is an **overlay**, not a route (⌘K launcher composed by UI-4·S3), so it adds no route node.

## preferences-rescope R1 — data-plane write integrity (2026-10-21 · LIF-247)
- **`db/write-lock.ts`** — `createWriteLock({ waitTimeoutMs, holdWarnMs?, warn? })` → `{ runExclusive, isIdle }` (FIFO
  promise-chain mutex with the timeout-forwarding rule) · the `writeLock` singleton (30 s wait, DEV 5 s hold-warn) ·
  `withTransactionLock(db, lock)` (in-place wrap of `db.transaction`) · `TransactionLockTimeoutError`. `[FACT]`
- **`db/composition-root.ts`** — `db = withTransactionLock(createDrizzleProxy(driver), writeLock)` (BR-RT-LOCK). `[FACT]`
- **`onboarding/first-run-repo.ts`** — the marker write runs under `writeLock.runExclusive`. `[FACT]`
- **`db/boot.ts`** — `registerTeardown(target, client, reload)` replaces the `beforeunload → terminate()` listener
  (BR-RT-TEARDOWN). `[FACT]`
- **Tests** — `db/write-lock.test.ts` (11, incl. the without-wrapper interleave regression proof) ·
  `db/composition-root.test.ts` (real services over a fake driver) · `db/boot.test.ts` (5) · `first-run-repo.test.ts` (+1) ·
  `e2e/write-lock.spec.ts` (CI; real OPFS). `[FACT]`
- **M4 portability note** — mobile/desktop drizzle proxies (expo-sqlite / Tauri plugin) will need the same
  transaction serialization if their drivers are async; not built (YAGNI). `[INTENT]`

## Downstream (INTENT — consumers)
- **UI-3** (`@vida/editor`, LIF-88) ← UI-1, **AR-4** — the editor mounts in routes + issues React Query reads.
- **UI-4** (app shell, LIF-89) ← UI-1, UX-3 — implements the UX-3 layout on AR-4's router.
`[FACT: delivery-plan §5 rows 185, 252-253]`
