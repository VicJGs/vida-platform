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
  768 via the `$tablet` media token (nav above pane). Honest states (EC-7): threads `usePreferences().state` —
  error → defaults read-only + a calm "your data is safe on this device" line; success → the panes. `role="region"`.
- `appearance-pane.tsx` — **AppearancePane** (S3, EC-4 Appearance + EC-5 live apply): a `Card` of `OptionRow`s —
  Theme preset / Mode / Density (→ `theme-store`, **live re-theme of the whole app**) · Reduce motion (`Switch` →
  `preferences-store`) · Home arrangement (→ `preferences-store`, read live by `useHomeArrangement`). Each control
  carries its own `aria-label`. **Mode = Light/Dark only** (ThemeMode has no 'system'; honest > a fake 3rd value).
- `option-row.tsx` — **OptionRow** (EC-2): label (+ muted description) ↔ control slot, hairline divider. Layout only;
  the control owns the accessible name.
- `settings-model.ts` — `SETTINGS_CATEGORIES` (rail, `built` flag) + `SETTINGS_INDEX` (the searchable index entries:
  label·description·keywords — S4's search + grouping both read this, conventions.md:16 G7).
- `settings-search.ts` — **S4 (EC-6):** `searchSettings(query)` pure case-insensitive substring filter over
  `SETTINGS_INDEX` (label+description+keywords; empty→[]) + `groupResults()` (by category, index order). One index drives
  both the box and the grouping.
- `settings-search-results.tsx` — **S4:** the results view — matches grouped by category with an uppercase eyebrow +
  an "N settings" count; each result row (`role=button`) navigates to its category + clears the query. No match → a calm
  `EmptyState` in `role="status"` ("No setting matches '<q>'" + hint). The search box (settings-surface) is now LIVE
  (controlled `query`; non-empty → results replace the pane; clearing restores it).
- `modules-pane.tsx` — **S5 (EC-4 module controls · EC-8 escape hatch · EC-12 rename):** a **Modules** Card of
  per-module rows (show/hide `Switch` + inline rename: pencil → `Input` + save/cancel icon buttons, Enter/Esc) over
  `HIDEABLE_MODULES`, plus a **Surfaces** Card (Feature Atlas · Sync log toggles). All state → the in-session
  `preferences-store` (`moduleVisibility`/`moduleNames`); persist = deferred seam. The hideable list EXCLUDES the
  always-reachable surfaces (Settings/Home) — the escape hatch is UI-enforced here (the service doesn't guard it).
- `locale-pane.tsx` — **S6 (EC-4):** a `Card` of `OptionRow`s — Date format · Time format · Week starts on (`Select`s
  over the existing `user_preferences` locale fields; week_starts_on 0|1 ↔ Sunday/Monday at the Select boundary).
- `notifications-pane.tsx` — **S6 (EC-4):** channel `Switch`es (In-app · Push · Email) + a Quiet-hours toggle (the
  start/end time inputs are a follow-up — the delivery-engine routing is M2; a single toggle is honest for M1).
- `delegated-pane.tsx` — **S6 (EC-9):** the `DelegatedPane` + `DELEGATED_PANES` (Data · Account) — calm, muted
  `role="status"` placeholders ("a later release"); Settings RENDERS but never OWNS these (PR-8, identity.md:24-25 —
  owners = Data/Sync + Auth/Account, M3/M4). Visually distinct from the live control panes.
- `use-preferences.ts` — the read/write SEAM: `usePreferences()` (in-session stores over defaults; `state`) +
  `useUpdatePreferences()` (optimistic store setters). The live DB read/write is DEFERRED (see below).

## Stores (app-owned theme/pref state — AR-4)
- `../stores/theme-store.ts` (S2) — `{preset,mode,density}` → `<UIProvider selection>`; the EC-5 keystone (replaced the
  `THEME_DEFAULT` constant in `App.tsx`). Theme changes apply live with NO DB.
- `../stores/preferences-store.ts` (S3 + S5 + S6) — `reduceMotion` + `arrangement` (read live by `useHomeArrangement`) +
  `moduleVisibility`/`moduleNames` (S5) + `dateFormat`/`timeFormat`/`weekStartsOn` + `notifInApp`/`notifPush`/`notifEmail`/
  `quietHours` (S6); defaults mirror USER_PREFERENCES_DEFAULTS. All persist via the deferred seam.

## ⚠ The deferred-DB-seam constraint (seam-contract §A0 — verified in code)
The apps/web worker-RPC driver implements `query`/`run`; `values`/`batch`/`exec` throw `SEAM` (db/client.ts:154).
Drizzle `.all()`→`driver.values()` (adapter.ts:189), and `repo.findAll` uses `.all()` → **every live preferences DB op
is blocked today** (updatePreferences does a findAll first). This is the "live Drizzle-proxy bootstrap → first-consumer"
home fe-notes also deferred (useNotesRows is stubbed). **Consequence:** theme/prefs apply **live in-session** (store →
UIProvider / useHomeArrangement) but do **not survive reload** in M1. Hydrate-on-boot + persistence activate (drop-in)
when the worker `values` seam lands — the store `hydrate()` + the use-preferences `persist` are the activation points.

## ECs covered — S1–S6 (surface COMPLETE)
S1 `Switch` primitive (EC-3) · S2 theme store (EC-5 mechanism) · S3 shell+route+Appearance (EC-1,2,5-live,7,8,10) +
gate-1 #1 (activated `useHomeArrangement`) · S4 search (EC-6) · S5 Modules show/hide+rename+Surfaces (EC-4 rem · EC-8
escape hatch · EC-12 rename) · S6 Locale/Notifications (EC-4) + delegated Data/Account placeholders (EC-9). All 6
categories built. EC-11 (editorial voice/feel) = verified per-slice at each live Visual Gate.

## Rules
- Theme/pref changes go through the STORES (live apply); never hardcode a palette or call the throwing live DB path in M1.
- `dashboard_layout` writes (when the seam activates) are read-merge-write (seam-contract §B) — never clobber sibling sub-keys.
- The escape hatch (S5): module-visibility can never hide Settings itself (business-rules.md:27 — UI-enforced, not service).
