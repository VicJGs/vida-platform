# Spec: refactor:db-9-enums-zod

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: draft <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-07-28-db-9-enums-zod (created this stub).

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT.
  This is the STUB (home + identity only); §2–§6 are written for real in the loop's PLAN step
  (/documentation-component). Governed by the No-Guessing Principle.
-->

## 1. Identity

The canonical **enum sets** for the M1.0 domains, authored once and expressed in two parity-locked forms
per ADR-002: TEXT + `CHECK` constraints in the SQL schema, and canonical **Zod validators** in `@vida/core`,
with enum literal types surfaced in `@vida/types`. [FACT: docs/roadmap/m1.0-delivery-plan.md:112 — "DB-9 |
71 | Canonical enums + Zod validators | packages/types/src/, core validators | ADR-002 (CHECK+Zod)"]

**What it is NOT:** [FILL IN — e.g. NOT the per-domain table schemas (DB-4, streaming); NOT runtime
validation wiring into the repository (that consumes these validators, it does not define them).]

## 2. Business Rules

[FILL IN — invariants (SQL CHECK ↔ Zod must never diverge) · which enum sets are in M1.0 scope · failure
behavior on invalid enum · edge cases.]

## 3. Contract

[FILL IN — the exported enum literal types (@vida/types), the Zod validators (@vida/core) signatures, the
CHECK-constraint SQL surface, and how parity is enforced.]

## 4. Acceptance

Testable Definition of Done:

- [ ] [FILL IN]

## 5. Implementation Prompt

[FILL IN via the PLAN step — numbered, ordered, file-path-precise, each step tracing to a §1–§4 FACT.]

## 6. Open UNKNOWNs / Decisions Needed

- [UNKNOWN: needs PLAN gate] Enum-set scope: which sets are M1.0-canonical vs deferred to their feature phase.
- [UNKNOWN: needs PLAN gate] Parity-enforcement mechanism (generate one from the other, or a parity test).

## 7. Change Log

| Date       | Session                   | Change                                                  |
| ---------- | ------------------------- | ------------------------------------------------------- |
| 2026-07-28 | 2026-07-28-db-9-enums-zod | initial stub — home + identity; §2–§6 pending PLAN step |
