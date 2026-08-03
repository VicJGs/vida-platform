# Task: home-deferred-substrate-pieces
# Profile: Project Foundation
# Scenario: default
# Spec: docs/specs/fixes/home-deferred-substrate-pieces/
# Created: 2026-08-02
# Status: in_progress
# Linear: (none yet — creates the missing issue(s); meta/structure fix like delivery-gate-multicontext-realignment)

## Goal
Close the "un-homed deferral" gap surfaced by the AR-7 capability increment: every deferred piece an AR-7 increment
cites must have a real downstream ISSUE home (db-10-proof), grounded in the documentation's own homing rules — not
just an ADR citation. Add the missing issue(s) in the right place + order; annotate the already-homed ones.

## Phase
Phase 3 of this session (after P1 DF-11 realignment ✅, P2 AR-7 inc-1 effects ✅). **Does NOT touch AR-7's
increment scope** — the deferrals stay deferred; this makes their homes real so they WILL be finished properly.
Separate phase (Victor). AR-7 inc-2 (capability) PAUSED at gate-1-approved; resumes after this lands.

## Documentation grounding (Step-1 harvest, done)
- **Homing rule** = roadmap §"substrates by first-consumer pull" — a substrate lands when its first consuming module needs it. Capability is a listed substrate.
- Capability registry runtime → **MOD-notes `#31`** (M1.1 hub, first) + **UI-3 `#29`** (editor). HOMED.
- `capability_grants` external semantics → **M2 / P3-boundary `#71`** (roadmap:121). HOMED.
- Views-hosting seam → ADR-008 §6 conditional. Not owed.
- **ADR-010 safe-authoring runtime (SP4)** → ADR-010 §"does NOT do" defers to "SP4 safe-authoring surface, per-platform"; **placed in NO milestone**. GENUINELY UN-HOMED → the one issue to add.

## Plan (gate-1, pending Victor approval)
1. NEW issue `CAP-authoring` (⚠ INTENDED-later) — SP4/ADR-010 surface (sandbox·DSL·authoring UI·grant
   enforce/re-grant/revoke); owns `capability_grants` authoring consumer; `← AR-7, UI-3`; placed as a standing
   post-M1–M4 first-consumer-pull feature (no consumer in the current horizon). Exact milestone = Victor's call.
2. Annotate homed deferrals in reconstructed-structure (capability-runtime→MOD-notes/UI-3; grants-ext→P3-boundary).
3. Gate (double-gate, docs-only) → apply to reconstructed-structure.md (+ Linear issue create if in scope).

## Progress
- [x] Step-1 doc harvest (homing rules + the 1 genuine gap)
- [x] gate-1 PLAN → independent critique REVISE (CRITICAL: MOD- slug cycle via unscoped wildcards; MAJOR: "forced by order" overclaim) → fixed (rename CAP-, honest deferral) → Approval 1
- [x] apply to reconstructed-structure.md (DF-12 + #85 CAP-authoring + CAP prefix + AR-7/UI-3 → edges + counts 1→85)
- [x] acceptance verified: row 9-col · whole-corpus wildcard non-collision · §5 range TRUE · acyclic (←13,29 <85) · no stale count
- [ ] commit (docs-only, pending Victor) → resume AR-7 inc-2

## Outcome
DF-12: AR-7 deferrals proven-homed (registry-runtime→MOD-notes/UI-3 · grants-ext→P3-boundary/M2 · authoring→new #85
CAP-authoring, ⚠ INTENDED-later, ←AR-7,UI-3). db-10-proof restored at 85 issues. Discipline established: each
remaining AR-7 increment (measurement/economy) runs the same first-consumer-pull homing check at its gate-1.

## Route History
- 2026-08-02 — opened from Victor's deferral-homing check on AR-7 capability increment; separate phase.
