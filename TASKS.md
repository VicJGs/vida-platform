# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| build-roadmap-resequence (→ **foundation-realignment master campaign**; roadmap resequence = Part 3) | Project Foundation Setup | 2026-07-23 | 2026-07-23 | **Part 0 + 1.0 + 1.1 COMPLETE** (framework ratified; legacy quarantined; CLAUDE.md locked; sweep = 10 stale/7 gap/7 aligned). Next: Part 1.2 doc re-runs |

## 🧭 Next session

**Start Part 1.2 (doc re-runs) — notes-and-pages FIRST** (Tier 0 hub, in-degree-14). Read first:
`docs/specs/foundation/staleness-sweep.md` (verdict table + Part 1.2 dependency-ordered re-run tiers) +
`docs/specs/foundation/capability-framework.md` (§3 predicates for the target context) + the target's current
`structure-data.md`. Each stale/gap context re-runs through the documentation-blueprint methodology under its own
LITE gate (plan→critique→approval per context). notes-and-pages fixes: SP1 (`page_tags`→`entity_tags`), SP2 (open
registry vs closed `entity_type CHECK(33)`), SP4, add SP3 (`parent_tag_id`), complete the pomodoro→`sessions`
supertype re-home. Then Tier 1 (sessions-and-scheduling, projects, health/core, habits, finance, tasks,
relationships, pomodoro, knowledge/flashcards) → Tier 2 gap-fills → Tier 3 arch docs (Part 1.3).
Done so far: Part 0 (scenario + ratified capability-framework, 85 caps); Part 1.0 (legacy quarantine + CLAUDE.md
lock); Part 1.1 (sweep + As-is exemption → framework §1.3). Committed cb21f73, 9440a47, + this Part-1.1 checkpoint.
Open Q still deferred: what "RP" abbreviates (Part 3.0, non-blocking).

## 🔴 Blocked

_(none)_

## 📋 Planned

| Task | Profile | Priority |
|------|---------|----------|
| **Storage rebuild — from zero** (v1 schema ~60% stale → author v2 from scratch; `ADR-016` + `storage-build-plan.md` ledger + per-table gating. DB-1/LIF-61 ✅ done.) | Generic Coding Session | ⏸ **PARKED by ADR-017** — sequencing inverted to features-first; schema now authored per-feature, not full-schema-first. Resurfaces (incl. encryption/sync at DB-5/DB-2) in the post-validation hardening pass. |
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |
| Global Calendar (cross-module read-only aggregator over `dueIn`) | (feature) | parked platform surface — build when its feeder modules are built |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| **storage-master-plan** (ADR-016 + storage-build-plan master ledger; both gates; commit 58dc813) | 2026-07-22 | 1 (2026-07-22) |
| **db-1-schema-primitives** (LIF-61 · P0 storage-rebuild primitives; both gates + review battery + 4 consistency passes) | 2026-07-22 | 1 (2026-07-20→22) |
| **build-roadmap** | 2026-07-20 | 3 (2026-07-20) |
| **documentation-blueprint** | 2026-07-19 | ~20+ (2026-06-08 → 07-19) |
| toolkit-setup | 2026-06-08 | 2 |

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
