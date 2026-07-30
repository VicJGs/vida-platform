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
   re-read rather than optimistically patching the cache. `[data-flow.md:427]`
5. **[INTENT] BR-RT-5 — cache times are set by volatility, not per-query guesswork.** Global defaults
   `staleTime 30s · gcTime 5m · retry 1`; category overrides high 30s/5m · medium 60s/10m · low 5m/30m ·
   reactive 0s/5m. `[performance-strategy.md:238-301]`

## What Zustand may / may not hold
6. **[INTENT] BR-RT-6 — Zustand holds ONLY:** view mode, active filters, selected IDs, sort preference,
   sidebar/panel open state, editor focus, modal/dialog open state. One store per feature, `stores/<feature>-ui-store.ts`.
   `[data-flow.md:454-461]`
7. **[INTENT] BR-RT-7 — Zustand must NOT hold:** entity data (→ React Query), user preferences/theme/locale
   (→ SQLite via React Query), or anything that persists across sessions (→ SQLite). `[data-flow.md:463-466]`

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
12. **[FACT] BR-RT-12 — inherits engineering §XVI–XVII:** logic-bearing components extract a custom hook (component
    = pure UI); one Zustand store per domain, no giant global store; local UI state stays in `useState`.
    `[STANDARDS engineering §XVI-XVII]` (Note: this is a **Vite SPA**, so the Next.js App-Router/Server-Component
    clauses of §XVI do NOT apply.) `[FACT: CLAUDE.md — apps/web = Vite + React SPA]`

## Rules established by AR-4 (IMPLEMENTED 2026-07-30 · LIF-75)
- **[FACT] BR-RT-STORE-PLACEMENT — RESOLVED by [ADR-020](../../core/decisions/ADR-020-zustand-store-placement.md):**
  Zustand stores are per-app React hooks at `apps/web/src/stores/<feature>-ui-store.ts` (v5 curried `create<T>()`),
  NOT vanilla-in-`packages/core`. Revisit at M4 if a cross-platform store consumer appears. `[FACT: ADR-020; stores/app-shell-ui-store.ts]`
- **[FACT] BR-RT-HOME — RESOLVED:** homes are `stores/`·`hooks/`·`routes.tsx`·`App.tsx`·`lib/`·`db/` (architecture
  docs over the §149 shorthand). `[FACT: apps/web/src/* as-built]`
- **[FACT] BR-RT-D5 — the DB is reached via the worker client.** The main thread never holds a driver directly; all
  reads/writes go through `db/client.ts` (an `SqliteDriver` proxy over the worker RPC). `exec`/`values`/`batch` are a
  declared deferred seam (throw until entity-CRUD lands, UI-3/M1.1+). The client is spawned once + opened once
  (`db/boot.ts`, StrictMode-safe). `[FACT: db/{client,boot}.ts]`
- **[FACT] BR-RT-BOOT — no query before DB-ready.** `App.tsx` gates rendering (and thus any React Query read) on the
  one-time `open`+`migrate` resolving; the worker's `open` migrates internally (no double-migrate). `[FACT: App.tsx; boot.ts]`

## Boundary (what AR-4 does NOT do)
- **[INTENT]** No per-module hooks/stores/forms — those land with each module's later wave (M1.1+). AR-4 ships the
  mechanism + one reference instance per plane. `[delivery-plan issue decomposition]`
- **[INTENT]** No layout/IA — that is UX-3; AR-4's router renders a minimal shell, not the final app chrome (UI-4).
  `[delivery-plan §5 rows 253]`
