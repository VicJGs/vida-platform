# IMPLEMENTATION-PLAN (gate 2) — qa-1-e2e-harness-opfs

Session: 2026-08-03-qa-1-e2e-harness-opfs · LIF-103 · profile Add Backend Component · scenario E2E Test Harness
Direction: FOUNDATION framing (re-Approval 1, 2026-08-03 — Victor). Self-sufficient build prompt. No-Guessing: [FACT]/[INTERP]/[UNKNOWN].
Executor: `victor:execute-plan-code` works `## Build Steps` in order; divergence → §XXVIII.

## What changed vs the prior (scaffolding) draft

QA-1 is the **shared browser-E2E foundation**, of which AR-2's verification is the FIRST consumer — not a throwaway proof. Two grounded moves remove ALL disposable artifacts:

- **No throwaway `fixture` table.** Item-2 persistence is proven by writing a **probe row into the durable `app_state`** table (a permanent DB-7 foundation table, `schema/foundation/app-state.ts`) via the shipped `run` op, then reading it back after reload via the shipped `query` op. A real write→reopen→read round-trip on OPFS, using only live ops (`client.ts:142-148`) and no deferred seam. `[FACT app_state persists across reopen: migrations-runner.test.ts:132-142]`
- **The entry + fixtures are the durable backdoor** every downstream browser E2E reuses (UI-3 CRUD, MOD-\* modules, DB-10 seed, UX-6 dashboard). Packaged as a reusable Playwright fixture (`test.extend`), documented as the pattern.

Deferred, each with a landing spot (helps the following issues, does not build their work):

- `values`/`batch` Drizzle-over-worker CRUD E2E → **UI-3** (fills the seam, reuses the `db` fixture).
- `seedVault()`-based fixtures → **DB-10** (plugs into the documented seed extension point).
- real-entity write persistence (user data via Drizzle) → **MOD-\*** (M1.1, reuse the `db` fixture).

## Resolved decisions

- **D1 — durable backdoor via `vite dev`.** `apps/web/e2e/harness.html` + `harness.ts` mount ONE `WorkerDbClient` and expose its LIVE ops on `window.__vidaDb` — NOT `App.tsx` (auto-opens `'vida'`, `App.tsx:19-22`). Dev-only file, not a `rollupOptions.input` → never in `dist/`. Served by `vite dev` (`src/db/*` code under test is identical in dev/preview; preview would ship test code — not worth it). `[INTERP]` residual, documented.
- **D2 — item-2 persistence anchor = `app_state` probe row** (not a throwaway table, not the Drizzle seam). See above.
- **D3 — reusable fixture.** `apps/web/e2e/fixtures.ts` = `test.extend` providing `db` (backdoor over live ops) + auto OPFS reset. This is the artifact downstream imports. Seed hook is a documented extension point (comment), NOT a built stub (no dead code).
- **D4 — CI wiring.** `e2e` turbo task (`dependsOn ^build`, `cache:false`) + `test:e2e` script + Playwright job in `ci.yml`, mirroring `ci.yml:56-75`.

## Build Steps

- [ ] **B1 — Playwright dep.** Add `@playwright/test` (pin current) to `apps/web` devDependencies; run `pnpm install` at repo root and **commit the regenerated `pnpm-lock.yaml`** (BLOCKING-1: `ci.yml` all use `--frozen-lockfile` — an un-updated lockfile fails every CI job, not just e2e).
- [ ] **B2 — durable backdoor entry.** `apps/web/e2e/harness.html` (minimal, loads `./harness.ts` type=module) + `apps/web/e2e/harness.ts`: construct ONE `WorkerDbClient` (from `../src/db/client`); assign `window.__vidaDb` = `{ open(name), exists(name), migrate(), run(sql,params?), query(sql,params?), close() }` mapping to `client.open/exists/migrate` + `client.driver.run/query/close`. **Does NOT auto-open** (BR7). LIVE ops only — never `exec`/`values`/`batch` (BR2; they throw, `client.ts:154-162`). Type via `declare global { interface Window { __vidaDb: VidaDbBackdoor } }`.
- [ ] **B3 — reusable fixtures.** `apps/web/e2e/fixtures.ts`: `export const test = base.extend<{ db: VidaDbBackdoor }>({ db: async ({ page }, use) => { await page.goto('/e2e/harness.html'); /* OPFS reset — BR8 */ await page.evaluate(async () => { const root = await navigator.storage.getDirectory(); try { await root.removeEntry('vida', { recursive: true }) } catch {} }); const api = { open:(n)=>page.evaluate(n=>window.__vidaDb.open(n),n), exists:(n)=>page.evaluate(n=>window.__vidaDb.exists(n),n), run:(sql,params)=>page.evaluate(a=>window.__vidaDb.run(a[0],a[1]),[sql,params]), query:(sql,params)=>page.evaluate(a=>window.__vidaDb.query(a[0],a[1]),[sql,params]), close:()=>page.evaluate(()=>window.__vidaDb.close()) }; await use(api) } })`. **Distinct-named args passed as a tuple** (BLOCKING-2: avoid the `([s,p])` param-shadow foot-gun). Reset runs at goto BEFORE any open (BR7 → no VFS handles held → `removeEntry` safe). `reload` (persistence) does NOT reset. Add a comment marking the **seed extension point** (DB-10 `seedVault` plugs in here). `export { expect } from '@playwright/test'`. **Serialization ceiling (document in B10):** `page.evaluate` returns must be JSON-serializable — `query` object-rows are fine, but a `bigint` (`web-driver.ts:69-73` `lastInsertRowId`) or `Date` would throw; downstream reuse must stringify such values in the harness before they cross the boundary.
- [ ] **B4 — Playwright config.** `apps/web/e2e/playwright.config.ts`: `testDir:'.'`, Chromium headless, `fullyParallel:false`, `workers:1`, `webServer:{ command:'pnpm --filter @vida/web dev -- --port 5173 --strictPort', url:'http://localhost:5173', reuseExistingServer:!process.env.CI }`, no COOP/COEP. Port pinned + `strictPort` (else Vite increments → `url` mismatch → hang). Clean OPFS is via the B3 reset, NOT context isolation (Playwright doesn't reset OPFS — #29901).
- [ ] **B5 — the verification smoke** `apps/web/e2e/db-persistence.spec.ts` (`import { test, expect } from './fixtures'`; `*.spec.ts` → outside vitest `src/**/*.test`, `vite.config.ts:28`): - **test 1 — item 1 (open/reopen, no passphrase):** `expect(await db.exists('vida')).toBe(false)` (post-reset baseline); `await db.open('vida')`; `await page.reload()`; `expect(await db.exists('vida')).toBe(true)`. (`exists` probes VFS without open — `worker.ts:72-76`.) - **test 2 — item 2 (OPFS persistence, durable `app_state` probe):** `await db.open('vida')` (migrate bootstraps `app_state` via `ensureInfra`, `runner.ts:65`); `await db.run("INSERT OR REPLACE INTO app_state (key,value) VALUES ('e2e:probe','persisted-v1')")` (durable table, live `run`); `await page.reload()`; `await db.open('vida')` again (BR7 — reloaded worker's driver is null, `worker.ts:80`); `expect(await db.query("SELECT value FROM app_state WHERE key='e2e:probe'")).toEqual([{ value:'persisted-v1' }])`. Proves a written row survived a full worker teardown on OPFS (BR6). NOTE: use a **probe key** (not `schema_version`, which `migrate()` always restores to LATEST regardless of persistence — it would not distinguish a persisted DB from a re-migrated fresh one). - Each assertion comments the AR-2 item it proves (BR5). Waits are on the RPC/evaluate promise, never `sleep` (BR4).
- [ ] **B6 — scripts + turbo.** `apps/web/package.json`: `"test:e2e":"playwright test"`. `turbo.json`: `"e2e":{ "dependsOn":["^build"], "cache":false }`.
- [ ] **B7 — CI job.** `ci.yml`: add an `e2e` job mirroring `ci.yml:56-75` (checkout → pnpm@9 → node `.nvmrc` → `pnpm install --frozen-lockfile` → `pnpm --filter @vida/web exec playwright install --with-deps chromium` → `pnpm turbo run e2e`), `TURBO_TELEMETRY_DISABLED:1`.
- [ ] **B8 — run + verify (the harness IS the verification).** Local: `pnpm --filter @vida/web exec playwright install chromium` → `pnpm --filter @vida/web test:e2e` → 2/2 green. Re-run once (flake, BR4). `pnpm turbo run test typecheck` still green (e2e outside app `tsconfig include:['src']` → app typecheck unaffected, NIT-1).
- [ ] **B9 — close AR-2.** On green: check `[x]` AR-2 `_index.md` §2 item 1 (open/reopen) + item 2's **OPFS-persistence substance PROVEN**; add the note that the _Drizzle-write-path_ variant of item 2 rides UI-3 (the `values`/`batch` seam); record closure in AR-2 change log.
- [ ] **B10 — foundation docs + Currency (§XXIX).** Birth `apps/web/e2e/CLAUDE.md` (the foundation: the `db` backdoor + `test` fixture, OPFS-reset, the `app_state` persistence pattern, the seed/CRUD extension points for DB-10/UI-3/MOD-\*, **and the JSON-serialization ceiling** — backdoor returns must be JSON-serializable; stringify `bigint`/`Date` in the harness). Note the e2e context under `docs/infrastructure/web-client-runtime` currency. Update QA-1 `_index` status. **Commit set MUST include `pnpm-lock.yaml`** (B1) alongside docs + code.

## Acceptance (gate-2, testable — mirrors \_index §2)

1. `pnpm --filter @vida/web test:e2e` → 2/2 green, headless Chromium, no COOP/COEP.
2. Item 1: post-reset `exists`=false → open → reload → `exists`=true.
3. Item 2: `app_state` probe row read back after reopen (OPFS persistence), via live `run`/`query`, no throwaway table.
4. `pnpm turbo run e2e` green; `ci.yml` `e2e` job added; no vitest/typecheck regression.
5. Reusable `db` fixture + OPFS-reset in `fixtures.ts`; seed/CRUD extension points documented; `apps/web/e2e/CLAUDE.md` born; AR-2 §2 items closed with the UI-3 note; QA-1 `_index` updated.
6. Zero throwaway: no `fixture` table; no deferred seam touched (`exec`/`values`/`batch` never called); no `destroy` op added; harness absent from `dist/`.

## Failure modes to guard (scenario On Failure → victor:triage)

- Flake from timing → waits on the RPC/evaluate promise; `page.reload()` awaited.
- `exists`/probe true on first run → the B3 OPFS reset didn't run (BR8) OR the real app auto-booted (BR7 — wrong entry). NOT fixable by context isolation (#29901).
- `removeEntry` "in use" → a DB opened before the reset (handles held); reset MUST run on fresh goto before any open (BR7 guarantees no auto-open).
- Worker/wasm 404 or dev-server hang → `optimizeDeps.exclude:['wa-sqlite']` + `assetsInclude` (`vite.config.ts:14-17`); port pinned `--strictPort`.
- Item-2 false-green if using `schema_version` → use the `e2e:probe` key (migrate always restores schema_version to LATEST; it wouldn't distinguish persisted vs re-migrated).
