# Spec: feature:m1.0-delivery-plan
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-07-26-m1.0-delivery-plan

<!--
  LITE forward plan (§XXVI LITE — Project Foundation, non-code). The DELIVERABLE artifact is
  docs/roadmap/m1.0-delivery-plan.md; this _index.md is the spec home + acceptance. §2–§5 fill via the
  Build Roadmap scenario loop (Steps 1–4). Governed by the No-Guessing Principle.
-->

## 1. Identity
A **delivery master plan** that binds each M1.0 issue to its concrete OS entity, code home (ADR-018),
existing intent-doc source, and proper **profile + canonical flow** (incl. the 3-level DOC spine) — so the
OS entities are coded into reality without diverging from the pattern. [FACT: task goal 2026-07-26]

**What it is NOT:** it does NOT re-decide *what* to build (docs/roadmap.md + Linear M1.0 already did that);
it does NOT write app/schema code; it does NOT re-projectize Linear. It binds *how each entity becomes real
code, in the proper pattern*. [INTERP: from Build Roadmap scenario boundary + session intent]

## 2. Business Rules
[FILL — Step 1/3] Every M1.0 issue carries the full traceability chain (issue → entity → code home →
profile → flow → doc deliverables → gate policy); no issue is dropped (coverage BOTH directions vs the 30);
the per-issue flow rides the real 3-level DOC hierarchy; dependencies match the ADR-018 code graph, not prose.

## 3. Contract
[FILL — Step 3] The plan's schema: the per-issue row shape + the phase-slice structure + the sequencing rules.

## 4. Acceptance
- [ ] All 30 M1.0 issues mapped, each with entity · ADR-018 code home · intent-doc source · profile · flow · gate policy
- [ ] Coverage verified BOTH directions (every issue ↔ every plan row; no orphan, no gap)
- [ ] Per-issue flow embeds the 3-level DOC spine (document-context baseline + documentation-component gates + currency refresh + layer-docs)
- [ ] current-* home decision resolved (docs/features vs docs/modules)
- [ ] Dependency edges cross-checked against the ADR-018 code graph by an independent critic (not roadmap prose)
- [ ] M1.4/M2/M3/M4 forward-declared (each earns its own delivery plan at its gate)
- [ ] Foundation gate (quality-gate-foundation + /critique + /preflight) → SHIP

## 5. Implementation Prompt
[FILL — Step 4] The build sequence that authors docs/roadmap/m1.0-delivery-plan.md from the decomposition.

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs Step-2 docs-pass] current-* HOME — docs/features/<module>/ (repo standard) vs docs/modules/<ctx>/ (/document-context default; dir absent)

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-26 | 2026-07-26-m1.0-delivery-plan | initial stub — home + §1 Identity + §4 Acceptance; §2/§3/§5 deferred to the loop |
