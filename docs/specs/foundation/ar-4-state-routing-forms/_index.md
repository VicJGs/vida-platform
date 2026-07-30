# Spec: feature:ar-4-state-routing-forms
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: apps/web/src/{stores,router,forms}
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-07-29-ar-4-state-routing-forms (see §7)

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION; §5 the executable PROMPT.
  This is a STUB scaffolded by /task-new. §2–§6 are filled for real at the PLAN gate (§XXVI) via
  /documentation-component, grounded on the Step 0 document-context baseline. Do not implement from this stub.
-->

## 1. Identity
[FACT: docs/roadmap/m1.0-delivery-plan.md §149 (LIF-75)] AR-4 wires the `apps/web` client runtime per ADR-001:
Zustand (client state), React Query v5 (async/DB state), TanStack Router (web routing), and TanStack Form + Zod
(validated forms). Home: `apps/web/src/{stores,router,forms}`.

**Intent.** Give every later web feature (UI-3 editor, UI-4 app shell, all module screens) a single,
convention-fixed state/routing/forms substrate to mount onto.

**What it is NOT.** [INTERP] Not any feature UI or module screen. Not a network data layer — this is a
local-first ZK app, so React Query reads the local SQLite repository (db-6), not HTTP. Not the mobile/desktop
runtime (web only). [UNKNOWN: grain — full working wiring vs spine/scaffold — resolved at PLAN from §149 flags.]

## 2. Business Rules
[UNKNOWN: needs the Step 0 baseline + PLAN] — invariants (Zustand = global client only; React Query = all
server/DB state; useState = local per §XVII), query-key conventions, form validation via Zod, terminal states.

## 3. Contract
[UNKNOWN: needs PLAN] — the store shapes, query-client config, router tree/route-registration API, form
factory/adapter signatures.

## 4. Acceptance
- [ ] [UNKNOWN: filled at PLAN — testable DoD per ADR-001 + engineering §XV–XVIII]

## 5. Implementation Prompt
[UNKNOWN: filled at the IMPL-PLAN gate (§XXVI g2) after Approval 1] — numbered build sequence citing §1–§4.

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs PLAN] GRAIN — all four planes as working wired infra, or spine/scaffold grain (cf. AR-5/AR-6).
- [UNKNOWN: needs PLAN] Router shape — single root tree vs lazy per-module registration seam.
- [UNKNOWN: needs PLAN] React Query queryFn source = local repository (db-6), confirm the local-first read model.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-29 | 2026-07-29-ar-4-state-routing-forms | initial stub scaffolded by /task-new |
