---
Session 2 — 2026-08-18
Goal: DB-4 — run the 5-phase lifecycle for domain group #1 (Notes & Pages) to completion.
Profile: Add Backend Component (scenario: schema-foundation build — 5-phase lifecycle)
---

## Accomplished
- **Group #1 Notes & Pages — full 5-phase lifecycle DONE + COMMITTED** (`f2198ac`, branch `db-4-per-domain-schema`, NOT pushed/PR'd).
- **P1 intent intake** — read the full 5-aspect feature spec + `note.ts` + ADR-002 §5.2 + the AR-6 substrate on disk. Produced the unit spec `docs/specs/foundation/db-4-notes-and-pages/_index.md`.
  - **Key finding:** AR-6 (`spaces.ts`, migration 003) already authored `tags`/`entity_tags`/`entity_links` — so Notes authors **3 net-new tables** (`pages`·`page_links`·`note_attachments`), not the 6-7 the stale ADR-002 §5.2 floor implies. `page_tags` retired→`entity_tags`; `pomodoro_sessions` re-homed→`focus_sessions` (group #3). The routing note's "`entity_links` not on disk" was stale.
- **P2 current-state read** — confirmed the 3 tables absent, substrate siblings present, RETIRE tokens absent, next migration slot = 012.
- **P3 plan double-gate** — `sessions/PLAN-2026-08-18-db-4-notes.md`. Gate-1 independent critique REVISE (1 blocker) → fixed → Approval 1 · preflight PASSED +2 folds → gate-2 SHIP → Approval 2.
- **P4 implement** — `schema/notes.ts` + `migrations/012_notes.ts` + barrel + runner registration + 4 `enum-parity.test.ts` edits. `@vida/core` **193 green** (incl. new `pages.type` parity) · root typecheck 11/11 · grep gates pass.
- **P5 foundation-soundness** — post-impl independent critique **SHIP** (0 blocker/material; added `-- [E]` SQL comments per ADR-002 §5.2 source). §XXIX promoted `database-layer/current-{spec,business-rules}.md`. Foundation-readiness (MOD-notes #31 contract) PASS.

## Decisions Made
- **Shape is fully doc-determined — zero open decisions** (`_index.md` §4 N-R1…N-R6): no-FK convention (self-ref incl.) · full `baseColumns`+`deleted_at` (ADR-016 §3.4) · `schema/notes.ts`+`012` (ADR-016 §3.1) · `has_pomodoro` retained (plaintext filter) · `summary_config` schema-neutral · `summary_config`→plain `text()` not `json<T>()`.
- **Rejected the gate-1 critic's own lean** ("promote the `@vida/types` interfaces, make it in-scope") — verified the `entity_links`/`EntityLink` divergence already ships on main + DB-3 added 0 row interfaces → the mirror-only model is correct; interface reconcile is DB-11. Kept N-R2, corrected only the wording.

## ⚠ Drift Victor caught + corrected (this session)
- I first wrote §4 as **"5 open shape-decisions for P3"** — all were doc-determined facts. Root cause: treating STALE ADR-002 §5.2 DDL as live ambiguity against the settled conventions. Corrected to N-R1…N-R6.
- Memory saved: **[[stale-source-plus-live-convention-is-fact-not-a-decision]]** — a doc flagged STALE + a settled convention = a FACT, not a decision. **No decisions come from the documentation.**

## Next session
- **FIRST ACTION: open domain group `#2 Preferences`, Phase 1 intent intake** — FRESH clean-context session (one per group, per flow doc). `docs/features/preferences/structure-data.md` (FULL, 6.7KB — a normal group, not a stub) → P2 current-state read → P3 plan double-gate → P4 implement (SQL migration + Drizzle module + `ENTITY_TYPES` verify) → P5 foundation-soundness.
- **Mirror the group-#1 build as the pattern:** `docs/specs/foundation/db-4-notes-and-pages/` + `packages/core/src/db/schema/notes.ts` + `migrations/012_notes.ts` (the first Stream (ii) module — copy its structure).
- Reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" (22-group table) · flow doc §2 · memories [[stale-source-plus-live-convention-is-fact-not-a-decision]] · [[open-vocab-columns-take-no-sql-check]].
- **1 of 22 groups done; 21 remain.** DB-4 authors ALL 22 (M1.0) before M1.1 opens (Model B). Branch not yet pushed/PR'd. ⚠ CI red repo-wide (known pnpm infra; local green).
