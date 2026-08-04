# Spec: component:ar-2-database-adapter-web
Status: implemented + VERIFIED — items 1 & 2 (browser open/reopen/persist) proven by QA-1/LIF-103 (2026-08-04). 7/7 DoD (item-2 Drizzle-write variant → UI-3/M1.1+).
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: src] / [INTERP] / [UNKNOWN].
Session split: the deep Business-Rules/Contract/build-steps live in `sessions/` (gate files), NOT here.

## 1. Identity
AR-2 makes a **targeted change** to the platform-agnostic **`DatabaseAdapter`** (`packages/core/src/db/adapter.ts`
— optional encryption seam) and builds its **web implementation** (`apps/web/src/db/`): an **asynchronous** driver
(wa-sqlite sync WASM build + `AccessHandlePoolVFS`) running in a **Web Worker**, with the Drizzle instance built via
**`drizzle-orm/sqlite-proxy`** (`DrizzleDb` is `'async'`). It is the boot-time seam that opens the local SQLite DB
and hands the repository a typed Drizzle instance — the **critical-path root** of M1.0 (6 issues inherit it).
`[FACT: docs/roadmap/m1.0-delivery-plan.md §5 AR-2 "async Drizzle proxy"; blocked-by ar-1✅/db-1✅]`

> **Direction note (2026-07-27):** the initial gate-1/2 direction was a *synchronous* driver; a build-time [VERIFY]
> found wa-sqlite@1.0.0's Factory API is **async-only** (`sqlite-api.js:742-750`), so a sync driver is impossible.
> Corrected to the delivery-plan's async Drizzle proxy (Victor confirmed). See `sessions/*` Rev 3.

**What it is NOT:** not the repository vault-decoupling (DB-6), not filling migrations (DB-7), not FTS5 (DB-8),
not SQLCipher activation (M3), not the native mobile/desktop adapters (later).

## 2. Acceptance (durable — testable DoD)
- [x] **[VERIFIED by QA-1 / LIF-103, 2026-08-04]** Web app opens a **fresh** DB (first run) and **reopens** an existing one across reload — **no passphrase**. *(proven in a real Chromium worker: `apps/web/e2e/db-persistence.spec.ts` item 1, green.)*
- [x] **[VERIFIED by QA-1 / LIF-103, 2026-08-04 — persistence substance]** Round-trip persists: a written row survives reopen (OPFS persistence proven) — proven against the durable `app_state` table via the shipped `run`/`query` path (`db-persistence.spec.ts` item 2, green). *(The literal "via Drizzle" write path over the worker — `values`/`batch` — is a deferred seam → **UI-3/M1.1+**, which will add that assertion using QA-1's `db` fixture; the Drizzle write contract stays Node-proven, `web-adapter.test.ts:75-120`.)*
- [x] The encryption **seam** is intact: passing a `sqlCipher` config still routes through configure/verify (M3 path), unit-level. `[web-adapter.test.ts]`
- [x] `migrate()` runs on open (empty registry ⇒ no-op at version 0); a failing migration rolls back, version unchanged. `[web-adapter.test.ts]`
- [x] `tsc --noEmit` strict green across `@vida/core` + `@vida/web`; adapter unit/integration tests pass. `[10/10 typecheck · 6/6 tests]`
- [x] Core barrel exports stay stable (no consumer breakage — only `index.ts` re-exports; `createDrizzleProxy` added). `[index.ts]`
- [x] `[C]` `docs/infrastructure/database-layer/current-*` refreshed; `[L]` layer-doc for `apps/web/src/db/`. `[current-*; apps/web/src/db/CLAUDE.md]`

**Status: 5/7 met (contract complete). Items 1 & 2 (the real browser open/reopen/persist) are code-complete but
UNVERIFIED — they depend on a browser E2E harness that does not exist yet (no Playwright/OPFS setup in the repo).
That harness is a net-new issue; AR-2 closes on contract and the harness carries the persistence proof.**

## 3. Contract · 4. Business Rules · 5. Build steps
→ In the session gate files (this is a gated build, session-split):
- **Gate 1 (direction):** [`sessions/PLAN-2026-07-27-ar-2-database-adapter-web.md`](sessions/PLAN-2026-07-27-ar-2-database-adapter-web.md) (Rev 3 — async)
- **Gate 2 (build):** [`sessions/IMPLEMENTATION-PLAN-2026-07-27-ar-2-database-adapter-web.md`](sessions/IMPLEMENTATION-PLAN-2026-07-27-ar-2-database-adapter-web.md) (Rev 3 — A1–A5·R1·R2·W1–W5)

## 6. Open UNKNOWNs / decisions
- [DECIDED, Victor 2026-07-27] Encryption deferral = **optional `sqlCipher` config** seam.
- [DECIDED + CORRECTED, Victor 2026-07-27] Execution model = **async driver + Web Worker** (wa-sqlite sync WASM build +
  `AccessHandlePoolVFS`), Drizzle via `drizzle-orm/sqlite-proxy` → `DrizzleDb` is `'async'`. `repository.ts` +
  `migrations/runner.ts` are async-propagated (the encrypt/decrypt seam stays DB-6). The earlier "stay sync /
  `repository.ts` untouched" fence is **void** — sync is impossible over wa-sqlite's async Factory API.
- [DEPENDENCY — flagged 2026-07-27] Acceptance items 1 & 2 depend on a **browser E2E harness (Playwright + OPFS/worker)**
  — created as its own issue; AR-2 items 1 & 2 are blocked-on it for final verification.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-27 | 2026-07-27-ar-2-database-adapter-web | thin index + Gate-1 PLAN drafted (baseline done; D1 seam decided) |
| 2026-07-27 | 2026-07-27-ar-2-database-adapter-web | **direction corrected sync→async; implemented (A1–A5·R1·R2·W1–W5); 5/7 DoD met; items 1&2 deferred to the E2E-harness issue; index re-aligned to async** |
| 2026-08-04 | 2026-08-03-qa-1-e2e-harness-opfs | **items 1 & 2 VERIFIED** by QA-1's Playwright/OPFS harness (green in a real Chromium worker). Item-2 persistence proven via a durable `app_state` probe row; the Drizzle-over-worker write variant remains deferred → UI-3/M1.1+. AR-2 now 7/7. |
