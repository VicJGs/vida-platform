# Spec: feature:mod-check-ins
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-check-ins

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT.
  This is the STUB + home only. §2–§6 get written for real via the loop's PLAN step (/documentation-component)
  after Step 0 BASELINE + the Entity Delivery Flow front matter (interpretation + decomposition).
-->

## 1. Identity
The ① backend **service tier** for the check-ins module — structured daily reflection (morning /
evening / afternoon / monthly-review / yearly-review) plus a template form-builder — over the DB-4
schema `daily_check_ins` · `check_in_templates` · `check_in_template_questions`
[FACT: packages/core/src/db/schema/check-ins.ts]. It mirrors the sibling module services
(`mod-preferences`, `mod-journals`, `mod-notes-and-pages` — factory-object services in `@vida/core`).

**What it is NOT:** not the ② frontend (that is `fe-check-ins`, a separate issue); not the schema
(authored at DB-4 group #16, migration `026_check_ins`, v26); not the streak/economy engine
(E9 streak is derived / Gamification-owned per DB-4 #16); not the journals daily-dashboard (it
consumes check-in data, it does not own it).

## 2. Business Rules
[FILL IN via the PLAN step — from docs/features/check-ins/business-rules.md, each rule [FACT: path:line].
 Note CK-2 composite UNIQUE(check_in_date, check_in_type); CK-3 6 check-in types; CK-10 hard-delete
 (no deleted_at on any of the 3 tables); mood/energy numeric BETWEEN bounds.]

## 3. Contract
[FILL IN — the service API the ② UI consumes (seam-contract). DELEGATE shapes to /api-contract.]

## 4. Acceptance
[FILL IN — testable DoD checkboxes.]

## 5. Implementation Prompt
[FILL IN after Approval 2 — the ordered build sequence, each step tracing a [FACT] in §1–§4.]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs the interpretation + decomposition front matter] — slice count + backend/frontend split.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | 2026-09-19-mod-check-ins | initial draft — stub + home |
