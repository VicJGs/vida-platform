# Task Index — vida-platform
# Detailed version of TASKS.md. Claude reads individual task files.

## Active Tasks
_(none)_

## Completed
- build-roadmap: .claude/tasks/archive/build-roadmap.md  (completed 2026-07-20 — docs/roadmap.md SHIP'd; 35 Phase-1.0 issues LIF-61…95 + acyclic dep-graph; build-roadmap scenario formalized; Linear LIF-60 Done)
- documentation-blueprint: .claude/tasks/archive/documentation-blueprint.md  (completed 2026-07-19 — 21 contexts + 15 ADRs; Linear LIF-54 Done)
- toolkit-setup: .claude/tasks/toolkit-setup.md

## How Tasks Work
- /task-new [name]       → creates task file + adds to TASKS.md
- /task-switch [name]    → logs current progress, loads new task
- /task-complete [name]  → archives task, updates docs, removes from TASKS.md
- /session-log           → updates session file AND task file AND TASKS.md
