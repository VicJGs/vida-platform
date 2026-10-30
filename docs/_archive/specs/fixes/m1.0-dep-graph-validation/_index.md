# Spec: workflow:m1.0-dep-graph-validation

Status: draft <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: see §7.

<!-- FORWARD spec — written BEFORE the work. §1–§4 describe; §5 is the executable plan. Written for real via the
     loop's PLAN step (/documentation-component) in the standalone session; this is the stub + home. -->

## 1. Identity

A **plan-integrity pass**: validate every M1.0 dependency edge against the layer/ADR contracts so the whole
cluster's ready-frontier is trustworthy, and settle the streaming-issue loop unit-of-work — the prerequisite for
running the foundation build as an in-order gated loop without drift.

- **Desire/intent:** make "pick the ready head → gated build → next" safe across ALL of M1.0, not just the `-a`
  spine (already reconciled 2026-07-27). `[FACT: docs/specs/fixes/m1.0-a-spine-dep-reconcile/]`
- **What it is NOT:** not entity/module work (M1.1+); not building any issue; not re-doing the `-a` spine; not the
  toolkit tracker-hardening (LIF-104).

## 2. Business Rules

[FILL IN via the PLAN step] — invariants the corrected graph must uphold, e.g.: the graph is a DAG (acyclic);
every edge traces to a layer/ADR contract (No-Guessing); the three sources (task-file `## Dependencies`, Linear
blocked-by, delivery-plan §5) agree exactly; streaming slices (db-3/db-4) are modeled as part of their consumers,
not standalone; no M1.0 issue blocked-by an M2/M3/M4 issue (ADR-017 deferral direction).

## 3. Contract

[FILL IN] — the deliverable artifacts: the corrected per-edge graph (all three sources), the defined loop
unit-of-work, and the end-to-end ready-frontier. Inputs = the un-validated edge set (db-3/4/8/10, ar-4/8,
ds-1…5, ui-1…4, ux-1…6, qa-1) + the ADR contracts.

## 4. Acceptance

[FILL IN — every item a checkbox] e.g.:

- [ ] Every un-validated M1.0 edge derived from a cited layer/ADR contract; corrected where wrong/missing.
- [ ] Task-file `## Dependencies`, Linear, and delivery-plan §5 agree for all M1.0 issues; verified acyclic + live.
- [ ] Streaming-issue loop unit-of-work defined (how db-3/db-4 slices attach to consumers).
- [ ] Independent ADR-critique passed (SHIP) on the corrected graph.
- [ ] Trustworthy end-to-end ready-frontier documented; foundation loop declared safe to run.

## 5. Implementation Prompt

[FILL IN via /documentation-component in the standalone session] — the ordered census → per-edge derivation →
critique → streaming-model → write-all-three-sources → verify sequence, mirroring the `-a` reconcile method.

## 6. Open UNKNOWNs / Decisions Needed

- [UNKNOWN: needs the PLAN pass] the loop unit model for db-3/db-4 (fold-into-consumer vs sub-step).
- [UNKNOWN: needs per-edge derivation] whether db-8/db-10/ar-8 and the DS/UI/UX cross-track edges are contract-correct.

## 7. Change Log

| Date       | Session                   | Change                                            |
| ---------- | ------------------------- | ------------------------------------------------- |
| 2026-07-28 | m1.0-dep-graph-validation | initial draft (stub + home; created by /task-new) |
