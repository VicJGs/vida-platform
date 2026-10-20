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

## CODEC frontend seams — IMPLEMENTED (runtime deltas · fe-codec-* units · baseline-refreshed 2026-10-10 by fe-calendar #19)
The `fe-codec-*` frontend wave added three **cross-module read + view-adapter seams** under `apps/web/src/` that the
AR-4/UI-4 snapshots above predate. Recorded here because `fe-calendar` #19 (LIF-203) is the **first consumer** of one
of their deferred hooks. The UI mechanics live in their own convention docs (`apps/web/src/{canvas,collection}/CLAUDE.md`
+ `docs/specs/foundation/fe-codec-{patterns,canvas-board,collection}/`); recorded here are the **runtime-level** seams:
- **ProviderRead convention** (`providers/provider-read.ts`) — `export type ProviderRead<T> = () => Promise<T>`; the
  "no direct cross-module tables" read seam. Shipped as a **type + documented convention, NOT a hook** — a
  `useProviderRead` wrapper would be a thin `useQuery` alias with no M1 consumer (ReducedMotion/first-consumer lesson).
  Consumed as `useQuery({ queryKey, queryFn: provider })` where `provider satisfies ProviderRead<T>`. `[FACT: providers/provider-read.ts:9,15]`
- **Canvas adapter** (`canvas/adapter.ts`) — pure convention for the `CanvasView` immersive frame (fe-codec-canvas-board
  S2): `toCanvasHeader(view, eyebrow, meta?)` (title = user-named surface, never the month, avoids duplication),
  `resolveMeasureProgress(m)` (ADR-011 measure-driven progress descriptor), `createCanvasAdapter()`. `[FACT: canvas/adapter.ts:44,81,107]`
  - **DEFERRED hook — #19's build:** `useCalendar(spaceId)` / `useVisionBoard(spaceId)` (React Query → cross-module
    `dueIn` fan-out via `ProviderRead`) are explicitly "built at the first consumer". `fe-calendar` #19 **is** that
    first consumer for `useCalendar`. `[INTENT: canvas/adapter.ts:22-24]`
- **Collection adapter** (`collection/adapter.ts`) — pure convention for the 7-renderer `CollectionView` (fe-codec-collection
  S3): `toCollectionChrome(view, resolved)`, `bindViewConfigWrites(views)`, `createCollectionAdapter(views)`. The deferred
  `useCollection(viewId)` hook (React Query → `ViewEngine.resolve`) is built at its first consumer (fe-notes #27, not #19). `[FACT: collection/adapter.ts:60,74,92; :14]`
- **View dispatch** — `ViewLayout` union (`'list'|'table'|'board'|'gallery'|'calendar'|'timeline'|'graph'`) in `@vida/types`
  routes a saved-view's `layout` to its renderer; `'calendar'` → the `@vida/ui` `CalendarView` (month grid, LIF-230-refined,
  TZ-safe). The other 5 calendar ranges are **net-new renderers #19 builds** — Agenda = `AgendaView` (S2, shipped);
  Week/Day · Year · Living = S3–S5. `[FACT: packages/types/src/view.ts; packages/ui/src/components/calendar-view.tsx]`

## Downstream (INTENT — consumers)
- **UI-3** (`@vida/editor`, LIF-88) ← UI-1, **AR-4** — the editor mounts in routes + issues React Query reads.
- **UI-4** (app shell, LIF-89) ← UI-1, UX-3 — implements the UX-3 layout on AR-4's router.
- **fe-calendar #19** (LIF-203) ← AR-4, ProviderRead, canvas adapter — the Global Calendar surface.
  **S1 SHIPPED (2026-10-10):** `app/calendar/index.tsx` **`CalendarSurface`** (the FIRST real apps/web surface —
  `CanvasView` frame · period title per range · `role="toolbar"` range switcher + nav · dispatches to the active range)
  + `stores/calendar-ui-store.ts` (Zustand UI-only: `range` + `focusedDate`, BR-RT-6; a saved default range would be a
  `user_preferences` write = owning capability, NOT here) + a lazy `/calendar` route (the `/graph` split precedent).
  Month = `@vida/ui` `CalendarView` with the new **`hideHeader`** mode (D4 — frame owns the period title). S1 uses a
  local fixture; the live **`useCalendar`** ProviderRead fan-out + the other range renderers land in S2–S7.
  `[FACT: apps/web/src/app/calendar/index.tsx · stores/calendar-ui-store.ts · routes.tsx:calendarRoute · packages/ui/src/components/calendar-view.tsx hideHeader; docs/specs/foundation/fe-calendar/delivery/slice-map.md]`
  **S2 SHIPPED (2026-10-18):** the **Agenda** range dispatches to `@vida/ui` **`AgendaView`** fed by a local
  `agendaFixture(focused)` (the focused Mon–Sun week; the rich dayparted mix sits on TODAY when today is in the focused
  week, else Thursday — rendering FLAT, since only today is dayparted). Items arrive **pre-dayparted** — the D1 bands
  `useCalendar` (S7) will apply are fixed: `<12:00` morning · `12:00–17:59` afternoon · `≥18:00` evening; an all-day task
  defaults to morning. **No `onToggleItem` is passed** — the completion capability (Tasks/Habits/Routines) isn't wired in
  M1, and a no-op handler would render dead focusable checkboxes; absent ⇒ the renderer's read-only done-state
  (deny-safe). Week/Day/Year/Living still render the S1 placeholder.
  **S1 chrome fix (2026-10-18, `docs/specs/fixes/fe-calendar-s1-chrome-375/`):** the range switcher now condenses to a
  `Menu` ("Range: <active>") below 768 (EC-1), the breakpoint read via Tamagui `useMedia()` + a `__bp` test override (the
  shell contract, regions.ts:66-69); all range chrome is `Button size="lg"` (48px ≥ the 44×44 floor, decisions.md:82)
  with ≥8px gaps, passed as the CanvasView actions slot's direct children (which now wraps); "This week ·" only on the
  current week; month/year ‹/› clamp the day (Jan 31 › = February). The period title no longer overlaps when wrapped
  (CanvasView pairs `lineHeight="$display"`).
  `[FACT: apps/web/src/app/calendar/index.tsx agendaFixture + range==='agenda' dispatch; packages/ui/src/components/agenda-view.tsx; docs/specs/foundation/fe-calendar/delivery/PLAN-S2-agenda-renderer.md §3, §5a]`
  **S3 SHIPPED (2026-10-19):** **Week** and **Day** dispatch to `@vida/ui` **`WeekView`** (`WeekRange`: Week = the 7 days,
  Day = `[focused]` with that day's blocks + chips) fed by `weekFixture(focused, weekStartsOn)` (dated chips filtered per
  Day, then passed undated); a Day with nothing → `state="empty"`. **Locale prefs are READ (BR-16):** the surface reads
  `timeFormat`/`weekStartsOn` from the fe-settings `preferences-store` (the fe-home READ precedent) — `weekStartOf(d,
  weekStartsOn)` replaced the hard-coded `mondayOf` in `periodLabel` (span + "This week"), `agendaFixture`,
  `weekFixture`, and Month passes the shipped `CalendarView weekStartsOn`, so every range agrees on the week start; S7's
  `useCalendar` must take `weekStartsOn` too (seam-contract §B). Year/Living still render the placeholder.
  `[FACT: apps/web/src/app/calendar/index.tsx weekStartOf · weekKeys · weekFixture · WeekRange; stores/preferences-store.ts; docs/specs/foundation/fe-calendar/delivery/PLAN-S3-week-day-renderer.md BR-16, §5a]`
