# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| build-roadmap-resequence (→ **foundation-realignment master campaign**; roadmap resequence = Part 3) | Project Foundation Setup | 2026-07-23 | 2026-07-23 | **Part 0 + 1.0 + 1.1 COMPLETE**; **Part 1.2 IN PROGRESS** — ✅ notes-and-pages (Tier 0 hub) + ✅ sessions-and-scheduling (Tier 1) re-runs done. Next: Tier 1 `projects` / `health-core` / `habits` / `finance` |

## 🧭 Next session

**Continue Part 1.2 (doc re-runs) — Tier 1, `projects` NEXT** (then `health/core`, `habits`, `finance` — the live
wrong-model measurability/economy stales). Read first: `docs/specs/foundation/staleness-sweep.md` (the target's row +
Part 1.2 tiers) + `docs/specs/foundation/capability-framework.md` (§3 M1–M7 / E-layer for these) + the target's current
`structure-data.md`. Each context re-runs through the documentation-blueprint methodology under its own LITE gate
(plan→critique→approval per context). Pattern (notes-and-pages + sessions-and-scheduling): ground → **read ALL aspects
to refine the sweep's single-aspect verdict** → persisted PLAN → independent adversarial critique → fix → approve →
implement (R6 two-tier As-is/[INTENT]; cite conceptual owner, defer code home; flag forward regressions, don't skip).
Then rest of Tier 1 (tasks, relationships, pomodoro, knowledge/flashcards) → Tier 2 gap-fills → Tier 3 arch docs (Part 1.3).
Done so far: Part 0 (framework, 85 caps); Part 1.0 (legacy quarantine + CLAUDE.md lock); Part 1.1 (sweep + As-is
exemption → framework §1.3); **Part 1.2 ✅ notes-and-pages (Tier 0 hub)** (`part-1.2-reruns/notes-and-pages.md`) +
**✅ sessions-and-scheduling (Tier 1 gap)** (`part-1.2-reruns/sessions-and-scheduling.md` — S4/S5/R1 added; forward
`xp_history` retired; critique SHIP).
Committed: notes-and-pages re-run = cbc8560 (+ cb21f73, 9440a47, Part-1.1 checkpoint). NEW work (sessions-and-scheduling re-run) not yet committed.
Open Q still deferred: what "RP" abbreviates (Part 3.0, non-blocking); V1/007 saved-views reframe (dedicated pass).

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
