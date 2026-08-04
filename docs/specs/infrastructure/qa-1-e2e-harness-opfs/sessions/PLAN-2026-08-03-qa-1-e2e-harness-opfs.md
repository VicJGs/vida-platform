# PLAN (gate 1) — qa-1-e2e-harness-opfs
Session: 2026-08-03-qa-1-e2e-harness-opfs · LIF-103 · profile Add Backend Component · scenario E2E Test Harness
No-Guessing: [FACT: src] / [INTERP] / [UNKNOWN]. This is the DIRECTION gate — the build steps are gate 2.

## Executive summary
Stand up the repo's **shared browser-E2E foundation** under `apps/web/e2e/` — a reusable `db` backdoor fixture +
OPFS-reset (`test.extend`) that the 25+ downstream browser tests reuse (UI-3 CRUD, MOD-* persistence, DB-10 seed,
UX-6 dashboard) — and make **AR-2's verification its first consumer**: one smoke proves AR-2's two deferred items
on the **real** wa-sqlite/OPFS path a Node/`:memory:` test cannot reach. Reuses AR-4's `WorkerDbClient` and shipped
ops only (`open`/`exists`/`migrate`/`run`/`query`/`close`); builds no deferred Drizzle-over-worker surface. **Zero
throwaway**: item-2 persistence proves against the durable `app_state` table (not a synthetic `fixture` table). On
green it closes AR-2 item 1 + item 2's persistence substance. Extension points (seed / CRUD / per-module) are left
documented for DB-10 / UI-3 / MOD-* to plug into — the foundation is extended, never replaced.

## Context (as-is, grounded)
- `[FACT web-adapter.ts:5-8]` `AccessHandlePoolVFS` needs `FileSystemSyncAccessHandle` → **worker-only**; jsdom/Node cannot exercise `web-adapter.ts`/`web-driver.ts`/`worker.ts`.
- `[FACT worker.ts:38-45]` worker protocol: `open · exists · migrate · run · exec · query · close`. `[FACT worker.ts:35-37]` `values`/`batch` (Drizzle-proxy write path) DEFERRED → UI-3/M1.1+.
- `[FACT client.ts:56-163]` `WorkerDbClient` — spawns the worker (Vite-bundled URL, `:53`), correlates `{id}` RPC, exposes `open`/`exists`/`migrate`/`close`/`terminate` + `driver.query`/`driver.run` (live); `driver.exec`/`values`/`batch` throw the seam error (`:44,154-162`).
- `[FACT boot.ts:13]` `DB_NAME = 'vida'`; `getDbClient()` memoized singleton, `ensureDbReady()` one-time open+migrate.
- `[FACT web-adapter.ts:79-82]` `exists()` = `vfs.getSize() > 0` (VFS-pool level, single-vault M1.0 — not per-name).
- `[FACT app-state.ts + runner.ts:50-70 + adapter.ts:226-234]` `app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)` is a **durable** DB-7 foundation table; `migrate()` (called by `open`, `worker.ts:23`) bootstraps it via `ensureInfra` and writes `schema_version`. Its persistence across reopen is proven in Node (`migrations-runner.test.ts:132-142`). → item-2 writes a **probe row** here (via `run`) and reads it back after reload — no throwaway table. NB: use a probe key, NOT `schema_version` (migrate always restores it to LATEST → wouldn't distinguish persistence).
- `[FACT db/CLAUDE.md:17]` non-Asyncify VFS → no SharedArrayBuffer → **no COOP/COEP** headers required.
- `[FACT App.tsx:19-22]` the app shell opens+migrates `'vida'` on mount (`useEffect → ensureDbReady() → getDbClient().open('vida')`, `boot.ts:36-46`) — so **driving the real app page auto-creates the OPFS file before a test can probe first-run**. (Found by the gate-1 critique; the item-1 correctness precondition.)
- `[FACT vite.config.ts:14-29]` Vite already: `worker.format='es'` + `optimizeDeps.exclude:['wa-sqlite']` + `assetsInclude:['**/*.wasm']` (module-worker + wasm resolution intact, no COOP/COEP); vitest `test.include=['src/**/*.test.{ts,tsx}']` env `node` → Playwright specs at `apps/web/e2e/*.spec.ts` fall outside it (no collision).
- `[FACT]` No `apps/web/e2e/`, no `playwright.config.*`, no Playwright dep exist yet — net-new.

## Business rules (BR — the invariants the harness must hold)
- **BR1 — real runtime, never stubbed.** The smoke drives the actual wa-sqlite/OPFS worker path; mocking the VFS/worker/DB would defeat the issue's entire purpose. `[anti-pattern: scenario §Anti-Patterns]`
- **BR2 — shipped surface only.** Uses `open`/`exists`/`run`/`query` (+ `close`); never `exec`/`values`/`batch` (deferred seam) — building those would pull UI-3/M1.1 back across `← AR-2`.
- **BR3 — reuse, don't rebuild.** Drive `WorkerDbClient` (`client.ts`); do not hand-roll `{id}` message plumbing.
- **BR4 — determinism.** Wait on observable state (RPC promise resolved, value present), never on `sleep(ms)`. Reopen = `page.reload()` (stays IN the same browser context → OPFS persists — that is exactly what proves item 2).
- **BR5 — assertions map 1:1 to AR-2 items.** "Runs green" is insufficient — each assertion names the AR-2 item it proves.
- **BR6 — persistence across reload** (AR-2's BR6, `IMPLEMENTATION-PLAN…:173`): a written row survives a full worker teardown+reopen on OPFS — proven via a probe row in the **durable `app_state`** table (no throwaway table).
- **BR9 — reusable foundation.** The backdoor + reset live in `e2e/fixtures.ts` as a `test.extend` fixture (`db` + OPFS-reset), the durable surface downstream imports — not inlined in one spec. The AR-2 smoke is its first consumer.
- **BR10 — extended, not replaced.** Leave documented extension points (seed hook for DB-10 `seedVault`; the `db` fixture for UI-3's `values`/`batch` CRUD E2E and MOD-* per-module persistence). Build NO stub/dead code for them (No-Guessing) — a comment + the `CLAUDE.md` layer doc.
- **BR7 — controlled boot (item-1 precondition, from gate-1 critique).** The smoke drives a **bare e2e entry** that mounts `WorkerDbClient` directly and does NOT auto-open the DB — NOT `App.tsx`, which opens+migrates `'vida'` on mount (`App.tsx:19-22`). Otherwise item-1's first-run `exists('vida')=false` baseline is destroyed before the test runs.
- **BR8 — clean first-run via explicit OPFS wipe (revised at gate-2 critique).** `exists()` is VFS-pool-level (`web-adapter.ts:79-82`; ignores `_dbName`), so the "=false" baseline requires an empty OPFS pool. **Playwright does NOT reset OPFS between contexts** (issue #29901; the reset PR #29921 was merged then reverted) — context isolation is insufficient. Establish the empty pool with an explicit `beforeEach` wipe — `navigator.storage.getDirectory().removeEntry('vida', { recursive:true })` via `page.evaluate`, on a freshly-loaded bare entry BEFORE any open/exists (BR7 → no handles held). `destroy()` stays unexposed over the worker (`worker.ts:38-45`); the wipe goes direct through `navigator.storage`.

## Contract / structure (what lands — shapes; exact build steps = gate 2 IMPLEMENTATION-PLAN)
- `apps/web/e2e/playwright.config.ts` — Chromium headless, `webServer:'pnpm --filter @vida/web dev -- --port 5173 --strictPort'`, `workers:1`, no COOP/COEP.
- `apps/web/e2e/harness.html` + `harness.ts` — the durable **backdoor** (BR7): mounts `WorkerDbClient`, exposes live ops on `window.__vidaDb`; NOT `App.tsx`; dev-only, never in `dist/`.
- `apps/web/e2e/fixtures.ts` — the reusable `test.extend` (BR9): `db` backdoor + OPFS-reset (BR8) + documented seed extension point (BR10).
- `apps/web/e2e/db-persistence.spec.ts` — the first consumer: item 1 (reset → `exists`=false → open → `reload` → `exists`=true) + item 2 (probe row in `app_state` persists across reopen).
- `apps/web/e2e/CLAUDE.md` — foundation layer-doc (the fixture, the pattern, the extension points).
- CI/scripts: `e2e` turbo task + `test:e2e` + `ci.yml` job (Playwright + Chromium).
- `@playwright/test` dev-dep on `apps/web` (ADR-001 §16 names Playwright — `/adr-check` clean).

## Acceptance
→ Mirrors `_index.md §2` (the durable DoD). Direction-level: the harness exists, the smoke proves items 1 & 2 on the
real OPFS path via the shipped protocol, green in CI, and AR-2 items 1 & 2 are checked off with the deferral note.

## Out of scope (deferred — with owner)
- Drizzle-over-worker write assertion → UI-3/M1.1+ (the `values`/`batch` seam).
- Real entity-table CRUD → per-module M1.1+ (DB-3/DB-4 schema streams).
- Exhaustive app-flow E2E; mobile/desktop harness; encryption (M3).

## Risks / open questions (resolve before or in gate 2)
- [RESOLVED → BR7, gate-1 critique] test entry must be a **bare, non-auto-booting** entry — `App.tsx:19-22` auto-opens `'vida'`. Exact form (static HTML vs dev-only route) → gate 2.
- [RESOLVED → BR8, gate-1 critique] clean first-run via fresh `browser.newContext()` per test; `exists()` pool-level confirmed (`web-adapter.ts:79-82`).
- [UNKNOWN — gate 2] CI Chromium + OPFS availability on the runner; where the `e2e` task wires into the turbo pipeline + `apps/web` scripts.
- [UNKNOWN — gate 2] confirm `vite preview` serves the module worker + `.wasm` identically to dev (the shipped-bundle path, not just dev).
