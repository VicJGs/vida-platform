# Task: mod-preferences
# Status: in-progress — ① backend COMPLETE (3/3 slices); pending commit + /task-complete
# Linear: LIF-133
# Profile: Add Backend Component
# Scenario: Default
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Preferences — user/nav/command-bar prefs. Build the ① service tier
(`@vida/core/services/preferences`) over the finished DB-4 #2 schema
(`user_preferences`, `nav_preferences`, `command_bar_history`).

## Dependencies
- (none)

## Build Steps
- [x] Step 0 — document-context BASELINE — N/A (no prior service context; current-* born at D6)
- [x] Step 1 — Interpretation Layer — delivery/interpretation.md (DEPS/NEEDS/ORG/IMPLICIT + Envision N/A)
- [x] Step 2 — Decomposition Gate — slice-map + seam-contract + service-spec — APPROVED
- [x] Slice 1 (user_preferences) — §XXVI double-gate (g1 REVISE→B1/m1 fixed · preflight PASS · g2 SHIP) → implemented → Verification Gate PASS (typecheck 0 · @vida/core 917 tests · eslint 0 · post-impl /critique SHIP) → §XXIX current-* born
- [x] Slice 2 (nav_preferences) — §XXVI double-gate (g1 SHIP · preflight PASS · g2 SHIP) → implemented → Verification Gate PASS (typecheck 0 · @vida/core 925 tests · eslint 0 · post-impl /critique SHIP) → §XXIX current-* updated
- [x] Slice 3 (command_bar_history) — §XXVI double-gate (g1 SHIP · preflight PASS · g2 SHIP) → implemented → Verification Gate PASS (typecheck 0 · @vida/core 932 tests · eslint 0 · post-impl /critique SHIP) → §XXIX current-* updated. §XXVIII: getCommandHistory returns CommandBarHistoryRow[] (not @vida/types CommandBarHistory — `_sync_status` string-vs-union boundary; house convention = raw readers return Row types).
- [x] Step 11 — Currency Rule (§XXIX) — current-spec + current-business-rules born (Slice-1 scope; update as slices land)

## Route History
- 2026-09-19 · Slice 1 shipped. Files: `@vida/types/entities/user.ts` (UserPreferences +10 cols, MergedPreferences),
  `@vida/core/validators/user.ts` (UserPreferencesFields + UpdatePreferencesSchema), `services/preferences/{service,types,index}.ts`,
  `__tests__/preferences-service.test.ts` (10). §XXVIII deviation: m1 merge-rule refined at impl (Drizzle nullable-with-default
  vs non-null merged view → `?? DEFAULTS` per field). @vida/types dist rebuilt (built-dist consumption seam). NOT committed.

## Decomposition (Step 2)
3 backend slices, one per table (all shared-consumed, no cross-slice dep):
1. user_preferences — type reconcile (N-1) + DEFAULTS (N-2) + merge/patch/module-visibility + E9 fields
2. nav_preferences — DEFAULTS + read-or-create merge + patch
3. command_bar_history — upsert-by-key + pin + pinned-then-frecency list
Frontend (Settings/Cmd+K UI, debounce, themeStore, search index) → fe-preferences (LIF-134, ②).
Deferred hygiene: migrate sessions' inline user_preferences read onto the seam.
Open DECIDE items (resolve at each slice's §XXVI gate): D1 interface-extension shape · D2 DEFAULTS values · D3 module-key validation source.
