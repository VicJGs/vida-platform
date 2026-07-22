# Task Index — vida-platform
# Detailed version of TASKS.md. Claude reads individual task files.

## Active Tasks
_(none)_

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
