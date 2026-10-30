# Session: build-roadmap — 2026-07-20

**Task completed.**

## Goal
Set the whole platform's buildable deliverables as a phased, clustered dependency map (`docs/roadmap.md`)
and mirror it into Linear, so the build phase has a legible, gated, dependency-correct target.

## Outcome
All 8 path steps done → task archived.

- **docs/roadmap.md** — 3 phases · 5-layer Structural Foundation (① Database ② Architecture ③ Design System
  ④ UI ⑤ UX) · tiered dependency map · Phase-1 module sub-slices (1a–1d) · integration register
  (6 defined / 16 undefined-by-design) · sequencing rules.
- **Linear**: 35 Phase-1.0 issues (LIF-61…95) · 5 Projects · 14 milestones · corrected **acyclic**
  blocks-graph. Task issue LIF-60 → Done.
- **Scenario formalized**: `~/dev-toolkit/claude-profiles/project-foundation/scenarios/build-roadmap.md`
  (+ router table + dispatch routing). Encodes gate-BEFORE-push.

## The load-bearing moment
Step-7 foundation gate (run late, after the Linear push) → verdict REVISE. An independent adversarial
critic caught a **BLOCKER dependency inversion** — the AR-2 DatabaseAdapter (which owns
open→migrate→query→close) was declared *below* the DB-6 repository it actually sits *above* — by
cross-checking every edge against `adapter.ts`, not the roadmap prose. Fixed (DB-6/DB-7 ⟵ AR-2,
DB-5 ⟵ AR-3, AR-2 ⟵ DB-1) + 2 MAJOR (missing crypto edge; "19"→24 structure-data docs). Re-synced Linear
(add-only sync couldn't prune the stale relation → deleted via UI first, avoiding a cycle). Verdict → SHIP.

## Filed follow-ups (not built)
- Tracker relation sync is **add-only** → needs `issueRelationDelete` + diff-reconcile (§XXVI toolkit task).
- `ensure_project` description 255-char cap → write long body to Linear's `content` field.
- ADR-002 §5.20 still says "19" structure-data docs → reconcile to 24 (owed via DB-11).

## Next
- `/toolkit-check` + commit `~/dev-toolkit` (new scenario + router edits are uncommitted there).
- Build phase begins: Phase-1.0 ① **Database Layer**, starting at **DB-1** (ADR-002 §5.20 owed-tables →
  real Drizzle schema in `packages/core`).
