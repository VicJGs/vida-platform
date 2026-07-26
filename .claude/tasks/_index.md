# Task Index — vida-platform
# Detailed version of TASKS.md. Claude reads individual task files.

## Active Tasks
_(none — foundation-realignment campaign + Linear projectize both complete. Next: begin building M1.0, under a code profile.)_

## Parked / Superseded
- db-2-sync-metadata-columns: .claude/tasks/archive/db-2-sync-metadata-columns.md  (PARKED 2026-07-23 — superseded by ADR-017 features-first resequencing; HLC/sync-metadata work defers with the sync engine to the hardening pass; baseline done, no code written; Linear LIF-64 → Backlog)

## Completed
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
