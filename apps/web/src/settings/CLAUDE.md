# apps/web/src/settings — the Settings System surface (fe-settings #24, LIF-193)

**Owning issue:** fe-settings #24 (M1.2.1) · **Authority:** add-frontend-component / Entity Delivery Flow ② ·
intent `docs/features/preferences` + `decomposition.md:71` (the System archetype) · delivery:
`docs/specs/foundation/fe-settings/delivery/` (interpretation · envision [12 ECs] · slice-map · seam-contract · s1-switch).

## The surface (two-pane System archetype, EC-1)
`/settings`, rendered inside the UI-4 shell `<Outlet/>` (lazy route, `routes.tsx`). Composes shipped @vida/ui primitives;
DIRECT semantic tokens, no sub-themes. Reachable from the shell Bar-1 + ⌘K (nav/module-map.ts:104 registers the entry).

- `settings-surface.tsx` — **SettingsSurface** (S3, default export): left category rail (accent left-tick + secondary
  fill on the active item, keyboard-navigable `render:'button'` rows) + right pane (a search box as chrome — **disabled
  until S4 wires the index filter** — + the active category's content). Responsive (EC-10): stacks to one column below
  768 via the `$tablet` media token (nav above pane). **Honest states (EC-7, preferences-rescope R3 / D1)** on
  `usePreferences().state`: **loading** → `SettingsSkeleton`; **error** → every pane READ-ONLY over the view (via
  `SettingsContext`) + a calm muted `role="status"` line whose copy matches what's shown (`hasData` false → "showing
  defaults", the first-read error; true → "showing what was last loaded", a later read error) + a **Retry** button
  (`intent="secondary" size="lg"`, before the pane in DOM order, never disabled — the one live control) calling
  `usePreferences().retry`, which re-reads only the errored key(s); **success** → editable. **Focus:** only after a Retry
  press — first-read error → the skeleton (`tabIndex=-1`), then the pane region on success or Retry on a repeat error; a
  later-error Retry keeps the button mounted and focused. A Retry ends when its re-reads settle (`retry()` →
  `Promise<boolean>`), so a later unrelated refetch never moves focus; each failed Retry re-keys the status line
  (re-announced). Without a press, no focus moves. **Saves (C5 UI):** the surface
  owns the ONE `useUpdatePreferences()` (shared via `SettingsContext.update`) and renders one bare `SyncStatus
  state="saved"` ("Saved on this device") after a save — **no "Saving…" state** (P4); a failure clears it (the writer's one
  revert toast reports it, so it is never announced twice). `role="region"`.
- `appearance-pane.tsx` — **AppearancePane** (S3, EC-4 Appearance + EC-5 live apply; **persisted since R3**): a `Card`
  of `OptionRow`s reading `usePreferences().view` and writing `useSettings().update` — Theme preset → `dashboard_layout.theme`
  / Mode → `theme` / Density → `compact_mode` (the writer's optimistic cache → the derived `theme-store` → **live re-theme
  of the whole app**, reverted on a failed save) · **Persona** (D4, directly under the theme rows: `Not set` + the 6
  `PERSONA` values; `Not set` ↔ `null`) · Reduce motion (`Switch` → `nav_preferences.reduce_motion`, persisted since R4) · Home arrangement
  → `dashboard_layout.arrangement` (read by `useHomeArrangement`). Every control `disabled` when read-only. Each control
  carries its own `aria-label`. **Mode = Light/Dark only** (ThemeMode has no 'system'; honest > a fake 3rd value). No
  `game` preset (`game` is a module, not a theme — D3).
- `settings-context.tsx` (R3) — `SettingsContext` `{ readOnly, update }` + `useSettings()`. Default = editable + the
  writer-backed `updateView`, so a pane rendered alone (its tests) still reads and writes. R5/R6 plug into it.
- `settings-skeleton.tsx` (R3) — the state-conventions §3.1 pane skeleton: a Card of option-row-height bars on
  `$colorSurfaceSecondary`, `$md` radius, STATIC (nothing to gate under reduced motion), `role="region"` + `aria-busy`,
  `tabIndex=-1` (the Retry focus target). Rare live: the boot seed fills the cache before Settings can mount.
- `settings-copy.ts` (R3/R5) — **every user-facing string this unit adds** (read-error ×2, save-failed toast, persona row,
  Retry, loading label; R5: the ⌘K pin announcements as functions of the label, the pinned suffix, the pin hint), one
  module (F17); `settings-copy.test.ts` runs `lintCopy` over every entry (functions with a sample label). Imports nothing.
- `option-row.tsx` — **OptionRow** (EC-2): label (+ muted description) ↔ control slot, hairline divider. Layout only;
  the control owns the accessible name.
- `settings-model.ts` — `SETTINGS_CATEGORIES` (rail, `built` flag) + `SETTINGS_INDEX` (the searchable index entries:
  label·description·keywords — S4's search + grouping both read this, conventions.md:16 G7; R3 added `persona`).
- `settings-search.ts` — **S4 (EC-6):** `searchSettings(query)` pure case-insensitive substring filter over
  `SETTINGS_INDEX` (label+description+keywords; empty→[]) + `groupResults()` (by category, index order). One index drives
  both the box and the grouping.
- `settings-search-results.tsx` — **S4:** the results view — matches grouped by category with an uppercase eyebrow +
  an "N settings" count; each result row (`role=button`) navigates to its category + clears the query. No match → a calm
  `EmptyState` in `role="status"` ("No setting matches '<q>'" + hint). The search box (settings-surface) is now LIVE
  (controlled `query`; non-empty → results replace the pane; clearing restores it).
- `modules-pane.tsx` — **S5 (EC-4 module controls · EC-8 escape hatch · EC-12 rename):** a **Modules** Card of
  per-module rows (show/hide `Switch` + inline rename: pencil → `Input` + save/cancel icon buttons, Enter/Esc) over
  `HIDEABLE_MODULES`, plus a **Surfaces** Card (Feature Atlas · Sync log toggles). **Persisted since preferences-rescope
  R5:** reads `usePreferences().view` and writes `useSettings().update` — show/hide + Surfaces → `module_visibility`, rename
  → `dashboard_layout.moduleNames` (map merges; trimmed, ≤ 40 chars `MODULE_NAME_MAX`). Every row control speaks the
  DISPLAY name. Controls are `lg` (Switch `lg` = its documented touch size; icon Buttons `lg` 48). Read-only (R3) hides
  rename + disables the switches. The hideable list EXCLUDES the always-reachable surfaces (Settings/Home); the rule lives
  in `../nav/nav-prefs` (`isHideableModule`), and the nav readers apply it on read too (EC-8 read side).
- `locale-pane.tsx` — **S6 (EC-4):** a `Card` of `OptionRow`s — Date format · Time format · Week starts on (`Select`s
  over the existing `user_preferences` locale fields; week_starts_on 0|1 ↔ Sunday/Monday at the Select boundary).
  Still on `preferences-store` (persist = R6); `disabled` when read-only (R3).
- `notifications-pane.tsx` — **S6 (EC-4):** channel `Switch`es (In-app · Push · Email) + a Quiet-hours toggle (the
  start/end time inputs are a follow-up — the delivery-engine routing is M2; a single toggle is honest for M1). Still on
  `preferences-store` (persist = R6); `disabled` when read-only (R3).
- `delegated-pane.tsx` — **S6 (EC-9):** the `DelegatedPane` + `DELEGATED_PANES` (Data · Account) — calm, muted
  `role="status"` placeholders ("a later release"); Settings RENDERS but never OWNS these (PR-8, identity.md:24-25 —
  owners = Data/Sync + Auth/Account, M3/M4). Visually distinct from the live control panes.
- The read/write SEAM moved to **`../preferences/`** (preferences-rescope R2): `usePreferences()` (live, React Query over
  SQLite; honest `state`) + `useUpdatePreferences()` (writer-backed, optimistic + revert, `saveState`). See
  `../preferences/CLAUDE.md`.

## Stores (app-owned theme/pref state — AR-4)
- `../stores/theme-store.ts` (S2; **derived since R3**) — `{ persisted, previewPreset, selection, reduceMotion }` →
  `<UIProvider selection reduceMotion>` (R4: `reduceMotion` follows the `['preferences','nav']` entry in the same subscription); the EC-5 keystone. `persisted` follows the `['preferences','user']` cache through one query-cache
  subscription (no theme setters — Settings writes go through the writer); `setPreview` is the guided-setup preview layer.
- `../stores/preferences-store.ts` (S3 + S6) — TRANSITIONAL mirror (hydrated by `PreferencesBridge`): `dateFormat`/`timeFormat`/`weekStartsOn` + `notifInApp`/`notifPush`/`notifEmail`/
  `quietHours` (S6). `arrangement` left it in R3, `reduceMotion` in R4, the module maps in R5 (the Appearance switch writes `update({ reduceMotion })`). Persist per
  slice (R5/R6); R6 deletes it.

## Live data (preferences-rescope — supersedes the 2026-10-12 "deferred seam")
The worker data plane is live (data-plane-wiring) and the Preferences seam is wired (R2): reads come from React Query over
SQLite. **R3 moved Appearance onto the seam** (theme · persona · arrangement persist; reduce motion in R4; **Modules in R5**). The
other panes still bind `preferences-store`, hydrated FROM the persisted view (the `PreferencesBridge` mirror), and move in
their own slice (R6 Locale/Notifications — R6 deletes `preferences-store`); until then their edits are
in-session only.

## ECs covered — S1–S6 (surface COMPLETE)
S1 `Switch` primitive (EC-3) · S2 theme store (EC-5 mechanism) · S3 shell+route+Appearance (EC-1,2,5-live,7,8,10) +
gate-1 #1 (activated `useHomeArrangement`) · S4 search (EC-6) · S5 Modules show/hide+rename+Surfaces (EC-4 rem · EC-8
escape hatch · EC-12 rename) · S6 Locale/Notifications (EC-4) + delegated Data/Account placeholders (EC-9). All 6
categories built. EC-11 (editorial voice/feel) = verified per-slice at each live Visual Gate.

## Rules
- Persisted pref changes go through `useSettings().update` (→ the preferences writer); never write `theme-store` or the
  raw service, never hardcode a palette. Not-yet-migrated panes still dispatch to `preferences-store`.
- Every pane honours `useSettings().readOnly` (`disabled` / rename hidden). New user-facing copy goes in `settings-copy.ts`.
- `dashboard_layout` writes are per-sub-key merges (the writer, seam-contract §B) — never clobber sibling sub-keys.
- The escape hatch (S5): module-visibility can never hide Settings itself (business-rules.md:27 — UI-enforced, not
  service). Since R5 it holds on READ too: `../nav/nav-prefs` `applyNavPrefs` ignores any map entry for Settings/Home.
