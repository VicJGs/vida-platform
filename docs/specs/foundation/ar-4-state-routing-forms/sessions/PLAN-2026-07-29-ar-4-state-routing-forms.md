# PLAN (gate 1 = the SPEC) — ar-4-state-routing-forms
Session: 2026-07-29-ar-4-state-routing-forms · authored 2026-07-30 · Profile: Generic Coding Session
Status: IMPLEMENTED (2026-07-30, branch `ar-4-state-routing-forms`) — typecheck 10/10, web 18/18, build green → post-impl gate
Unit: AR-4 (LIF-75) · Milestone: M1.0 Boot & DB spine · Home: `apps/web/src/`
No-Guessing: every claim is `[FACT: src]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]`.
Ground truth: `docs/infrastructure/web-client-runtime/current-{spec,business-rules}.md` (this session).

---

## 1. Identity
AR-4 stands up the `apps/web` client runtime per ADR-001 §12: the four shared planes — **Zustand** (UI state),
**React Query v5** (async/local-SQLite state), **TanStack Router** (routing), **TanStack Form + Zod** (forms) —
**plus the main↔worker DB binding that AR-2 explicitly handed to AR-4** (`worker.ts:9`; `db/CLAUDE.md`; AR-2
PLAN:66) — as the *mechanism* every later feature route mounts onto. The React Query plane has no data source
without the binding, so it is core to AR-4, not adjacent. `[FACT: delivery-plan §149; ADR-001:144-155; worker.ts:9]`

**What it is NOT:** not any module's screens/hooks/stores/forms (those land per-module, M1.1+); not the app
layout/IA (UX-3) or final shell (UI-4); not encryption/sync wiring; not mobile/desktop. `[INTERP: delivery-plan §5 decomposition]`

## 2. Business Rules (inherited from `current-business-rules.md` BR-RT-1…12)
Governing invariants the build must satisfy — full text + cites in the durable doc; the load-bearing ones here:
- **BR-RT-1** React Query owns all DB-derived data; Zustand only ephemeral UI state — no overlap. `[data-flow.md:383,463]`
- **BR-RT-3** `queryFn` reads local SQLite via a core service, never HTTP; `refetchOnWindowFocus:false`. `[performance-strategy.md:295,301]`
- **BR-RT-5** cache times by volatility (global `staleTime 30s/gcTime 5m/retry 1`). `[performance-strategy.md:238-301]`
- **BR-RT-8** code-based routing in a central `routes.tsx` with route-based `lazy()` splitting; initial bundle <80 KB. `[performance-strategy.md:311,320-327]`
- **BR-RT-9/10** Zod validates route params AND forms (one validator vocabulary). `[ADR-001:146-147,155]`
- **BR-RT-11** providers mount in `App.tsx` (`QueryClientProvider` ⊃ `RouterProvider`); `main.tsx` stays bare. `[platform-strategy.md:296]`

## 3. Decisions RESOLVED for Approval 1 (the 4 open items)
Each is `[INTERP]` grounded in a `[FACT]`, offered for the gate — not silently baked.

**D1 · CODE HOME — adopt the architecture-doc homes; the plan-table shorthand is reconciled to match.**
`stores/` (Zustand) · `hooks/` (React Query) · `routes.tsx` (router tree) · `App.tsx` (providers). The QueryClient
config + form factory (third-party wrappers) go in **`lib/`** — a documented convention, NOT an invention:
engineering §XX File Organization lists `lib/ — utilities, helpers, third-party wrappers`. `[FACT: process.md §XX:66]`
Reject the delivery-plan §149 `{stores,router,forms}` literal — it is a roadmap-table Home *cell*; the architecture
docs govern (`platform-strategy.md §9`, `performance-strategy.md §5-6`). [[read-architecture-before-implementing]]
Follow-up (hygiene, non-blocking): update the §149 Home cell to match. `[FACT: delivery-plan §149 vs architecture §9]`

**D2 · STORE PLACEMENT (ADR-001:286) — per-app React hooks in `apps/web/src/stores/` for M1.0; defer vanilla-in-core.**
Rationale: no M1.0 RN/mobile consumer (mobile = M4), so the "shared web/RN" argument for vanilla-in-`core` has no
consumer yet; architecture examples already use per-app hooks; simplest-that-works (over-engineering guard).
**Artifact (corrected per critique):** the ADR-013 precedent resolves a deferral via a **separate ADR** cross-linked
from ADR-001, NOT a bare inline note — and §XXI makes a two-approach architectural choice ADR-worthy. So: write a
short **new ADR-020 (Zustand store placement)** owning the rationale, and amend ADR-001:286 to a one-line pointer at
it (faithful to how ADR-013 resolves the push deferral at ADR-001:8). `[FACT: ADR-001:8,286; ar-1 did not close it; process.md §XXI]`

**D3 · ROUTER SHAPE — single central `routes.tsx` root tree now; no per-module self-registration seam.**
Matches `performance-strategy.md:323` (literal `routes.tsx`). A registration seam is speculative until many
modules exist (YAGNI). Existing `app/*/[id].tsx` page stubs become `lazy()`-imported route components.
`[FACT: performance-strategy.md:320-327]`

**D4 · GRAIN — mechanism + ONE reference instance per plane; NO per-module instances.** Ship: provider hierarchy,
configured `QueryClient`, the Zustand store pattern + one **app-shell UI store** (sidebar/nav open state — valid
UI state per BR-RT-6), the Zod-resolver **form factory** + one reference validated via a test, the `routes.tsx`
root tree + a root route + a not-found route.
**Reference query — flows THROUGH the D5 binding (corrected per preflight):** the vault-free foundation read is
**`getSchemaVersion(driver): Promise<number>`** (`adapter.ts:210`, exported at `core/index.ts:67`). But there is
**no `driver` on the main thread** — the engine lives in the worker (D5). So the reference hook's `queryFn` calls
`getSchemaVersion(mainThreadDriver)` where `mainThreadDriver` is the D5 **proxy** (an `SqliteDriver` whose methods
RPC to the worker). No `services/*` exist yet (all `CLAUDE.md` stubs); `createRepository` is vault-gated — so
`getSchemaVersion` over the proxy is the correct reference. Tested two ways: the proxy's RPC correlation under
jsdom (mock worker), and `getSchemaVersion` itself under the better-sqlite3 Node stand-in; the live OPFS round-trip
is Playwright-deferred (LIF-103). `[FACT: adapter.ts:210; core/index.ts:67; services/*=md-only; repository.ts:241-244; worker.ts:9]`

**D5 · MAIN↔WORKER DB BINDING — the documented AR-4 layer (NOT a scope choice; assigned by AR-2).**
The DB engine + driver run inside `worker.ts`, exposing today only a minimal `open|exec|query|close` postMessage
protocol (an AR-2 proof). `worker.ts:9` + `db/CLAUDE.md` + AR-2 PLAN:66 assign the *app-facing binding* to AR-4.
AR-4 builds:
- **a main-thread DB client** that spawns the worker, correlates `{id}` request/response, promisifies replies
  (rejecting on `{ok:false, error}`, worker.ts:81-87), and is shaped as an `SqliteDriver` **proxy** (interface at
  `adapter.ts:60`) so `getSchemaVersion` / `createDrizzleProxy` / (later) the repository work unchanged across the
  boundary. **The client constructor accepts an OPTIONAL worker instance** (default `new Worker(...)`) so the jsdom
  test injects a mock — jsdom has no `Worker`. `[FACT: adapter.ts:60-84; worker.ts:31-88]`
- **protocol extension** — `worker.ts` currently exposes `open|exec|query|close`. AR-4 adds the ops the client
  needs. **Grain sub-decision [INTERP, confirm at gate]:** cover **open · migrate · query · run · close · exists**
  now (enough for `getSchemaVersion` + per-name first-run detection + a live read); leave **`values`/`batch`** (the
  Drizzle-proxy repository path) as a declared seam **in the `WorkerRequest` union (worker.ts:31-35)** for when
  module entity-CRUD lands (UI-3 / M1.1+). **ALIAS, don't rename:** add a `run` op; KEEP the existing `exec` handler
  working (R7) — a rename would contradict R7; drop `exec` only after a grep proves zero consumers. Rationale:
  mechanism + one reference, not the full per-module data path (matches D4 grain). `[FACT: worker.ts:62-78; adapter.ts:60-84]`
- **per-name first-run detection** — `db/CLAUDE.md` assigns "per-name first-run detection" to AR-4 (the VFS stores
  files under opaque OPFS names; `exists(dbName)` distinguishes first-run/create from open-existing). `[FACT: db/CLAUDE.md; adapter.ts:126]`
- **app-boot sequence** — `App.tsx` (or a small DB-ready provider) starts the worker + calls **`open`** via the
  client, and gates rendering on DB-ready (loading state) before any query runs. **Note: the worker's `open` handler
  ALREADY runs `migrate` (worker.ts:23)** — boot does NOT send a second `migrate`; the separate `migrate` op exists
  for explicit re-migrate/tests and is idempotent (`runMigrations` version-filters; `ensureInfra` is
  `IF NOT EXISTS`). `[FACT: worker.ts:21-29; adapter.ts:249-251]`

## 4. Acceptance (Definition of Done — testable)
- [ ] `pnpm --filter @vida/web build` + root `pnpm typecheck` green (strict, zero suppressions). `[§XV]`
- [ ] Deps added + pinned (latest stable, React-19 compatible; zod reuses `^4.4.3`): `zustand`,
      `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-form`. Versions verified via context7. `[ADR-001 §22]`
- [ ] `main.tsx` unchanged-bare; `App.tsx` mounts `QueryClientProvider ⊃ RouterProvider`. `[BR-RT-11]`
- [ ] `QueryClient` global defaults exactly `staleTime 30_000 · gcTime 300_000 · retry 1 · refetchOnWindowFocus false`. `[BR-RT-5]`
- [ ] `routes.tsx` root tree renders a root route + not-found; at least one `lazy()` route present. `[BR-RT-8]`
- [ ] **D5 main-thread DB client** — spawns the worker, correlates `{id}` req/resp, promisifies; shaped as an
      `SqliteDriver` proxy (`adapter.ts:60`). `[D5]`
- [ ] **D5 worker protocol extended** — add `run · migrate · exists` (ALIAS `exec`, don't rename — R7); `values`/`batch`
      left as a declared seam commented in the `WorkerRequest` union (worker.ts:31-35). `[D5]`
- [ ] **D5 per-name first-run detection** via `exists(dbName)` (create vs open-existing). `[D5; db/CLAUDE.md]`
- [ ] **D5 app-boot** — `App.tsx`/DB-ready provider starts worker + `open` (which migrates internally, worker.ts:23),
      gates render on DB-ready (loading). No second `migrate` at boot. `[D5]`
- [ ] One app-shell Zustand UI store (UI-only fields per BR-RT-6). `[BR-RT-6]`
- [ ] Form factory wired to a Zod resolver; one reference form validated in a test. `[BR-RT-10]`
- [ ] Reference React Query hook's `queryFn` = `getSchemaVersion(mainThreadDriverProxy)` (no HTTP; no vault-gated `createRepository`). `[BR-RT-3, D4, D5]`
- [ ] **Vitest env configured** in `apps/web/vite.config.ts` (`test.environment` = jsdom/happy-dom + any setup) — none exists today. `[FACT: no test block]`
- [ ] Tests split by env (AR-2 precedent): **route-render + provider mount + D5 client RPC-correlation** under
      jsdom (mock worker); **`getSchemaVersion` read** under the **better-sqlite3 Node stand-in** (NOT OPFS — jsdom
      can't host the VFS). Live OPFS round-trip → Playwright-deferred (LIF-103). `[FACT: web-adapter.test.ts:2,17]`
- [ ] Unit tests also cover: QueryClient global defaults, the store, form validation happy+invalid path. `[§XIX]`
- [ ] Currency §XXIX: `current-*` refreshed to as-built; **ADR-020 + ADR-001:286 pointer** committed WITH the code.
- [ ] Grep-clean: no per-module store/hook/form; no HTTP `queryFn`; no `router/` or `forms/` dir. `[D1,D4]`
- [ ] **Vite drift flagged** (not silently shipped): `apps/web` is `vite ^6.3.5` but ADR-001 §22 mandates `7.x` —
      recorded as a follow-up unit, NOT bumped in AR-4 (build-infra change, own blast radius). `[FACT: apps/web/package.json; ADR-001:302]`
- [ ] Bundle budget (`<80 KB`, BR-RT-8) is **acknowledged as a UI-4/shell-era gate, not an AR-4 DoD** — adding 4
      runtime deps pre-code-split will exceed a naive build; measured when the shell lands. `[INTERP: performance-strategy.md:311]`

## 5. Implementation Prompt (ordered build sequence — feeds gate 2 / Build Steps)
Ordered by dependency then risk (additive, each step leaves the build green):
1. **Deps** — add + pin `zustand`, `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-form` to
   `apps/web/package.json` (versions via context7, latest stable / React-19 compatible; zod reuses `^4.4.3`);
   `pnpm install`. Satisfies §4 deps row. Risk R3: React-19 peer ranges — verify each at add-time.
2. **Test env** — add a `test` block to `apps/web/vite.config.ts` (`environment: 'jsdom'` — or happy-dom — + a
   setup file if needed). Precondition for the route-render tests; none exists today. `[FACT: no test block]`
3. **Worker protocol extension** — extend `apps/web/src/db/worker.ts` to add `run`, `migrate`, `exists`; **ALIAS,
   don't rename** — keep the existing `exec` handler working (R7); drop it only after a grep proves zero consumers.
   Declare `values`/`batch` as a commented TODO seam in the `WorkerRequest` union (worker.ts:31-35). Satisfies the
   D5 protocol row. Risk R7: keep the AR-2 in-worker proof green.
4. **Main-thread DB client** — `apps/web/src/db/client.ts`: spawn the worker, `{id}` req/resp correlation,
   promisified API (reject on `{ok:false}`) shaped as an `SqliteDriver` proxy (`adapter.ts:60`) + `exists` for
   first-run. **Constructor takes an optional worker (default `new Worker`)** so the jsdom test injects a mock. Satisfies D5.
5. **QueryClient** — `apps/web/src/lib/query-client.ts` (§XX `lib/`): export a **module-scope singleton**
   `QueryClient` with BR-RT-5 global defaults (`staleTime 30_000·gcTime 300_000·retry 1·refetchOnWindowFocus false`).
   Module scope — NOT created in a component body — so StrictMode's dev double-invoke can't spawn duplicate clients.
6. **Router** — `apps/web/src/routes.tsx`: root route + not-found + one `lazy()` route. **The existing `app/*`
   stubs are 0-byte (no default export) → `lazy()` would fail; AUTHOR a minimal default-exporting placeholder**
   (e.g. `export default function NotesRoute() { return null }`) in the target `app/*` file. Export a
   **module-scope** router instance (StrictMode). Satisfies BR-RT-8/D3. `[FACT: wc -c app/*/*.tsx = 0]`
7. **Providers + DB-ready boot** — `apps/web/src/App.tsx`: start the worker + `open` via the client (the worker's
   `open` migrates internally, worker.ts:23 — no second `migrate`), gate render on DB-ready (loading state), then
   `QueryClientProvider ⊃ RouterProvider` (keep `main.tsx` bare under StrictMode). Satisfies BR-RT-11 + D5 app-boot.
8. **Zustand pattern + reference** — `apps/web/src/stores/app-shell-ui-store.ts`: one UI-only store (D2/D4/BR-RT-6).
9. **Form factory** — `apps/web/src/lib/forms.ts` (§XX `lib/`): TanStack Form + Zod resolver helper (BR-RT-10).
10. **Reference query** — `apps/web/src/hooks/useSchemaVersion.ts`: `queryFn` = `getSchemaVersion(clientProxy)`
    (`core/index.ts:67`) over the step-4 client (BR-RT-3/D4/D5). NOT `createRepository`.
11. **Tests** (§XIX, env-split per §4; env from step 2): jsdom — route-render, provider mount, D5 client
    RPC-correlation (mock worker); Node/better-sqlite3 — `getSchemaVersion` read; plus QueryClient defaults, store, form happy+invalid.
12. **ADR-020** — author `docs/core/decisions/ADR-020-*.md` (store placement, D2) + amend ADR-001:286 to a one-line
    pointer at it. Confirm no `tsconfig` change is needed (code-based routing avoids the router typegen step; if the
    typed-route inference needs a compiler setting, add it here).
13. **Verify + Currency** — `pnpm --filter @vida/web build` + root `pnpm typecheck` + tests green; grep-clean per §4;
    refresh `current-*` (incl. `web-client-runtime` + the `apps/web/src/db` layer doc's AR-4 line) to as-built (§XXIX).
    Flag the Vite 6→7 drift as a follow-up (do not bump in AR-4).
Done-check = §4.

## 6. Risks & Out-of-scope
**Risks:** (R1) TanStack Router API drift vs training data → verify via context7 before step 4, treat as
`[UNKNOWN]` until confirmed. (R2) TanStack Form + Zod adapter shape changed across versions → verify at step 7.
(R3) React 19 peer-dep conflicts → verify at step 1. (R4) RESOLVED — the reference read is `getSchemaVersion`
(vault-free, exists today), tested via the better-sqlite3 Node stand-in; the OPFS browser path is Playwright-deferred
(LIF-103), not faked in a unit test. (R5) StrictMode dev double-invoke spawning duplicate QueryClient/router →
mitigated by module-scope singleton instantiation (steps 3-4), not component-body creation. (R6) Vite 6→7 drift
(ADR-001 §22) → flagged as a follow-up unit at step 14; NOT bumped in AR-4 (build-infra blast radius).
(R7) **D5 worker protocol extension could regress AR-2's in-worker proof** → keep the existing `open|exec|query|close`
handlers working; add ops additively; the AR-2 Node contract test + a new client RPC test both stay green.
(R8) **D5 grain (values/batch deferred)** — if a live read needs the Drizzle-proxy path sooner than expected, the
seam is declared, not built; escalate via §XXVIII rather than silently widening. (R9) **worker lifecycle under
StrictMode** — the worker is spawned once (module-scope or ref-guarded), not per dev double-mount.

**Out of scope:** per-module stores/hooks/forms/routes · app layout/IA (UX-3) · final shell (UI-4) · editor
mount (UI-3) · encryption/sync wiring · SSR/Server Components (this is a Vite SPA) · mobile/desktop runtimes.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-30 | 2026-07-29-ar-4-state-routing-forms | gate-1 PLAN authored; D1-D4 resolved for Approval 1 |
| 2026-07-30 | 2026-07-29-ar-4-state-routing-forms | independent critique = REVISE → fixed all 3 MUST + 3 SHOULD + 2 NIT (test-env split, getSchemaVersion reference, ADR-020 mechanism, lib/ cite, StrictMode singletons, Vite-drift flag, bundle-budget deferral, tsconfig confirm) |
| 2026-07-30 | 2026-07-29-ar-4-state-routing-forms | **preflight = BLOCKED → resolved**: added D5 (main↔worker DB binding) — the documented AR-4 layer (worker.ts:9) my PLAN omitted. Client proxy + protocol extension + first-run + app-boot; D4 reference query re-routed through it. Victor corrected the manufactured A/B scope fork — the binding is AR-4's by documentation, not a choice. Scope enlarged; needs 2nd critique + Approval 2. |
| 2026-07-30 | 2026-07-29-ar-4-state-routing-forms | **2nd independent critique = SHIP** + fixes: MF-1 (0-byte app/* stubs → author placeholder before lazy()); SF-2 (worker open already migrates → no double-migrate at boot + injectable worker for mock test); SF-3 (alias exec→run, don't rename, per R7); NIT-4 (removed duplicate test-env step); NIT-5 (values/batch seam commented in WorkerRequest union). Gate 2 clear. |
