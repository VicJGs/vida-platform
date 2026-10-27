# Web Client Runtime — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/web` → `apps/web/src/`. Companion: `current-spec.md`. **Seeded from documentation**
> (from-zero — no runtime code exists yet; the architecture docs are the anchor). Sources: ADR-001 §12/§21,
> `docs/core/architecture/{data-flow.md §7, performance-strategy.md §5–6, platform-strategy.md §9, system-overview.md}`,
> `docs/core/business-rules.md` (constitution), engineering standards §XV–XVIII.
> **No-Guessing:** each rule `[FACT: src]` (verified) · `[INTENT]` (documented, owed) · `[UNKNOWN]`.

## The state-plane boundary (the runtime's central invariant)

1. **[INTENT] BR-RT-1 — React Query owns all DB-derived data; Zustand owns only ephemeral UI state. No overlap.**
   Entity data (tasks, notes, …) and persisted user preferences are read via React Query from local SQLite; they
   must NEVER live in Zustand. `[data-flow.md:383,463-466]`
2. **[INTENT] BR-RT-2 — query keys are structured `[entity]` (lists) / `[entity, id]` (single).** Every mutation
   invalidates its own list key plus any reactive cross-module view key it feeds. `[data-flow.md:424-426]`
3. **[INTENT] BR-RT-3 — `queryFn` reads local SQLite via a core service, never HTTP.** `refetchOnWindowFocus` is
   `false` because there is no remote server to re-fetch from (local-first / ZK — the server is a blob relay only).
   `[performance-strategy.md:295,301; CLAUDE.md core privacy model]`
4. **[INTENT] BR-RT-4 — no optimistic updates by default.** Local reads are <10 ms, so writes invalidate and
   re-read rather than optimistically patching the cache. `[data-flow.md:427]` **Pinned exception (preferences-rescope
   R2):** Preferences writes are optimistic + revert — fe-settings EC-7 pins it — via the writer's
   `confirmed + pending` cache model (`apps/web/src/preferences/`). `[FACT]`
5. **[INTENT] BR-RT-5 — cache times are set by volatility, not per-query guesswork.** Global defaults
   `staleTime 30s · gcTime 5m · retry 1`; category overrides high 30s/5m · medium 60s/10m · low 5m/30m ·
   reactive 0s/5m. `[performance-strategy.md:238-301]`

## What Zustand may / may not hold

6. **[INTENT] BR-RT-6 — Zustand holds ONLY:** view mode, active filters, selected IDs, sort preference,
   sidebar/panel open state, editor focus, modal/dialog open state. One store per feature, `stores/<feature>-ui-store.ts`.
   `[data-flow.md:454-461]`
7. **[INTENT] BR-RT-7 — Zustand must NOT hold:** entity data (→ React Query), user preferences/theme/locale
   (→ SQLite via React Query), or anything that persists across sessions (→ SQLite). `[data-flow.md:463-466]`
   **Amended (preferences-rescope R3):** the ONE exemption is `stores/theme-store.ts`, a **derived cache** of the
   `['preferences','user']` entry (PR-5, `structure-data.md:46`) — `UIProvider` renders outside `QueryClientProvider`, so
   it needs a store. It has no setters for the persisted theme: one query-cache subscription (installed at module load over
   the `lib/query-client` singleton) re-derives `persisted`; the only writable field is the guided-setup `previewPreset`
   layer (cleared whenever guided setup closes). Besides it, **the theme hint** (`localStorage['vida.theme-hint.v1']` =
   `{ scheme, bg, fg }`, `preferences/theme-hint.ts`) is a _device-local paint cache_: derived from SQLite, written only
   from confirmed DB rows (the writer's `onConfirmed`), read only by the pre-React inline `<script id="vida-theme-hint">`
   in `index.html`, never by the app. It is the one cross-session value outside SQLite — stated here so it cannot become
   a precedent. `[FACT: stores/theme-store.ts; preferences/theme-hint.ts; index.html]`

## Routing & forms

8. **[INTENT] BR-RT-8 — routing is code-based + type-safe with route-based lazy code-splitting.** A central
   `routes.tsx` tree lazy-imports `app/*` page components (`lazy(() => import('./app/habits'))`); the initial
   bundle (shell + router + core React) stays **< 80 KB gzipped**. `[performance-strategy.md:311,320-327]`
9. **[INTENT] BR-RT-9 — search/route params are validated with Zod**, using the same validator vocabulary as forms
   and DB records (single source of truth for shapes). `[ADR-001:146,155]`
10. **[INTENT] BR-RT-10 — forms validate through Zod** via TanStack Form; framework-agnostic so the same form
    logic can serve web + RN later. `[ADR-001:146-147]`

## Provider hierarchy & standards inheritance

11. **[INTENT] BR-RT-11 — providers mount in `App.tsx`** (the "provider hierarchy"): `QueryClientProvider` wraps
    `RouterProvider`; `main.tsx` stays a bare root. `[platform-strategy.md:296; system-overview.md:269]`
    **As-built (preferences-rescope R2):** `UIProvider ⊃ QueryClientProvider ⊃ { PreferencesBridge · first-run
Onboarding | RouterProvider · guided-setup overlay · ToastProvider }` — hoisted so onboarding writes reach the same
    cache Settings reads. `[FACT: App.tsx]`
12. **[FACT] BR-RT-12 — inherits engineering §XVI–XVII:** logic-bearing components extract a custom hook (component
    = pure UI); one Zustand store per domain, no giant global store; local UI state stays in `useState`.
    `[STANDARDS engineering §XVI-XVII]` (Note: this is a **Vite SPA**, so the Next.js App-Router/Server-Component
    clauses of §XVI do NOT apply.) `[FACT: CLAUDE.md — apps/web = Vite + React SPA]`

## Rules established by AR-4 (IMPLEMENTED 2026-07-30 · LIF-75)

- **[FACT] BR-RT-STORE-PLACEMENT — RESOLVED by [ADR-020](../../core/decisions/ADR-020-zustand-store-placement.md):**
  Zustand stores are per-app React hooks at `apps/web/src/stores/<feature>-ui-store.ts` (v5 curried `create<T>()`),
  NOT vanilla-in-`packages/core`. Revisit at M4 if a cross-platform store consumer appears. `[FACT: ADR-020; stores/app-shell-ui-store.ts]`
- **[FACT] BR-RT-HOME — RESOLVED:** homes are `stores/`·`hooks/`·`routes.tsx`·`App.tsx`·`lib/`·`db/` (architecture
  docs over the §149 shorthand), **plus per-feature folders holding their own `use-*.ts` hooks** — the as-built practice
  (`notes/`, `home/`, `preferences/`). `[FACT: apps/web/src/* as-built]`
- **[FACT] BR-RT-D5 — the DB is reached via the worker client.** The main thread never holds a driver directly; all
  reads/writes go through `db/client.ts` (an `SqliteDriver` proxy over the worker RPC). **`exec`/`values`/`batch`
  landed via `data-plane-wiring` (2026-10-20)** — they RPC to the worker `exec`/`values`/`batch` ops, which call the
  in-worker `web-driver.ts` (`values` → positional arrays, the Drizzle sqlite-proxy read path). So
  `createDrizzleProxy(client.driver)` works end-to-end. Writes over it are serialized by BR-RT-LOCK. The client is spawned once + opened once (`db/boot.ts`,
  StrictMode-safe). `[FACT: db/{worker,client,boot}.ts]`
- **[FACT] BR-RT-COMPROOT — the live services are a module singleton.** `db/composition-root.ts` lazily constructs
  `DrizzleDb = createDrizzleProxy(client.driver)` + the module services (notes/journals/preferences + deps) ONCE, after the
  DB-ready gate, exposed as a `getServices()` singleton (not a React provider; `seams/CLAUDE.md`
  sanctions the singleton). **Built during boot (R3):** the preferences seed (BR-RT-BOOT) calls `getServices()` inside the
  Loading window, so `initVault` + `resolveDeviceId` + the two preferences reads now run before first paint, not after it.
  `getServices()` memoizes its build promise, so a failure _inside_ `build()` is not recovered by a query refetch (a
  recorded edge, LIF-250's area). `deviceId` is read from / generated into `app_state['device_id']` (ADR-002 §5.0; `uuidv7()`).
  Each entity's closing slice (`register + flip`, golive-replan ELC-3/4) consumes it; adding a module appends its construction. `[FACT: db/composition-root.ts]`
  **fe-calendar #19 S7 (2026-10-22):** construction is the exported PURE `composeServices(db, deviceId)` (no boot/worker/I/O —
  `build()` = DB-ready → `initVault` → the BR-RT-LOCK-wrapped db + device id → `composeServices`), so a live better-sqlite3 vault can test it. Manifest now:
  notes · journals · **preferences** (R2) · **sessions** (+ `SessionRegistry`, an `EffectRail` over an EMPTY effect registry) · **habits** · **tasks**
  (`sessions`/`spaces`/`notes`) · **purposes** · **relationships**, then the three dueIn lanes (`register{Tasks,Purposes,Relationships}DueProvider`)
  — the Calendar is the dueIn aggregator (first-consumer-pull). NO journal contributions (→ HARD-1) and NO effect handlers
  (→ the owning units). `[FACT: db/composition-root.ts; composition-root{,.singleton}.test.ts]`
- **[FACT] BR-RT-LOCK — writes are serialized app-wide (preferences-rescope R1, 2026-10-21).** drizzle's sqlite-proxy
  runs a transaction as unlocked async `begin` → callback → `commit` calls, and every service shares ONE worker
  connection, so concurrent writes interleaved ("cannot start a transaction within a transaction", or foreign statements
  committing inside another write). `db/write-lock.ts` wraps `db.transaction` once in the composition root: FIFO, one
  writer at a time, released in `finally`; a waiter past 30 s rejects with `TransactionLockTimeoutError` (its slot still
  forwards the predecessor's release); a DEV-only warning names a holder kept > 5 s. **Rules:** inside a transaction
  callback use only `tx` / `*InTx` (a nested `db.transaction` deadlocks → the 30 s typed timeout); every write after boot
  is a `db.transaction`, a `*InTx` API, or `writeLock.runExclusive(...)` — never a bare `db.insert/update/delete().run()`
  or `driver.run` (the first-run marker runs exclusive; the boot-time `deviceId` write precedes every service). Reads are
  NOT locked (they may observe uncommitted rows; consumers that roll back optimistically re-read). Per-table write
  queues above this (read-then-create races) stay the owning hook's job. `[FACT: db/write-lock.ts; composition-root.ts]`
- **[FACT] BR-RT-PREFS — the Preferences seam (preferences-rescope R2, 2026-10-22).** React Query over SQLite is the source
  of truth (Zustand stores are at most derived caches — `preferences-store` is a transitional mirror until R6). Two exact
  keys `['preferences','user']` / `['preferences','nav']`, low-volatility category 5 min / 30 min. ONE writer owns cache
  truth per table (`confirmed` + `pending`; cache = pending re-applied on confirmed), serial + 500 ms debounced queues,
  per-sub-key `dashboard_layout` + map merges, a hide/pagehide flush. **Every `user_preferences`/`nav_preferences` writer in
  any unit uses `preferences/writer-instance.ts`**, never the raw service. `[FACT: apps/web/src/preferences/]`
  **R3 (2026-10-26):** both read definitions live in `preferences/preferences-queries.ts` (one read path for the hook and
  the boot seed) and set `retryOnMount: false` — an errored, data-less query is otherwise refetched by every mounting
  observer and reset to `pending`, an unbounded loading↔error loop; recovery is the error state's explicit Retry →
  `refetch()` (`docs/core/architecture/state-conventions.md` §3). The writer gains `onConfirmed` (accepted read / successful
  batch → the theme hint) and `onFailed` (exactly once per failed batch → one revert toast, from `writer-instance.ts`,
  whatever surface is mounted). `[FACT: preferences/{preferences-queries,preferences-writer,writer-instance}.ts]`
  **R5 (2026-10-27):** a third key `['preferences','commands']` (⌘K history, many rows; own stale/gc, `retry: 0`, not in
  the boot seed). **Every `command_bar_history` write goes through `preferences/command-history.ts`** — one serial promise
  chain for `record` + `pin` (both service ops read-then-write over a UNIQUE key; the chain is what keeps two first runs
  to one row), best-effort `record` after `run()`, and a fire-and-forget invalidate after each op (`invalidateQueries`
  awaits the refetch — chaining on it would stall later writes). One chain suffices: one tab owns the DB (R1-BR-8).
  `[FACT: preferences/{command-history,preferences-queries,preferences-keys}.ts]`
- **[FACT] BR-RT-TEARDOWN — worker teardown on non-cancelable lifecycle events only (R1).** `db/boot.ts`
  `registerTeardown`: `pagehide` + `persisted` → `terminate()` (a bfcached page must not hold the exclusive OPFS
  handles) · `pageshow` + `persisted` → reload · a normal unload → nothing (the browser discards the worker). Never
  `beforeunload` (cancelable). A transaction cannot finish after unload; pending writes **will be** flushed by the writing hook while the page
  is still visible (`visibilitychange`) — preferences-rescope R2, `[INTENT]`, not built in R1. `[FACT: db/boot.ts]`
- **[FACT] BR-RT-CAL-LIVE — the Global Calendar reads live, read-only.** `useCalendar` = `useQueries` over the pure
  `calendarQueries` (only allowlisted reads — `dueIn`, `listAvailability*`, `getSessionAnalytics`, `getCompletionGrid`, `listTasks`,
  `listPurposes`, `getPageByJournalDate`), keys under `['calendar', …]`; derivations in the pure `calendar-derive.ts`; the DEV `?sample`
  fixtures (`calendar-sample.ts`) are router-subscribed and never reach prod. Proven read-only on a live vault (driver spy: 0 writes).
  `[FACT: app/calendar/{use-calendar,calendar-derive,calendar-sample}.ts; calendar-readonly.test.ts]`
- **[FACT] BR-RT-BOOT — no query before DB-ready.** `App.tsx` gates rendering (and thus any React Query read) on the
  one-time `open`+`migrate` resolving; the worker's `open` migrates internally (no double-migrate). `[FACT: App.tsx; boot.ts]`
  **Amended (preferences-rescope R3):** the gate also waits for the **preferences seed** — after `dbReady`,
  `seedPreferences(queryClient)` `fetchQuery`s both preferences keys (`retry: 0`), and the provider tree renders only once
  it **settles**, so the theme and every reader (Home arrangement) draw the persisted value from their first frame. The
  seed **never rejects** (`Promise.allSettled`): a failed read leaves the queries in error, the app boots on the defaults
  (PR-2) and Settings shows its read-only state — never a stuck "Loading…". `[FACT: App.tsx; preferences/preferences-queries.ts]`
- **[FACT] BR-RT-RPC-DEADLINE — the worker RPC never hangs and never fails a live boot (LIF-250, 2026-10-22).** Reads/writes
  (`query`/`run`/`exec`/`values`/`batch`/`exists`/`close`) reject after a fixed 15 s. `open`/`migrate` run every pending
  migration (first run 9–27 s measured), so the worker **acks them on receipt** and their deadline covers **receipt only**
  (`OPEN_ACK_TIMEOUT_MS` 60 s, above the 12.2 s worst-case worker module load); after the ack the request waits for its
  reply — a crash rejects via `onerror`, a failure via `{ ok: false }`. An ack never settles a request.
  `[FACT: db/client.ts ACKED_OPS/OPEN_ACK_TIMEOUT_MS; db/worker.ts; client.test.ts]`
- **[FACT] BR-RT-D5 enforced in the worker — opened once.** A repeated or concurrent `open` (the boot Retry while the first
  open still migrates) shares the in-flight/completed open; a failed open is not cached and releases any half-open
  connection; `close` resets it. The web adapter's module + VFS bootstrap is single-flight. `[FACT: db/worker.ts open();
db/web-adapter.ts ensureModule(); worker.test.ts]`
- **[FACT] BR-RT-COMPROOT — a rejected build is not cached.** `getServices()` clears its memo on rejection (the `boot.ts`
  rule), so a failed boot/`initVault` recovers on the next call. `[FACT: db/composition-root.ts; composition-root.singleton.test.ts]`

## Boundary (what AR-4 does NOT do)

- **[INTENT]** No per-module hooks/stores/forms — those land with each module's later wave (M1.1+). AR-4 ships the
  mechanism + one reference instance per plane. `[delivery-plan issue decomposition]`
- **[INTENT]** No layout/IA — that is UX-3; AR-4's router renders a minimal shell, not the final app chrome (UI-4).
  `[delivery-plan §5 rows 253]`

## Rules established by UX-1 (IMPLEMENTED 2026-08-02 · LIF-90 · Information Architecture)

- **[FACT] BR-NAV-1 — the nav model is CO-PRIMARY DUAL-AXIS:** module dock (content home) + Spaces bar
  (cross-cutting overlays). The dock owns canonical content homes; the Spaces bar overlays, never replacing a home.
  **Amends ADR-007:88** (nav placement → Preferences); ADR-006 §3.4 (nav-addressable) is the cover. The Spaces bar
  is a designed seam in M1.0, live in M1.1. `[FACT: apps/web/src/nav/module-map.ts; docs/core/architecture/information-architecture.md]`
- **[FACT] BR-NAV-2 — the canonical nav/module map is CENTRAL DATA** at `apps/web/src/nav/module-map.ts`, READ by
  the nav chrome (UI-4) + M1.1+ route wiring. It does **not** import/mutate `routes.tsx` and registers no routes —
  honoring AR-4's single-central-`routes.tsx`, no-self-registration-seam decision. `[FACT: nav/module-map.ts]`
- **[FACT] BR-NAV-3 — every module carries a `placement`** ∈ {dock · global · secondary · non-nav · spaces-only},
  anchored in its `docs/features/<module>/identity.md`; conditional-dock items carry `visibleWhen` (a feature flag,
  e.g. Gamification's `feature_gamification`). `routePath` is UX-facing and MAY differ from `key`. `[FACT: nav/module-map.ts]`
- **[INTENT] BR-NAV-4 — per-module routes are NOT registered by UX-1;** each M1.1+ module self-wires via
  `lazy(() => import('./app/<module>'))` reading its map entry. Specific view modes are the per-module VIEWS review
  (ADR-007), not UX-1. `[FACT: routes.tsx:9]`
