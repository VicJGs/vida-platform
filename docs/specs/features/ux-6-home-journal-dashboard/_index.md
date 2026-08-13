# Spec: feature:ux-6-home-journal-dashboard
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-09-ux-6-home-journal-dashboard (created).

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT.
  This is a STUB scaffolded by /task-new. §2–§6 are written for real via the PLAN step
  (/documentation-component) under the Per-Step Build Gate (§XXVI), grounded in the No-Guessing baseline.
-->

## 1. Identity
UX-6 (LIF-95) — **Home = the Journal daily dashboard.** The landing experience Victor opens every day:
today's auto-generated summary + agenda (tasks/reminders/class schedule) + the free-form markdown journal
entry, aggregating data across all modules per ADR-004's provider registry.

- **The desire:** a single daily dashboard that is the connective tissue across the 8 modules.
- **What it is NOT:** [UNKNOWN: confirm at PLAN] — not the aggregation ENGINE / module feeds (Phase 1b);
  not the rendered React component (deferred to UI-4, same shape as UX-3/4/5 pending Step-1 3-signal check).

## 2. Business Rules
[FILL IN at PLAN — invariants · validation · ALL terminal states · failure behavior. Ground in
`docs/features/journals` + ADR-004.]

## 3. Contract
[FILL IN at PLAN — the typed declarative artifact's shape (design-model, per UX-3/4/5 precedent), or
DELEGATE to /contract if a rendered component is in scope after the Step-1 shape check.]

## 4. Acceptance
[FILL IN at PLAN — testable Definition of Done, every item a checkbox.]

## 5. Implementation Prompt
[FILL IN at PLAN — numbered ordered build sequence citing §1–§4.]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs Step-1 3-signal check] deliverable shape — design model vs rendered component.
- [UNKNOWN: needs PLAN] aggregation boundary — which module feeds are designed here (deferred provider
  seams per ADR-004) vs which land in Phase 1b.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | ux-6-home-journal-dashboard | initial stub (scaffolded by /task-new) |
