# Spec: feature:build-roadmap-resequence
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: list the session slug(s) that created/changed this spec in §7.

<!--
  This is a FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION (truth that
  travels with the component); §5 is the executable PROMPT that cites §1–§4. Depth scales by <type>.
  This is a LITE forward plan (Build Roadmap scenario, Step 4): the built artifact is docs/roadmap.md,
  not code. Written for real at the PLAN step via /documentation-component.
-->

## 1. Identity
Re-sequence the Vida Phase-1.0 build roadmap from the current layer-first ordering to a FEATURES-FIRST
ordering per [FACT: docs/core/decisions/ADR-017], deferring encryption/sync/auth to a later hardening
pass, then re-cluster and re-projectize the deliverables into the tracker.

What it is NOT: it does NOT change the SET of deliverables (unchanged per ADR-017), does NOT build any
deliverable, and does NOT alter any architecture decision — only sequencing + clustering.

## 2. Business Rules
[FILL IN — invariants: deliverable set unchanged; encryption/sync/auth deferred not dropped; every
existing issue LIF-61…95 must map forward; no dependency inversion; add-only tracker relations.]

## 3. Contract
[FILL IN — the roadmap artifact's structure: phase spine · dependency map · cluster decomposition ·
Linear mapping · sequencing rules · integration register.]

## 4. Acceptance
[FILL IN]
- [ ] ...

## 5. Implementation Prompt
[FILL IN at the PLAN step via /documentation-component — the ordered build sequence for docs/roadmap.md.]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs Step 1 intent] which single feature is the first deliverable slice (web-SPA tester vehicle)
- [UNKNOWN: needs Step 3] whether feature clusters replace or overlay the ①–⑤ layer clusters

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-23 | build-roadmap-resequence | initial draft (stub) |
