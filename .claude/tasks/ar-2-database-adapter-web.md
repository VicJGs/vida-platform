# Task: ar-2-database-adapter-web
# Profile: Add Backend Component
# Scenario: Default
# Spec: docs/specs/components/ar-2-database-adapter-web/_index.md
# Status: in-progress
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
- [ ] code-review → /critique SHIP → quality-gate-engineering → verification
- [ ] [C] currency refresh (database-layer current-*) + [L] layer-docs; commit docs WITH code

## Build Steps
<!-- UNIT-level — from IMPLEMENTATION-PLAN §3 (gate 2). Pending Approval 2. -->
- [ ] C1 — adapter.ts: `DatabaseConfig.sqlCipher` → optional
- [ ] C2 — adapter.ts: branch `initializeConnection` on `config.sqlCipher` (skip cipher when absent)
- [ ] C3 — apps/web deps (wa-sqlite, vitest) + vite.config (WASM/worker; exclude wa-sqlite) [VERIFY import specifiers + no-COOP/COEP]
- [ ] C4 — apps/web/src/db/worker.ts (sync wa-sqlite + OPFSCoopSyncVFS + open + message protocol)
- [ ] C5 — sync-driver.ts (sync SqliteDriver over wa-sqlite sync API)
- [ ] C6 — drizzle-sync-session.ts (custom Drizzle sync session → createDrizzle) ⚠ RISK — [VERIFY] against drizzle-orm@0.45.1 .d.ts + expo-sqlite reference FIRST
- [ ] C7 — web-adapter.ts (DatabaseAdapter impl: open/migrate/createDrizzle/exists/destroy)
- [ ] C8 — index.ts barrel + web-adapter.test.ts (open/persist/migrate/seam) [VERIFY OPFS-in-worker test env]
- [ ] checkpoint after C1/C2: @vida/core tsc green with repository.ts unedited

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-27 | Enriched stub → active task; profile → Add Backend Component; DS-1 parked (branch); Linear hygiene (LIF-72/61 → Done) | Step 0 — baseline refresh of docs/infrastructure/database-layer/ |
| 2026-07-27 | Baseline done (adapter SQLCipher-coupled residue; repository sync/DB-6; web empty). Gate 1: PLAN→critique REVISE (sync/async fork)→D1+driver decided→SHIP→Approval 1 ✅. Gate 2: IMPL-PLAN Rev 2 (critique caught VFS/ref-driver/mapResultRow vs installed→fixed). BANKED before Approval 2. | **RESUME: get Approval 2 (or re-critique Rev 2 first) → implement C1→C8 in order; checkpoint after C1/C2 (core tsc, repository untouched)** |

## Notes
- This is the critical-path root of the whole M1.0 spine. Get the interface right — 6 issues inherit it.
- Adapter DB/auth errors are frequently STRUCTURAL → victor:triage before any fix.
