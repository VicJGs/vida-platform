# Task: linear-projectize
# Profile: Project Foundation Setup
# Scenario: Build Roadmap (U3 — the projectize tail; its own per-cluster gate)
# Spec: docs/specs/foundation/part-3-build-roadmap/IMPLEMENTATION-PLAN.md (§U3, S10–S11)
# Created: 2026-07-25
# Status: done
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
  - [x] **Deferred existing issues re-homed** (commit 0b6695a) — DB-5/AR-3 → **M3**, DB-11 → **M1.4**. Old ①–⑤ now **empty** (0 issues).
  - [x] **M1.4/M2/M3/M4 Project skeletons stood up** — M2 with head **provider-selection** (LIF-100); M3 = DB-5/AR-3 + **db-8b** (LIF-99) + **ux-5b** (LIF-101); M4 = **ar-9b-sync-activate** (LIF-98); M1.4 = DB-11.
  - [x] **Split halves created as separate issues** (decision 2) — db-8b (M3), ux-5b (M3), ar-9b (M4).
  - [ ] **Net-new module/integration/venue issues** — M1.1–M1.3 module waves · M2 integration families · M4 venue sub-projects. **Create-at-gate** (roadmap rule — deferred by design, not part of this task).
  - [ ] **Manual (tracker can't delete Projects):** archive the 5 empty ①–⑤ Linear Projects in the Linear UI.

## Done when
The existing structure is re-projectized onto M1→M4 and every existing issue sits on its final M-home. ✅ MET. The per-phase net-new issues are a standing create-at-gate activity, not this task's deliverable.

## Gate
Its own alignment gate (Victor): the mapping is reviewed/approved before per-cluster push; each cluster
push is separately approved. External durable state — nothing pushed without sign-off.

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-25 | Task created as the campaign follow-on (U3). build-roadmap-resequence completed + archived. | S10 — author the LIF-61…95 → M1→M4 re-scope mapping (doc-only), then gate it. |
