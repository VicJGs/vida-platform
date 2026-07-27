# Task Index — vida-platform
# Detailed version of TASKS.md. Claude reads individual task files.

## Active Tasks
- ar-2-database-adapter-web: .claude/tasks/ar-2-database-adapter-web.md  (in-progress 2026-07-27 — M1.0-a Boot & DB spine, LIF-73, critical-path ROOT. Add Backend Component profile, FULL double-gate. Rebuild DatabaseAdapter (core/src/db/adapter.ts) + web-adapter (apps/web/src/db/, wa-sqlite/OPFS async Drizzle proxy); encryption seam pass-through, SQLCipher→M3. Deps AR-1✅/DB-1✅. Unblocks 6.)

## Planned
- qa-1-e2e-harness-opfs: .claude/tasks/qa-1-e2e-harness-opfs.md  (planned 2026-07-27 — Playwright + OPFS/worker E2E harness; proves AR-2 `_index.md` §2 items 1&2 [browser open/reopen + OPFS persistence] that the Node better-sqlite3 contract test can't. Net-new shared infra surfaced by the AR-2 completeness audit. Cluster M1.0 Boot & DB spine; **blocked-by ar-2**.)

## Parked / Superseded
- ds-1-token-pipeline: .claude/tasks/ds-1-token-pipeline.md  (PARKED 2026-07-27 — complete + green on branch `ds-1-token-pipeline` @ fd9f144; out of sequence [M1.0-b Design System track, not the -a critical path]. LIF-81 → Backlog. Resumes when the -b wave's turn comes. SD→Tamagui+CSS pipeline, 13/13 tests, eng-gate PASS, current-* at docs/ui/token-pipeline/.)
- db-2-sync-metadata-columns: .claude/tasks/archive/db-2-sync-metadata-columns.md  (PARKED 2026-07-23 — superseded by ADR-017 features-first resequencing; HLC/sync-metadata work defers with the sync engine to the hardening pass; baseline done, no code written; Linear LIF-64 → Backlog)

## Completed
- m1.0-delivery-plan: .claude/tasks/archive/m1.0-delivery-plan.md  (completed 2026-07-26 — Project Foundation / new scenario "Milestone Delivery Planning" crystallized. docs/roadmap/m1.0-delivery-plan.md binds all 30 M1.0 issues 1:1 to entity·ADR-018 home·intent·profile·flow·DOC spine·deps·gate; independent critic SHIP after 1 fix; grain+dep reconcile caught fold/split + UI-4↔UX-3 inversion + 2 stale Linear edges [DB-6←DB-5, AR-9←DB-2] cleaned both sides. Scenario: ~/dev-toolkit/.../scenarios/milestone-delivery-planning.md. Strategy meta-task, not a Linear issue.)
- linear-projectize: .claude/tasks/archive/linear-projectize.md  (completed 2026-07-26 — U3: re-projectized Linear onto the roadmap M1→M4. Created Projects M1.0/M1.4/M2/M3/M4 (+milestones); re-homed 33 existing issues to final M-homes; created split/head issues LIF-98 ar-9b, LIF-99 db-8b, LIF-100 provider-selection, LIF-101 ux-5b; old ①–⑤ emptied [archive the shells in Linear UI — tracker can't delete Projects]. Net-new module/integration issues remain create-at-gate. Linear LIF-97 Done)
- build-roadmap-resequence: .claude/tasks/archive/build-roadmap-resequence.md  (completed 2026-07-25 — the foundation-realignment campaign: P1 docs realignment [34/34 aligned] + P2 repo structure [ADR-018] + P3 roadmap resequence [ADR-019, docs/roadmap.md → M1→M4]; all exit gates accepted; docs+structure+roadmap coherent, derived from ADRs 001–019; Linear LIF-96 Done; follow-on = linear-projectize)
- storage-master-plan: .claude/tasks/archive/storage-master-plan.md  (completed 2026-07-22 — ADR-016 from-zero rebuild [fork A: hand-written SQL, no drizzle-kit] + storage-build-plan.md master ledger ~130-150 tables P0→P-final; both gates; commit 58dc813; not a Linear issue — strategy meta-task)
- db-1-schema-primitives: .claude/tasks/archive/db-1-schema-primitives.md  (completed 2026-07-22 — P0 storage-rebuild primitives in packages/core/src/db/schema/; hand-written-SQL DDL model confirmed; both gates + review battery + 4 consistency passes; commit b234e85; Linear LIF-61 Done)
- build-roadmap: .claude/tasks/archive/build-roadmap.md  (completed 2026-07-20 — docs/roadmap.md SHIP'd; 35 Phase-1.0 issues LIF-61…95 + acyclic dep-graph; build-roadmap scenario formalized; Linear LIF-60 Done)
- documentation-blueprint: .claude/tasks/archive/documentation-blueprint.md  (completed 2026-07-19 — 21 contexts + 15 ADRs; Linear LIF-54 Done)
- toolkit-setup: .claude/tasks/toolkit-setup.md

## How Tasks Work
- /task-new [name]       → creates task file + adds to TASKS.md
- /task-switch [name]    → logs current progress, loads new task
- /task-complete [name]  → archives task, updates docs, removes from TASKS.md
- /session-log           → updates session file AND task file AND TASKS.md
