# Task: fix-linear-foundation-cycles
# Status: planned
# Linear: LIF-235
# Profile: Project Foundation / Milestone Delivery Planning
# Project: M1 — Whole Manual OS

## Goal
Resolve the **dependency cycles in the Linear `blocks` graph** among the foundation MOD issues, surfaced by the
2026-10-10 fe-home tracker deep-check. The graph is not a valid DAG.

## The cycles (all nodes currently Done → inert, non-blocking, but graph-invalid)
- **LIF-127 (mod-journals) → LIF-131 (mod-notes-and-pages) → LIF-139 (mod-sessions) → LIF-127** (3-cycle)
- **LIF-127 → LIF-131 → LIF-133 (mod-preferences) → LIF-127** (3-cycle)

Root cause (hypothesis): the P5/P6 mass edge-creation applied "foundation module **blocks** all consumers" edges plus
inter-foundation edges in inconsistent directions (e.g. journals `blocks` notes AND sessions `blocks` journals). The
real dependency direction is one-way (foundations → consumers); the reverse edges are the bug.

## Scope
- Audit the `blocks`/`blockedBy` edges among LIF-127/131/133/139 (+ their foundation neighbors) against the true
  ADR dependency direction; delete the wrong-direction edges (`issueRelationDelete`) so the graph is acyclic.
- Re-run an acyclicity check (the `/tmp/fehome-vg/integrity.py` DFS, or fold into `tracker_sync --verify`).
- Consider adding an **acyclicity assertion to `tracker_sync --verify`** so this can't regress silently (the tracker
  currently verifies identity/existence only — [[verify-misses-status-drift-and-stale-linear-relations]]).

## Priority
LOW/urgency — all cycle nodes are Done, so no live work is blocked and `--next` still functions. Graph-hygiene +
a guard against future `--next` miscomputation once these become dependencies of live work. Own §XXVI gate.

## Context
Surfaced during fe-home (#18) close-out alongside the 5-issue orphan-create duplicate cleanup (LIF-222…226). Separate
root cause (P5/P6 edge tangle, not the orphan dups). See the 2026-10-10 session log.
