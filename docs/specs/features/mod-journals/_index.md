# Spec: feature:mod-journals

Status: draft <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-journals (§7)

<!--
  STUB — the forward spec is written for real via the Per-Step Build Gate (§XXVI) PLAN step
  (/documentation-component), per-slice. This _index is the spec HOME + identity anchor.
  Entity Delivery Flow (v1): the interpretation layer + slice-map + seam-contract + service/ spec set
  live under docs/features/journals/delivery/ and docs/features/journals/service/; each slice gets its
  own sessions/PLAN-* and IMPLEMENTATION-PLAN-* under this dir (session-split form, §XXVI).
-->

## 1. Identity

The ① backend service tier for **mod-journals #39 (LIF-127)** — the Notes & Journals integration-layer
service. One journal per day (the daily dashboard) that owns `summary(date)`, aggregates today's agenda
and the free-form entry, over `journal_snapshots` (DB-4 #20), composing `pages`/`entity_links` and the
runtime module-contribution registry.

**What it is NOT:** [FILL IN at Interpretation] — not the frontend dashboard rendering (② fe-journals),
not the aggregation _sources_ (each owning module contributes), not new schema (DB-4 #20 landed it).

## 2. Business Rules

[FILL IN — per-slice, from docs/features/journals/business-rules.md, each rule [FACT: path:line]]

## 3. Contract

[FILL IN — the seam-contract the ② UI consumes; authored at the Decomposition Gate]

## 4. Acceptance

- [ ] [FILL IN — testable DoD per slice]

## 5. Implementation Prompt

[FILL IN — per-slice, in the session-split IMPLEMENTATION-PLAN form]

## 6. Open UNKNOWNs / Decisions Needed

- [UNKNOWN: needs the Interpretation layer (Step 1) — the implicit deps, seam ownership, and slice split]

## 7. Change Log

| Date       | Session                 | Change                  |
| ---------- | ----------------------- | ----------------------- |
| 2026-09-19 | 2026-09-19-mod-journals | initial stub (task-new) |
