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
- [x] **S10 — re-scope mapping authored + gated** — `part-3-build-roadmap/linear-rescope-map.md` (all 35 issues → M-homes); Victor approved the mapping + 4 decisions (retire ①–⑤ · splits as separate issues · DB-2 re-home · M1.0 first). Commit a603369.
- [~] **S11 — Gated push, per-cluster:**
  - [x] **M1.0 Boot & Connective Base — PUSHED** (commit 145ccbd): created the Linear Project + 5 milestones; moved the 30 boot/foundation issues in by existing LIF id (no dups). linear-projectize = LIF-97. (Fixed: M1.0 desc trimmed <255 chars — Linear cap.)
  - [ ] **Deferred existing issues** — DB-5/AR-3 → M3 project; DB-11 → M1.4; then retire old ①/② (①–⑤: ③④⑤ already empty after M1.0). Each its own gate.
  - [ ] **Split halves (net-new)** — DB-8b (M3), AR-9-activate (M4), UX-5b (M3/M4).
  - [ ] **Net-new module/integration/venue issues** — M1.1–M1.3 module waves · M2 provider-selection + integration families · M3 encryption · M4 venues. Created **at each cluster's gate** (roadmap rule — not all up front).

## Gate
Its own alignment gate (Victor): the mapping is reviewed/approved before per-cluster push; each cluster
push is separately approved. External durable state — nothing pushed without sign-off.

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-25 | Task created as the campaign follow-on (U3). build-roadmap-resequence completed + archived. | S10 — author the LIF-61…95 → M1→M4 re-scope mapping (doc-only), then gate it. |
