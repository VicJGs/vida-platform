---
Date: 2026-09-19 — mod-preferences #37 (LIF-133) — M1.1.1 Backend head — ① service tier COMPLETE (3 slices)
Task: mod-preferences · Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow) · branch `mod-preferences` → PR #44 → main (`4cf51de`) → Done
Goal: build `@vida/core/services/preferences` over the finished DB-4 #2 schema (user_preferences, nav_preferences, command_bar_history).
---

Task completed.

Accomplished:
  - **① backend service tier** `@vida/core/services/preferences` — `createPreferencesService({ db, deviceId })`. 3 slices, each
    §XXVI double-gated (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2) + a per-slice live-store
    Verification Gate:
    - **Slice 1 · user_preferences** — `getMergedPreferences` (read-or-DEFAULT, no persist), `updatePreferences`
      (create-on-first-write singleton), `getModuleVisibility`/`setModuleVisibility`, E9 config. Extended `@vida/types`
      `UserPreferences` (+10 schema cols) + `MergedPreferences`; `UserPreferencesFields`/`UpdatePreferencesSchema`.
    - **Slice 2 · nav_preferences** — `getNavPreferences`/`updateNavPreferences` + `MergedNavPreferences` + Nav schemas.
    - **Slice 3 · command_bar_history** — `recordCommand` (upsert-by-key), `pinCommand`, `getCommandHistory`
      (pinned-then-frecency) + `RecordCommandSchema`.
  - Entity Delivery Flow front matter: `docs/features/preferences/delivery/{interpretation,slice-map,seam-contract,service-spec}.md`.
  - **Verification: @vida/core 932 tests (+25) · typecheck 0 · eslint 0.** 25 live-store acceptance tests.
  - §XXIX durable docs born: `docs/modules/preferences/current-{spec,business-rules}.md`.

Decisions (see .claude/docs/decisions.md):
  - Read-or-DEFAULT (create-on-write), not read-or-create — dissolves the first-read race (sessions:224 precedent).
  - §XXVIII ×2 (both typecheck-caught): `MergedX` config-view types (no SyncableEntity metadata on the defaults path);
    raw list readers return Drizzle Row types (`CommandBarHistoryRow[]` — `_sync_status` string-vs-union boundary; DB-11 reconcile).
  - D3: `setModuleVisibility` structure-validates the key only (no module registry exists); `pinCommand` no-ops on absent key.
  - `?? DEFAULTS` (not `||`) preserves falsy-valid config. Grounding directive held throughout (Victor ×5).
  - Memory: [[drizzle-row-not-assignable-to-vida-types-interface]] (new).

Deferred (documented, not this issue): ② frontend `fe-preferences` (LIF-134) · DB-11 `CommandBarHistory` interface
reconcile · migrating `sessions`' inline `user_preferences` read onto the seam.

Next session: next `#`-order head after mod-preferences #37. Compute via `reconstructed-structure.md` `#` order
(`--next` advisory). mod-journals #39 (← mod-sessions✅, xs-measurement✅) is the likely next ready backend head. Env: Node 24 via nvm.
