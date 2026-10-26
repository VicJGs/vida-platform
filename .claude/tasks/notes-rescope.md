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
- 2026-10-26 (Step 1 — Documentation Gate: FAIL → remediated → PASS) — Audit FAIL (9 blocking): the 5 N&P aspect docs + intake were deleted by the MOD-notes teardown (eaf64f8, 2026-09-13) and never restored though features/README:36 + docs/README:96 list them ✅. Restored to the original paths from eaf64f8^ and realigned to the rebuilt schema (3 owned tables, no FKs, entity_links/tags = AR-6 substrate), ADR-004/006/007/008/009/021 and the Step-0 baseline; intake kept as-is (append-only notes). Grounded 14 "UNKNOWN" items: 7 doc-resolved (offersEditor → page type per debt-census:84-88 = NP-10; delete = undo + Trash 30 days per quality-bar P4; rename = updatePage; `[[` = suggestion surface; preview M1 = EC-11; SyncStatus M1 states; G6 backlinks half = EC-6). Independent critique round 1 REVISE (8 blocking — incl. an unsupported CAP-12 re-home of mine, REVERTED; archived-hidden + NP-12 overclaims retagged), round 2 REVISE (2 line-shift cite defects → notes moved to file ends, append-only verified by diff) → PASS. EC-18a re-homed fe-journals → notes-rescope in fe-notes slice-map (per coverage-report:64). 13 UNKNOWNs remain, each homed to a named step of THIS unit: Interpretation Gate ×8 (delete-leg scope, archived/journals in /notes, mode-memory storage + per-type defaults, has_pomodoro setter, block bodies vs placeholder, /notes views row, G6 creation half, CAP-12 page applicability → Step 4) · slice PLANs ×4 (purge timing, excerpt rule, summary_config→JournalSelection, icon domain/cover ref, attachment upload UX) · Step 5 templates append ×1 (page-doc authored line). Recorded deltas incl. BR-SUR-3 data-loss risk (malformed content → null → next edit overwrites).
- 2026-10-26 (Step 2 — Interpretation) — Rewrote docs/features/notes-and-pages/delivery/interpretation.md as the cross-plane RESCOPE interpretation (supersedes the ① build's, kept at ef8c1ed): dependencies per plane + borrowed legs, a NEEDS-per-leg table (missing ① ops: restorePage + deleted read; missing editor `[[` suggestion seam; missing mode store; templates instantiate/capture), OWNS/CONSUMES/DELEGATES, IR-R1…R12 (incl. delete must cancel the pending body flush; malformed-content overwrite guard; Home shares the body), and 8 items for the Interpretation Gate.
