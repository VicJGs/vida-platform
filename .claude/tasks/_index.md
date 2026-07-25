# Task Index — vida-platform
# Detailed version of TASKS.md. Claude reads individual task files.

## Active Tasks
- build-roadmap-resequence: .claude/tasks/build-roadmap-resequence.md  (in-progress 2026-07-25 — Project Foundation / foundation-realignment campaign; **✅ Part 1.2 COMPLETE — Tier-1 (10) + Tier-2 (7) = 17 units, 11 consecutive critique-clean**; **next = Part 1.3 (Tier 3) architecture-doc rewrites** `docs/core/architecture/*`, then Part 1 EXIT gate → Part 2 structure → Part 3 roadmap; cluster General_Vida)

## Parked / Superseded
- db-2-sync-metadata-columns: .claude/tasks/archive/db-2-sync-metadata-columns.md  (PARKED 2026-07-23 — superseded by ADR-017 features-first resequencing; HLC/sync-metadata work defers with the sync engine to the hardening pass; baseline done, no code written; Linear LIF-64 → Backlog)

## Completed
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
