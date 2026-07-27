# Task: ar-2-database-adapter-web
# Profile: Add Backend Component
# Scenario: Default
# Spec: docs/specs/components/ar-2-database-adapter-web/_index.md
# Status: in-progress — implemented + green (10/10 tc · 6/6 tests · post-impl SHIP); UNCOMMITTED; browser/OPFS path verification-deferred (no Playwright smoke yet); §6 repo-CRUD line re-scoped to DB-6 (awaiting acceptance)
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Linear: LIF-73 (existing — map slug ar-2-database-adapter-web; do NOT mint a duplicate)
# Source: docs/roadmap/m1.0-delivery-plan.md §5 AR-2 (row 100)

## Goal
Build the `DatabaseAdapter` abstraction + its web implementation (`wa-sqlite` + OPFS), exposed as an async
Drizzle proxy driver so the repository layer runs unchanged on web today and on native adapters
(mobile/desktop) later. The seam that keeps the DB layer platform-agnostic. **REBUILD** — the v1 adapter was
quarantined in Part 2.

## Context
Profile: Add Backend Component · Scenario: Default · Gate: **FULL double-gate** (§XXVI g1 PLAN + g2 IMPL-PLAN,
two approvals) + `quality-gate-engineering` + `verification`. DOC spine: **B(refresh `database-layer`)·F·C·L**
— [B] baseline REFRESHES the live `docs/infrastructure/database-layer/current-{spec,business-rules}.md`
(dated 2026-07-25), not fresh.
Deps: AR-1 ✅ (LIF-72, Done) + DB-1 ✅ (LIF-61, Done, schema primitives). Both satisfied → ready head.
Unblocks (6): db-6, db-7, ar-5, ar-6, ar-8, ar-9 — the critical-path root.
Home: `packages/core/src/db/adapter.ts` (interface) + `apps/web/src/db/` (web impl — currently empty).
Intent sources: ADR-001 (wa-sqlite/OPFS, Drizzle), ADR-002 (three-layer encryption model), ADR-016 (storage rebuild), ADR-017 (features-first, encryption deferred).

## SCOPE GUARDS (carry into the plan — from delivery plan §5)
- **REBUILD** — v1 adapter quarantined in Part 2 (`packages/core/src/db/_legacy/`). Author fresh; do not resurrect v1 residue.
- **Encryption OFF in M1.0** — SQLCipher deferred → **M3**. Build the encryption *seam* (pass-through), NOT the flip.
  ⚠ RECONCILE: the old stub said "SQLCipher WASM partly built already" — verify what's in `_legacy/`, but the
  plan's authority is SQLCipher→M3. AR-2 ships the adapter working WITHOUT encryption.
- Target: platform-agnostic `DatabaseAdapter` interface + web-adapter (async Drizzle proxy over wa-sqlite/OPFS).

## Open Questions
- [Q1] What exactly is in `packages/core/src/db/adapter.ts` + `_legacy/` today (v1 residue vs current stub)? → Step 1.
- [Q2] Does the existing `packages/core/src/db/repository.ts` require an unlocked vault (the ADR-017 "pass-through
  seam" overclaim noted in the campaign)? → verify at baseline; AR-2 must present a pass-through seam.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Encryption deferral (D1) | Optional `sqlCipher` config seam | open() plain in M1.0; M3 activates by passing config — no API change | 2026-07-27 |
| Driver sync/async model | **Sync** driver + Web Worker (`AccessHandlePoolVFS`) | keeps `DrizzleDb` `'sync'` → repository.ts untouched (DB-6 fence holds); wa-sqlite recommended OPFS path | 2026-07-27 |
| Adapter change scope | Targeted edit (not rebuild) | keep interface shapes + encryption-agnostic helpers; only `sqlCipher` optional + `initializeConnection` branch | 2026-07-27 |
| Drizzle sync binding | Custom sync session, `sql-js/session.js` blueprint | Drizzle's public sqlite-proxy is async-only; sql-js pattern handles wa-sqlite positional arrays | 2026-07-27 |
| "async Drizzle proxy" (roadmap phrase) | Not adopted | it's a roadmap table cell, NOT an ADR-001 decision; AR-2 stays sync | 2026-07-27 |

## Progress
<!-- SESSION checklist — the add-backend-component scenario ## Task List. -->
- [ ] [B] document-context BASELINE — refresh database-layer current-* (ground truth before plan)
- [ ] Read the quarantined/live adapter + DB-1 schema primitives — state the pattern
- [ ] [F] forward spec + interface contract (/api-contract adapted → DatabaseAdapter interface) approved
- [ ] /adr-check the approach → /adr-new if a significant choice surfaces
- [ ] GATE 1 (PLAN → critique → preflight → Approval 1)
- [ ] GATE 2 (IMPL-PLAN → critique → preflight → Approval 2)
- [ ] Implement: types → adapter/query logic → error handling → registration; tsc --noEmit
- [ ] Test: adapter unit/integration (open DB, round-trip query, ≥2 error cases)
- [x] code-review → /critique SHIP → quality-gate-engineering → verification (independent post-impl critic: SHIP, 0 blocking)
- [x] [C] currency refresh (database-layer current-*) + [L] apps/web/src/db/CLAUDE.md — done; commit docs WITH code (pending)

## Build Steps
<!-- UNIT-level — from IMPLEMENTATION-PLAN Rev 3 §3 (gate 2). Approval 2 ✅ 2026-07-27. -->
<!-- DIRECTION CORRECTED sync→async: wa-sqlite Factory API is async-only → adopt sqlite-proxy (delivery-plan spec). -->
<!-- C1/C2 (sqlCipher optional + branch) already committed to working tree; preserved, async-wrapped in A-pass. -->
- [x] A1 — adapter.ts: `DrizzleDb` → `SqliteRemoteDatabase<typeof schema>` (drizzle-orm/sqlite-proxy, 'async')
- [x] A2 — adapter.ts: `SqliteDriver` methods async + add positional `values(): Promise<unknown[][]>`
- [x] A3 — adapter.ts: async-ify runMigrations awaits + getSchemaVersion/setSchemaVersion + cipher/connection helpers
- [x] A4 — adapter.ts: `initializeConnection` async (preserve C1/C2 branch)
- [x] A5 — adapter.ts: `createDrizzleProxy(driver)` via sqlite-proxy — get→values[0] (flat row), all/values→values
- [x] R1 — repository.ts: async-propagate 11 call sites + Repository<T> interface sigs
- [x] R2 — migrations/runner.ts: currentVersion/needsMigration → async
- [x] ░ CHECKPOINT: `pnpm --filter @vida/core typecheck` green ✅ (3 files: adapter/repository/runner)
- [x] W1 — apps/web/vite.config.ts (WASM asset + ES worker + optimizeDeps.exclude wa-sqlite; no COOP/COEP)
- [x] W2 — apps/web/src/db/web-driver.ts (async SqliteDriver over wa-sqlite; query=objects, values=positional; on statements() iterator)
- [x] W3 — apps/web/src/db/worker.ts (sync WASM build + new AccessHandlePoolVFS + await isReady + in-worker proof + drizzle ping)
- [x] W4 — apps/web/src/db/web-adapter.ts (DatabaseAdapter: open/migrate/createDrizzle/exists/destroy) + wa-sqlite-vendor.d.ts shim
- [x] W5 — index.ts barrel + web-adapter.test.ts (Node contract via real createDrizzleProxy over better-sqlite3 — 6/6 green)

## [VERIFY]-resolutions + scope notes (recorded during implement — not direction changes)
- AccessHandlePoolVFS@1.0.0 is `new AccessHandlePoolVFS(dir)` + `await vfs.isReady`, NOT a `static create(name,module)` (plan's op line). Constructor takes directoryPath only.
- `exists`/`destroy` are VFS/directory-scoped, NOT raw-OPFS-by-name: the VFS stores files under opaque random OPFS names (SQLite path in a header). `exists` = pool `getSize()>0`; `destroy` = clear the VFS dir. Per-name first-run → AR-4. (Single-vault M1.0.)
- Repository CRUD is NOT in AR-2's test: `createRepository` calls `getVaultKey()` unconditionally → needs an unlocked vault (Argon2id ceremony = M3/DB-6). AR-2's test validates the adapter+driver+proxy contract at the Drizzle level (the critic's actual ask). Repository CRUD round-trip belongs to DB-6. **[flag for Victor — one §6 acceptance line re-scoped]**
- wa-sqlite@1.0.0 has no `last_insert_rowid` wrapper → derived via `SELECT last_insert_rowid()` in exec (no AR-2 path needs it; UUIDv7 PKs).

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-27 | Enriched stub → active task; profile → Add Backend Component; DS-1 parked (branch); Linear hygiene (LIF-72/61 → Done) | Step 0 — baseline refresh of docs/infrastructure/database-layer/ |
| 2026-07-27 | Baseline done (adapter SQLCipher-coupled residue; repository sync/DB-6; web empty). Gate 1: PLAN→critique REVISE (sync/async fork)→D1+driver decided→SHIP→Approval 1 ✅. Gate 2: IMPL-PLAN Rev 2 (critique caught VFS/ref-driver/mapResultRow vs installed→fixed). BANKED before Approval 2. | (superseded next row) |
| 2026-07-27 | **DIRECTION CORRECTED + BUILT.** [VERIFY] during C3/C4 found wa-sqlite Factory API async-only → sync impossible. Re-planned to **async Drizzle proxy** (delivery-plan spec; Victor confirmed). Rev 3 PLAN+IMPL re-gated (indep critique REVISE→3 fixes: get-shape, runner.ts, real-proxy test). Implemented A1–A5·R1·R2·W1–W5. Checkpoint + full typecheck 10/10 + AR-2 tests 6/6 green. Post-impl critique SHIP (0 blocking; NIT-1/NIT-4 applied). Currency docs refreshed + layer-doc. | **COMMIT (docs WITH code) → /task-complete → LIF-73 Done → unblocks db-6/7, ar-5/6/8/9. Follow-ups: Playwright OPFS smoke; repo-CRUD test in DB-6.** |

## Notes
- This is the critical-path root of the whole M1.0 spine. Get the interface right — 6 issues inherit it.
- Adapter DB/auth errors are frequently STRUCTURAL → victor:triage before any fix.
