# Spec: feature:xs-backlinks-search-export

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: draft <!-- draft → approved → implemented -->
Source-repo: packages/core/src/services/search · packages/core/src/services/export · @vida/editor
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-20-xs-backlinks-search-export

<!--
  STUB — written at /task-new. The real spec is authored AFTER Step 4 reconciliation +
  Step 5 re-scope (Entity Delivery Flow recovery variant): the slice-map turns each
  ❌/📄/🕳/⛔ into a scoped slice, and each slice gets its own §5 build prompt via the
  §XXVI PLAN gate. Do not fill §2–§6 before the reconciliation ledger exists.
-->

## 1. Identity

The `xs-backlinks-search-export` cross-cutting **read/query service tier** — the READ side of the
platform's connective tissue in `@vida/core`. Unifies four engines: the backlink resolver (BUILT,
AR-8 #1, read-only over the AR-6 `entity_links` substrate), FTS5 full-text search, export
serializers (markdown/PDF/DOCX), and neural-graph data-prep.

**What it is NOT:** not a write path (link create/remove is AR-6 `SpacesService`); not the UI
(search box, export dialog, Sigma.js render → P6 frontend); not the FTS5 table DDL (DB-8).

## 2. Business Rules

[FILL IN after Step 4 reconciliation — per-slice, from the source corpus BL-1..BL-6 + XCU-BSE-*]

## 3. Contract

[FILL IN — per-slice signatures from the slice-map; delegate nothing to /contract (backend)]

## 4. Acceptance

[FILL IN — testable DoD per slice]

## 5. Implementation Prompt

[FILL IN — per approved slice, via the §XXVI PLAN → IMPLEMENTATION-PLAN gate]

## 6. Open UNKNOWNs / Decisions Needed

- [UNKNOWN: needs Step 4 reconciliation] Which deferred engines (search/export/graph-prep) does
  M1.1.2 `#42` own vs. keep as a first-consumer-pull seam?

## 7. Change Log

| Date       | Session                               | Change                         |
| ---------- | ------------------------------------- | ------------------------------ |
| 2026-09-20 | 2026-09-20-xs-backlinks-search-export | initial stub + home (task-new) |
