# Task: linear-projectize
# Profile: Project Foundation Setup
# Scenario: Build Roadmap (U3 — the projectize tail; its own per-cluster gate)
# Spec: docs/specs/foundation/part-3-build-roadmap/IMPLEMENTATION-PLAN.md (§U3, S10–S11)
# Created: 2026-07-25
# Status: planned
# Cluster: General_Vida

## Goal
Re-projectize Linear onto the rewritten roadmap's **M1→M4** clusters — the campaign follow-on (U3).
Victor wants Linear properly aligned (NOT deferred). It has its own gate because the information must
be aligned before it becomes durable external tracker state.

## Context
The foundation-realignment campaign (build-roadmap-resequence) is COMPLETE — `docs/roadmap.md` was
rewritten features-first (M1→M4, ADR-019). The old 35 Phase-1.0 Linear issues (LIF-61…95) were
sequenced **substrate-first** and are now stale against the M1→M4 order. They must be **re-scoped /
re-ordered, not duplicated**.

Basis:
- `docs/roadmap.md` — the M1→M4 target (clusters → Projects, deliverables → Issues).
- `docs/specs/foundation/part-3-build-roadmap/IMPLEMENTATION-PLAN.md` §U3 (S10–S11).
- `docs/specs/foundation/part-3-build-roadmap/_index.md` §5 (cluster decomposition) + §2.1 (the ledger).
- `.claude/tracker.json` (initiative `vida-platform`, workstation `personal`).

## Build Steps
- [ ] **S10 — Author the old→new re-scope mapping** (doc-only, NO push): every old LIF-61…95 issue → its
      new M-cluster/milestone, or explicitly "re-scoped / merged / deferred." Record in the roadmap's
      Linear-mapping section. Gate this mapping (critique for alignment) before any push.
- [ ] **S11 — Gated push** `/track-sync --approve-cluster`, ONE cluster at a time, each with explicit
      Victor sign-off before it creates Linear state. Start M1.0 → M1 waves → M2 → M3 → M4.

## Gate
Its own alignment gate (Victor): the mapping is reviewed/approved before per-cluster push; each cluster
push is separately approved. External durable state — nothing pushed without sign-off.

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-25 | Task created as the campaign follow-on (U3). build-roadmap-resequence completed + archived. | S10 — author the LIF-61…95 → M1→M4 re-scope mapping (doc-only), then gate it. |
