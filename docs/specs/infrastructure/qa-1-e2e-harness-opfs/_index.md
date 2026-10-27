# Spec: infrastructure:qa-1-e2e-harness-opfs

Status: planned (gate-1 PLAN drafted) — LIF-103 · M1.0 #8 · profile Add Backend Component · scenario E2E Test Harness
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: src] / [INTERP] / [UNKNOWN].
Session split: the Business-Rules / Contract / build-steps live in `sessions/` (gate files), NOT here.

## 1. Identity

QA-1 is the repo's **shared browser-E2E foundation** (Playwright + OPFS/worker) at `apps/web/e2e/` — a
reusable `db` backdoor fixture + OPFS-reset that **every downstream browser test reuses** (UI-1/2/3/4, UX-3/6,
MOD-notes + all MOD-\*, DB-10 — the downstream sweep found 25+ consumers). AR-2's verification is the
**first consumer**, not the whole point: one smoke proves AR-2's two deferred items on the real wa-sqlite/OPFS
path the Node/`:memory:` contract test structurally cannot reach (`FileSystemSyncAccessHandle` is worker-only).
`[FACT: docs/specs/components/ar-2-database-adapter-web/_index.md:23-24,31-33,46-47; apps/web/src/db/web-adapter.ts:5-8]`

**Provenance.** Born in AR-2's build commit (`e55010f`, 2026-07-27) from AR-2's completeness audit; AR-2 closed on
contract (5/7 DoD) and spun the verification out. §5 row added in the 2026-07-28 full-graph reconcile
(`m1.0-delivery-plan.md:272`); homed at M1.0 #8, leaf, `← AR-2` only (`reconstructed-structure.md:62`).

**Grounded scope + zero-throwaway decision (Victor, 2026-08-03).** AR-2 item 2 says "write a row **via
Drizzle**" (`_index.md:24`), but the Drizzle-proxy write path over the worker (`values`/`batch`) is an
**explicitly deferred seam → UI-3/M1.1+** (`worker.ts:35-37`; `client.ts:44,152-162`). QA-1 proves item 2's
**OPFS-persistence substance** by writing a **probe row into the durable `app_state` table** (a permanent DB-7
foundation table, `schema/foundation/app-state.ts`) via the shipped `run` op and reading it back after reload
via `query` — a real write→reopen→read round-trip, **no throwaway `fixture` table, no deferred seam**
(`[FACT app_state persists across reopen: packages/core/src/db/tests/migrations-runner.test.ts:132-142]`). The
literal Drizzle-over-worker write assertion rides UI-3; the Drizzle contract stays Node-proven
(`web-adapter.test.ts:75-120`). QA-1 stays within `← AR-2`.

**Foundation, extended not replaced (helps the following issues):** the `db` backdoor fixture + OPFS-reset are
durable and reused downstream. Documented extension points — **DB-10** `seedVault()` plugs into the seed hook;
**UI-3** fills the `values`/`batch` seam + adds the CRUD/Drizzle-write E2E using the `db` fixture; **MOD-\***
(M1.1) reuse it for per-module persistence. Nothing built here is trashed later.

**What it is NOT:** not a Drizzle-over-worker write op (UI-3/M1.1+); not real entity-table CRUD (schema streams
in per-module, DB-3/DB-4, M1.1+); not an exhaustive app-flow E2E suite (later); not a mobile/desktop harness;
not encryption (M3). **Zero throwaway** — no synthetic `fixture` table (persistence proves against durable `app_state`).

## 2. Acceptance (durable — testable DoD)

- [ ] Playwright runs **headless Chromium** against `@vida/web`, served by Vite; module workers + OPFS available; **no COOP/COEP headers** (non-Asyncify VFS — `apps/web/src/db/CLAUDE.md:17`).
- [ ] **Item 1 (AR-2 §2.1) — open/reopen across reload, no passphrase:** driven via a **bare e2e entry** (NOT `App.tsx`, which auto-opens+migrates `'vida'` on mount — `App.tsx:19-22`) in a **fresh `browser.newContext()`**: first-run `exists('vida')` = false → `open` → `page.reload()` (fresh worker, same context) → `exists('vida')` = true.
- [ ] **Item 2 (AR-2 §2.2) — OPFS persistence:** `run` a probe row into the **durable `app_state`** table (`INSERT OR REPLACE … 'e2e:probe'`) → reload → reopen → `query` reads it back — proving a written row survived on the real OPFS wa-sqlite path. **No throwaway table**; **not** the `schema_version` key (migrate always restores it → wouldn't distinguish persistence).
- [ ] The harness reuses `WorkerDbClient` (`client.ts`) via a **reusable `db` fixture** (`e2e/fixtures.ts`, `test.extend`) + OPFS-reset — the durable surface downstream reuses; touches **no** deferred `exec`/`values`/`batch` op.
- [ ] Extension points documented (not built): DB-10 `seedVault()` seed hook · UI-3 `values`/`batch` CRUD E2E · MOD-\* per-module persistence — all reuse the `db` fixture.
- [ ] Green in **CI** (`e2e` job); documented as the browser-path complement to the Node contract test.
- [ ] On green: check off AR-2 `_index.md` §2 item 1 + item 2's OPFS-persistence substance; note the Drizzle-write-path variant rides UI-3; record closure.
- [ ] `[C]/[L]` currency: birth `apps/web/e2e/CLAUDE.md` (the foundation + extension points); relate to `docs/infrastructure/web-client-runtime` currency.

**Status: IMPLEMENTED + VERIFIED (B1–B10 complete). E2E suite 2/2 green, twice (no flake), in a real Chromium worker (Brave via `PW_EXECUTABLE_PATH`) on macOS 12. Zero regression (web typecheck ✓, web 21/21, core 169/169). AR-2 items 1 & 2 CLOSED (7/7). Not yet committed/pushed (branch `qa-1-e2e-harness-opfs`).**

### B8 verification — how it was run on macOS 12

- **Env blocker (J-1):** `sw_vers` = macOS 12.7.6; `@playwright/test@1.62` dropped mac-12 _bundled_ Chromium (`does not support chromium on mac12`). Not a code defect.
- **Resolution:** system **Brave** (Chromium-family, found in `/Applications`) driven via a new env-gated `launchOptions.executablePath` in `playwright.config.ts` (`PW_EXECUTABLE_PATH`) — local-only; unset in CI → CI uses installed Chromium. Result: 2/2 green, deterministic.

### Two bugs the live-smoke caught (why running it mattered)

- **§XXVIII deviation (config discovery):** plan put `playwright.config.ts` in `e2e/`; `playwright test` (CWD=`apps/web`) didn't find it there, fell back to defaults, scanned `src/**/*.test.ts` (Vitest → `import 'vitest'` crash). FIX: config at `apps/web/playwright.config.ts`, `testDir:'./e2e'`.
- **Vite dev reload race:** first page load triggers a one-time dep-optimization full reload → destroyed an in-flight `evaluate` (item-1 failed, item-2 passed once warm). FIX: `page.waitForFunction(() => window.__vidaDb)` in the fixture absorbs the reload before any op.
- **CI residual:** the E2E job runs real Chromium on ubuntu (still to be confirmed on first CI run); the `PW_EXECUTABLE_PATH` path is local-only and untouched there.

## 3. Contract · 4. Business Rules · 5. Build steps

→ In the session gate files (gated build, session-split):

- **Gate 1 (direction):** [`sessions/PLAN-2026-08-03-qa-1-e2e-harness-opfs.md`](sessions/PLAN-2026-08-03-qa-1-e2e-harness-opfs.md)
- **Gate 2 (build):** `sessions/IMPLEMENTATION-PLAN-2026-08-03-qa-1-e2e-harness-opfs.md` _(written after Approval 1)_

## 6. Open UNKNOWNs / decisions

- [DECIDED, Victor 2026-08-03] FOUNDATION framing (re-Approval 1): QA-1 = the shared browser-E2E foundation (reusable `db` fixture + OPFS-reset + documented extension points), AR-2 verification is its first consumer. Zero throwaway. See §1.
- [DECIDED, Victor 2026-08-03] Item-2 persistence anchor = a probe row in the **durable `app_state`** table via shipped `run`/`query` (no throwaway `fixture` table). Drizzle-over-worker write deferred to UI-3. See §1.
- [DECIDED, this spec] `destroy()` is not exposed over the worker protocol and is not being added; OPFS reset goes direct via `navigator.storage…removeEntry('vida')`.
- [DECIDED, gate-1 critique 2026-08-03] Item-1 precondition BR7: a **bare non-auto-booting** test entry — `App.tsx:19-22` opens+migrates `'vida'` on mount.
- [DECIDED + CORRECTED, gate-2 critique 2026-08-03] BR8 clean OPFS = **explicit `beforeEach` wipe** via `navigator.storage…removeEntry('vida')`, NOT context isolation — Playwright does not reset OPFS between contexts (#29901; reset PR reverted). `webServer` = `vite --port 5173 --strictPort` (port pinned, gate-2 BLOCKING-2). (The gate-1 "fresh context / vite preview" note was superseded.)
- [RESOLVED, gate 2] Test entry = bare `e2e/harness.html`+`harness.ts` exposing the client on `window.__vidaDb`, wrapped by the `db` fixture; served by `vite dev` (dev-only, never in `dist/`).
- [RESOLVED, gate 2] CI = `e2e` turbo task + `test:e2e` + a Playwright `ci.yml` job with `playwright install --with-deps chromium`; headless Chromium supports OPFS.
- [DECIDED, B8 verification] `playwright.config.ts` reads `PW_EXECUTABLE_PATH` → `launchOptions.executablePath` — a local escape hatch for Playwright-unsupported OSes (macOS 12 here → drove system Brave). Unset in CI → installed Chromium. Does not affect the shipped path.

## 7. Change Log

| Date       | Session                          | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-03 | 2026-08-03-qa-1-e2e-harness-opfs | thin index + gate-1 PLAN drafted; provenance traced; item-2 grounded reading decided (Victor)                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-03 | 2026-08-03-qa-1-e2e-harness-opfs | gate-1 independent critique → REVISE; fixed 2 BLOCKING (BR7 bare non-auto-booting entry vs `App.tsx` auto-boot; BR8 clean OPFS); item-2 reading confirmed sound → **Approval 1**                                                                                                                                                                                                                                                                           |
| 2026-08-03 | 2026-08-03-qa-1-e2e-harness-opfs | gate-2 IMPLEMENTATION-PLAN written (B1–B9) + independent executability critique → REVISE; fixed 2 BLOCKING (BR8 premise: Playwright doesn't reset OPFS #29901 → explicit wipe; webServer port-pin); reload/RPC/turbo confirmed sound                                                                                                                                                                                                                       |
| 2026-08-03 | 2026-08-03-qa-1-e2e-harness-opfs | **RE-PLANNED to FOUNDATION framing** (Victor: nothing wasted, help the following issues, grounded in docs + downstream). Two downstream/docs sweeps: 25+ consumers; `app_state` confirmed durable persistence anchor (no throwaway table). Rewrote to reusable `db` fixture + OPFS-reset + extension points (DB-10 seed / UI-3 CRUD / MOD-\* persistence); item-2 via `app_state` probe row. Re-Approval 1 (direction) granted → gate-2 rewritten (B1–B10) |
| 2026-08-03 | 2026-08-03-qa-1-e2e-harness-opfs | independent critique of the rewritten gate-2 → core `app_state`-probe mechanism confirmed SOUND (true persistence discriminator, no seam, invariants hold); REVISE → 2 BLOCKING fixed (B1 commit regenerated `pnpm-lock.yaml` else all `--frozen-lockfile` CI jobs break; B3 `page.evaluate` tuple-arg + JSON-serialization ceiling documented). Approved → implemented                                                                                    |
| 2026-08-04 | 2026-08-03-qa-1-e2e-harness-opfs | **IMPLEMENTED B1–B10 + VERIFIED.** Live-smoke caught 2 bugs (config-discovery → config to app root `testDir:'./e2e'`; Vite dep-optimize reload race → `waitForFunction` in fixture). Ran on macOS 12 via system Brave (`PW_EXECUTABLE_PATH` escape hatch) → **2/2 green, twice, no flake**. Zero regression (web typecheck ✓, web 21/21, core 169/169). AR-2 items 1 & 2 CLOSED (7/7). Not committed/pushed.                                               |
