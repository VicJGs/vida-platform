# Task: delivery-structure-reconstruction
# Status: DONE (2026-08-01 — reconstructed + LIVE in Linear: 4 Projects M1–M4, 91 issues, 0 deferred edges; db-10 fixed)
# Profile: Project Foundation Setup
# Scenario: delivery-structure-reconstruction (BUILT in toolkit @ 4b31176, LIF-110 Phase T — now the operating manual)
# Project: Foundation
# Source: db-10 triage escalation (2026-07-31)
# Phase-V un-parked: 2026-08-01 (T1 Phase-T shipped; profile → Project Foundation Setup)

## Phase-V entry (2026-08-01) — CORRECTED governing structure
Governing structure = the model the toolkit work (T0 realign-cluster-to-project + T1 ADR-016) ESTABLISHED, NOT the
"Target hierarchy semantics" draft below (which was a pre-ADR-016 sketch and DRIFTED). The 4 tracked levels
(ADR-007:54,101 + ADR-016; Linear Initiative/Project/ProjectMilestone/Issue):
- **INITIATIVE = Vida** (ADR-007:16,36 "repo = Initiative") — NOT a Project.
- **PROJECT = a build TIER** = the intents **M1 · M2 · M3 · M4** (ADR-016; `_projects.md` ## section, ordered).
- **MILESTONE = a delivery-SLICE** = **M1.0 · M1.1 · M1.2 · M1.3 · M1.4** (slices of M1) etc.
- **ISSUE = a sprint/deliverable** (task file `# Project:`+`# Milestone:`).
The dotted numbering already encoded this (M1 ⊃ M1.0 ⊃ issues). The old "M1.0 = Linear Project" IS the malformation
(DF-5). Drift correction 2026-08-01 (Victor) → memory [[reconstruct-to-the-mechanism-not-the-stale-draft]].

## Goal
Redefine the Vida delivery structure — the toolkit hierarchy **Project > Milestone > Issue** — from ground zero,
because the db-10 triage exposed it as malformed at its core (naming, conventions, structure, per-level information,
and the deliverable relationship/dependency layer). The M1→M4 *intent* is right; its *instantiation* as a tracker/
delivery hierarchy is not. Preserve ONLY the built code + the ADRs; everything about the planning/tracker structure
is open. The rich legacy plan is DOGFOOD (input, zero data loss), not carried forward as structure.

Target hierarchy semantics (Victor, 2026-07-31) — ⚠ SUPERSEDED by the Phase-V-entry block above (pre-ADR-016 draft; drifted):
- ~~**Project** = Vida (the whole build).~~ → Vida = INITIATIVE; Projects = the tiers M1–M4.
- ~~**Milestones = the intents, transformed**~~ → intents (M1–M4) = PROJECTS (tiers); Milestones = the slices M1.0–M1.4.
- **Issues = the granular deliverables** — each with a **relationship layer** + a **proper outcome**. *(this part held)*

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| harvest draft | flat §0–§3 → hierarchical | Victor: draft must BE the Project>Milestone>Issue shape | ✅ restructured |
| harvest draft | +legacy/migration provenance | Victor: mention the v1-migrated-from files | ✅ C13/C14 + DF-9 added |

## Step 1 — Harvest document (the grounded draft)  — ✅ DONE 2026-07-31
`docs/specs/foundation/delivery-structure-reconstruction/intent-and-provenance-harvest.md` (hierarchical; PROJECT →
MILESTONES M1–M4 → DEFECT REGISTER DF-1…DF-9; core-sources C1–C14 incl. legacy). Organize-only; no structure decided.

## Step 2–5 — Reconstruct — ✅ DRAFTED 2026-08-01
`docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md` — the real Project(Vida) >
Milestones(M1–M4) > Issues, granular (one issue/module, DF-4), every issue homed + related + outcome'd; DF-1..DF-9
each structurally resolved (db-10 → M1.4 with all-module-schema dep; DB-8 → M1.4; MIG-1 new for v1 retire; +22 module
issues). **Step 6 gate DONE:** independent critic → SHIP + 3 fixes (AR-4 title cite; AR-8←DB-8 upstream edge removed —
DB-8 moved to M1.4; DB-11 dep enumerated like db-10) — ALL applied + Step-5 self-check corrected (bidirectional audit).
**→ awaiting Victor's Approval before Step 7 (projectize / live Linear write — outward-facing, project-first relayed).**

## Step 2 (original charter — for reference)
From the draft: create the real Project>Milestone>Issue structure — granular issues whose file-deliverables match
repo homes (ADR-018) + architecture (ADRs) + established docs, each with a corrected relationship layer (resolving
DF-1…DF-9) + explicit outcome. BLOCKED on Victor's 2 confirmations: (1) milestones = INT-1..4→M1..4? (2) module-row
granularity? Then scaffold the scenario via /new-scenario at close.

### Step 1 spec (for reference)
- **§1 Intents → (future) Milestones** — each intent stated discretely as a north-star, anchored to sources.
- **§2 Deliverables → (future) Issues** — every M1 deliverable (the ~30 M1.0 issues + the M1.1–M1.4 module +
  hardening deliverables); under each: **provenance** (every mention as `file:line`; whole-doc **core sources**
  cited as a whole) + **relationship layer** (deps as-recorded, with citations, + a flag on every defective/
  incomplete recorded relationship) + the evidence for its **outcome**.
This organized, fully-cited draft is the input for the profile-driven reconstruction that follows.

## Dependencies
- Preserves: built code (9 shipped M1.0 units) + ADRs 001–020 (immutable facts).
- Dogfood inputs: docs/roadmap.md, docs/roadmap/m1.0-delivery-plan.md, docs/specs/foundation/part-3-build-roadmap/*,
  linear-rescope-map.md, capability-framework.md, .claude/tasks/*, TASKS.md, _index.md, session-log.md, Linear.
- Supersedes (parks): db-10-seed-and-fixtures build.

## Notes
- NEW Project Foundation scenario — not milestone-delivery-planning (binds existing issues) nor build-roadmap
  (assumes intent already structured); both presuppose the structure we've established is broken.
