# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| build-roadmap-resequence (→ **foundation-realignment master campaign**; roadmap resequence = Part 3) | Project Foundation Setup | 2026-07-23 | 2026-07-25 | **Part 0 + 1.0 + 1.1 COMPLETE**; **Part 1.2 IN PROGRESS — ✅ TIER-1 DONE (10) + TIER-2: ✅ routines, skills, learning/education, books, check-ins** (5th–9th consecutive critique-clean; commits cab2bfe, ed6d5fd, cff16a2, 4910268, a257d90). skills = first X*/AI*; learning/education + books = mixed R6 + X*/AI*; check-ins = lightest (E9 user_profile split + E2). Tier-2 remaining (2): finance/fiscal-legal, health/nutrition → then Tier 3 arch docs (Part 1.3) |

## 🧭 Next session

**Part 1.2 Tier-1 COMPLETE (10). Tier-2 STARTED — ✅ `routines` + ✅ `skills` done** (5th + 6th consecutive
critique-clean; commits cab2bfe, ed6d5fd). **Two carry-forwards:** (1) routines' sweep verdict was **stale** (row 13),
NOT gap — **grep each Tier-2 unit's sweep row before assuming `gap`.** (2) **`skills` established the X*/AI* (014/015)
ingest/AI naming pattern** the 4 remaining ingest units inherit: device-mediated **public-reference** whole-set bulk
import (X1/X2/X3) under `external_in_ok` (X5) · X4 egress for any export · X11 splits LLM→ADR-015 · AI1 `on_device`/
`cloud` server-blind · AI3 cloud=egress+scope-min · AI5 untrusted-import provenance · AI6 `source=ai` · **AI4 excluded
unless the module is a true agentic actor** (Projects only). And the **M1/M2 measured framing** when a module isn't in
the pursuable set (L240): reference the `measurement_kind` taxonomy in-config + put the pursuable on its Purpose/target,
don't assert a stored column. **Tier-2 remaining (2)** (`finance/fiscal-legal` [gap 014/015 — X* grant tokens `external_in_ok`/`external_out_ok` + AI
egress/scope-min; **NOTE:** finance/core already did the `store`/`move_money` economy — fiscal-legal is the public-reference
rule-pack + AI-advisement layer], `health/nutrition` [gap 015/014/006 — AI6 `source=ai` on AI-generated rows + food-DB
ingest X* + `entity_tags`]): both are ingest/AI units — reuse the skills/books/education X*/AI* pattern. **NOTE (proven
THREE times — education, books, check-ins-was-clean):** a "gap"/"clean"-labeled sweep row can hide live wrong-model
tokens — **grep the live schema for each unit's floor first**, don't trust the label to mean pure-additive. Same
per-unit LITE loop (ground → refine sweep → PLAN → independent critique → approve → implement → grep-verify → commit).
Read first: `staleness-sweep.md` (the target's row) + `capability-framework.md` (§3 predicates for its drivers) + the
target's 5 aspect docs + grep the live schema. Then Tier 3 = Part 1.3 architecture-doc rewrites.** Read first: `docs/specs/foundation/staleness-sweep.md`
(the target's row + Part 1.2 tiers) + `docs/specs/foundation/capability-framework.md` (§3 predicates for the target's
drivers) + the target's current aspect docs + grep the live schema for the As-is floor. Each context re-runs through the
documentation-blueprint methodology under its own LITE gate (plan→critique→approval per context). Pattern (notes-and-pages
+ sessions-and-scheduling + projects + health/core + habits + finance): ground → **read ALL aspects to refine the sweep's
single-aspect verdict** → persisted PLAN → independent adversarial critique → fix → approve → implement (R6 two-tier
As-is/[INTENT]; cite conceptual owner, defer code home; flag forward regressions, don't skip). **R6 has two shapes** —
recovered-domain (no As-is floor, e.g. health/core) vs live-schema (real floor, two-tier retire, e.g. habits/projects/
finance); grep the schema to tell which. Then Tier 2 gap-fills → Tier 3 arch docs (Part 1.3).
Done so far: Part 0 (framework, 85 caps); Part 1.0 (legacy quarantine + CLAUDE.md lock); Part 1.1 (sweep + As-is
exemption → framework §1.3); **Part 1.2 ✅ notes-and-pages (Tier 0 hub)** (`part-1.2-reruns/notes-and-pages.md`) +
**✅ sessions-and-scheduling (Tier 1 gap)** (`part-1.2-reruns/sessions-and-scheduling.md` — S4/S5/R1 added; forward
`xp_history` retired; critique SHIP) + **✅ projects (Tier 1 stale, mixed case)** (`part-1.2-reruns/projects.md` —
decomposed bespoke `measurement_type` → M1×M2×M5-seam; M3 nullable progress; M7 `purpose_projects`→`contributions`
(kept `project_habits`); named ADR-014 X1/X5 + ADR-015 AI1/AI4/AI6; critique SHIP).
Committed: notes-and-pages re-run = cbc8560 (+ cb21f73, 9440a47, Part-1.1 checkpoint); sessions-and-scheduling re-run = c7f10c6; projects re-run = committed 2026-07-24 (this session).
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
