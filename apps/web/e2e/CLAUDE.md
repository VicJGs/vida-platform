# Browser E2E foundation (apps/web/e2e) — Vida Platform

# Auto-read by Claude when editing files in this directory.

# Born by QA-1 (LIF-103). This is SHARED infrastructure — extend it, don't fork it.

## What this layer is

The repo's browser E2E foundation (Playwright + real wa-sqlite/OPFS worker). It exists because
`FileSystemSyncAccessHandle` is worker-only — jsdom/Node cannot exercise `apps/web/src/db/{worker,web-adapter,
web-driver}.ts`. QA-1's own smoke (`db-persistence.spec.ts`) is the FIRST consumer; every downstream browser test
(UI-3 editor CRUD, MOD-\* persistence, DB-10 seed, UX-6 dashboard) reuses this same foundation.

## The pieces

- `../playwright.config.ts` (at the web-app ROOT, not here) — Chromium, `testDir:'./e2e'`, `webServer` = `vite dev`
  on a **pinned** `--port 5173 --strictPort`, `workers:1`. Config lives at the app root so `pnpm --filter @vida/web
exec playwright test` (CWD = apps/web) discovers it and does NOT scan `src/**/*.test.ts` (those are Vitest files).
- `harness.html` + `harness.ts` — the **test-only DB backdoor**. Mounts one `WorkerDbClient` and exposes its LIVE
  ops on `window.__vidaDb`. Dev-served by Vite; NOT a build input → never in `dist/`. Deliberately does NOT
  auto-open (unlike `App.tsx`, which opens `'vida'` on mount) so a clean first-run baseline is observable.
- `fixtures.ts` — **the reusable surface.** `test.extend` providing `db` (the backdoor) + a per-test OPFS reset.
  Import `{ test, expect }` from here in every browser spec.
- `db-persistence.spec.ts` — QA-1's AR-2 proof (open/reopen + OPFS persistence).
- **Production-build boot smoke lives OUTSIDE this folder** — `../playwright.prod.config.ts` + `../e2e-prod/boot.spec.ts`
  (LIF-250): `vite build` + `vite preview` on port 4174, drives the REAL app boot (this harness bypasses it — which is how
  the boot-timeout defect stayed latent). OPFS is wiped from a route-served blank same-origin page. Run:
  `pnpm --filter @vida/web test:e2e:prod`; `e2e` runs both suites (CI's `turbo run e2e`).

## Patterns / gotchas

- **Clean OPFS = explicit reset, NOT context isolation.** Playwright does not reset OPFS between contexts
  (microsoft/playwright#29901). The `db` fixture wipes `/vida` via `navigator.storage…removeEntry` at setup, on a
  fresh harness page BEFORE any open (no VFS handles held → no "in use" throw).
- **Reopen = `page.reload()`** (fresh page → fresh worker; OPFS persists in the same origin). Re-`open()` after a
  reload before querying — the reloaded worker's driver is null.
- **Persistence proof uses the durable `app_state` table**, not a throwaway table, and a **probe key** — NOT
  `schema_version` (which `migrate()` always restores to LATEST, so it can't distinguish persisted from re-migrated).
- **Live ops only.** The backdoor exposes `open/exists/migrate/run/query/close`. `exec`/`values`/`batch` are a
  deferred Drizzle-proxy seam (UI-3/M1.1+) and are never exposed.
- **Serialization ceiling.** Backdoor return values cross `page.evaluate` and MUST be JSON-serializable. `query`
  object-rows are fine; a `bigint` (`web-driver.ts` `lastInsertRowId`) or `Date` would throw — stringify in the
  harness before returning if a future consumer needs them.
- **Local run caveat.** The browser run requires a Playwright-supported OS (ubuntu in CI, or macOS 13+). macOS 12
  cannot download the Chromium build; use `playwright test --list` locally and rely on the CI `e2e` job to run.

## Extension points (how the following issues plug in — do not fork this)

- **DB-10** — export `seedVault(db, deviceId)` from `@vida/core`; add a `seededDb` fixture in `fixtures.ts` layering
  on `db` (marked in-file). MOD-\* then add `seedMyModule(db)` per module.
- **UI-3** — fills the worker `values`/`batch` seam; adds an editor CRUD/Drizzle-write persistence spec using `db`.
- **MOD-\*** (M1.1+) — per-module persistence specs, reusing `db` + the seed fixtures.

## CI

`e2e` turbo task (`dependsOn ^build`, `cache:false`) → `.github/workflows/ci.yml` `e2e` job installs Chromium
(`playwright install --with-deps chromium`) and runs `pnpm turbo run e2e`.
