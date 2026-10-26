# Task: notes-rescope
# Status: planned
# Linear: LIF-245
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Notes & Pages live close: remaining legs, #31 inline blocks, 8 diverged ECs

## Goal
Notes & Pages live close: remaining legs, #31 inline blocks, 8 diverged ECs. Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
metadata · attachments · `[[` picker + trigger · link preview · templates · view-config · rename/delete · mode memory · the #31/ui-3 root (integration-block bodies · palette · `[[` trigger) · ❌ EC-5/7/10/11/13/15/18/18a · offersEditor page-type gate · TZ date bug · empty excerpt · collection `degraded` + XCU-14 · SyncStatus live · dead seams · `useJournalSummary` hook flip · backend: templates S3–S5 (append to docs/features/templates/delivery/slice-map.md, RATIFY) + XCU-14 view fields (docs/features/views/delivery/slice-map.md)

## Ledger home
docs/features/notes-and-pages/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- soft: preferences-rescope (EC-5 per-type mode default, if stored as a preference — resolve at the Interpretation Gate)

## Route History
- 2026-10-26 (Step 0 — baseline) — Worktree `.claude/worktrees/notes-rescope` off origin/main @ 78d02d8. document-context BASELINE over BOTH planes (① services/notes full; ② apps/web/src/notes 31/31 non-test full). Refreshed `docs/modules/notes/current-{spec,business-rules}.md`: ① citations re-anchored, `ensureJournal` + BR-7b (listPages includes archived) + BR-7c (writes ignore deleted_at) added, BR-10 wording corrected; ② surface plane documented (hooks LIVE/STUB table, components, editor gate, BR-SUR-1…9). Baseline findings feeding reconciliation: `offersEditor` excludes the 4 `*_note` types (EC-15) · UTC `ymd` row date (TZ bug) · empty excerpt · `degraded:[]` + no SyncStatus · no `[[` input rule · 8 stale "no composition root" headers · journals registry empty in apps/web.
