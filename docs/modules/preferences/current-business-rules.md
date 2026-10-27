<!-- CURRENT-BUSINESS-RULES — module: preferences · born D6 (§XXIX) at mod-preferences #37 Slice 1.
     Inherits the feature invariants PR-1..PR-12 (docs/features/preferences/business-rules.md). Lists what the
     SHIPPED service enforces; unbuilt-slice rules noted. Ground truth for /critique + /preflight. -->

# Preferences — Current Business Rules (as-enforced)

> Inherits `docs/features/preferences/business-rules.md` (PR-1…PR-12) + the CORE constitution (ZK/LF).

## Enforced now (Slice 1 · user_preferences)
- **BR-PREF-1 (PR-1/IR-c)** — plaintext config, never `[E]`. Repo registered with `encryptedFields: []`. E9 fields
  (`persona`/`motivation_style`/`active_modules`/`onboarding_completed`) are plaintext; PII is NOT present (stays in
  `user_profile`, PR-10). `[FACT: service.ts createRepository encryptedFields:[]; schema/preferences.ts:9]`
- **BR-PREF-2 (PR-2)** — `getMergedPreferences` never returns `undefined`: the row overlays `USER_PREFERENCES_DEFAULTS`;
  first-run with no row returns full defaults **without creating a row**. `[FACT: service.ts getMergedPreferences]`
- **BR-PREF-3 (PR-3/BR-P4)** — `user_preferences` is one-row-per-vault, app-enforced (no DDL uniqueness). The row is
  created on the **first write**; every later write updates the same row (`_sync_version` increments).
  `[FACT: service.ts updatePreferences read-or-create; repository.ts:425]`
- **BR-PREF-4 (BR-P2)** — writes are Zod-validated (`UpdatePreferencesSchema`): FIXED enums (`theme`/`time_format`/
  `persona`) reject out-of-set values; a bad patch throws a typed error before persistence.
- **BR-PREF-5 (PR-7)** — module visibility (`module_visibility` JSON map) is distinct from `feature_gamification`
  (a bool) and `active_modules` (E9). `setModuleVisibility` mutates only the map. `[FACT: service.ts setModuleVisibility]`
- **BR-PREF-6 (D3)** — `setModuleVisibility` structure-validates the key (`InvalidModuleError` on empty/non-string);
  MEMBERSHIP is not checked (no module registry exists in `@vida/types`) — deferred to the ② owner.
- **BR-PREF-7 (IR-e)** — malformed JSON in `dashboard_layout`/`module_visibility`/`active_modules` degrades to the
  default on read; never crashes. `[FACT: service.ts parseJson]`
- **BR-PREF-8 (PR-9/BR-P6)** — every write succeeds locally + enqueues a co-transactional `sync_queue` row; config
  reconciles LWW (no CRDT). `[FACT: repository.ts:267-293]`
- **BR-PREF-9 (falsy-preservation)** — merge uses `?? DEFAULTS.x` (not `||`), so `0`/`false` config values survive.
  `[FACT: service.ts toMerged]`

## Enforced now (Slice 2 · nav_preferences)
- **BR-PREF-1/2/3/4/8/9 apply identically** to `nav_preferences` via `getNavPreferences`/`updateNavPreferences`
  (plaintext · read-or-DEFAULT · create-on-write singleton · Zod `dock_position`/`dock_size` · co-tx sync_queue ·
  `??` falsy-preservation). `mobile_nav_items` is the parsed JSON array (IR-e). `[FACT: service.ts toMergedNav/updateNavPreferences]`

## Enforced now (Slice 3 · command_bar_history)
- **BR-PREF-10 (PR-6/BR-P3)** — `recordCommand` upserts by `command_key` (UNIQUE): re-record increments `use_count`
  + sets `last_used_at`, never duplicates. `getCommandHistory` orders pinned-first, then frecency (`use_count` desc,
  `last_used_at` desc, nulls last). `pinCommand` sets `is_pinned`; **no-op on an unrecorded key** (D-S3, docs silent).
  `RecordCommandSchema` fail-loud on empty `command_key`. Returns the Drizzle `CommandBarHistoryRow` (raw-reader house
  convention; the `@vida/types` interface reconcile is DB-11). `[FACT: service.ts recordCommand/pinCommand/getCommandHistory]`

## ① backend complete
All 3 slices shipped. Remaining for the module: ② frontend (fe-preferences, LIF-134) + the DB-11 `CommandBarHistory`
interface reconcile (created_at/updated_at) + the deferred `sessions` inline-read migration onto the seam.

## ② seam — enforced live (preferences-rescope R2, 2026-10-22)
- **PR-2** read never `undefined` (the view mapper over DEFAULTS) · **PR-4** auto-save debounced 500 ms + optimistic with
  revert (the writer; the visible copy lands in R3) · **PR-9** every write local + sync_queue (via the service) ·
  **BR-PREF-3** one row per vault even under concurrent first writes (serial queue) · **BR-PREF-6** ② side: visibility
  keys must be dock modules or `features`/`sync`, else `InvalidModuleError` (Settings/Home never hideable) ·
  **BR-PREF-9** falsy values survive (spread merges, `??` reads). `feature_gamification` defaults OFF (GM-1).

## ② surface — enforced live (preferences-rescope R3, 2026-10-26 · built, pending Visual Gate)
- **R3-BR-1** one read definition per table (`preferences-queries.ts`), used by `usePreferences` and the boot seed — one
  read path, one cache entry per table.
- **R3-BR-2 (B2, N6)** boot seeds both keys before the first themed paint; the seed never rejects (MUST-4) — a failed read
  boots on the defaults (PR-2). Both definitions set `retryOnMount: false`, so an errored query stays in error until the
  user presses Retry (`state-conventions.md` §3); without it every mounting reader refetches → an unbounded loop.
  Recorded limits: on a failed seed a later successful read can flip theme/arrangement to the persisted value; a failure
  *inside* the memoized composition-root `build()` is not recovered by refetch.
- **R3-BR-3 (PR-5, C3 theme)** `theme-store` is a derived cache of the user row — no theme setters; writes go through the
  writer (optimistic re-theme, follows a revert). The guided-setup preview is a layer, cleared on every exit (finish ·
  skip · close); until R7 a finish also returns to the saved theme.
- **R3-BR-4 (B6)** the theme hint is written only from DB truth (an accepted read or a successful batch, never on enqueue
  or a failed batch), read only by the inline `index.html` script; blocked/corrupt storage paints nothing.
- **R3-BR-5 (F13)** Home's arrangement is read from the seeded cache (`usePreferences().view.arrangement`); failed seed →
  `journalFirst`.
- **R3-BR-6 (D1, EC-7)** Settings: loading → skeleton; error → every pane read-only (`disabled`, rename hidden) + a
  `role="status"` line matching what is shown (defaults vs last loaded, via `hasData`) + a `Retry` (`size="lg"`, never
  disabled) that re-reads only the errored key(s), with focus placed (skeleton → pane / Retry); a Retry ends when its
  re-reads settle (a later refetch never moves focus) and each failed Retry re-announces the line; success → editable.
- **R3-BR-7 (PR-4, C5 UI)** one `SyncStatus` "Saved on this device" (no Saving state; clears on failure); **one revert
  toast per failed batch**, fired by the writer (`onFailed`) whatever surface is mounted — PR-4 "never silently dropped".
- **R3-BR-8/9 (D4, D6, D7, D10)** preset/mode/density/arrangement/persona persist through `update(viewPatch)` (per-sub-key
  merge, IR-2); persona `Not set` ↔ `null`; no `game` preset (D3).
- **R3-BR-10 (F17)** every R3 string lives in `settings/settings-copy.ts`, `lintCopy`-tested.

## ② surface — enforced live (preferences-rescope R4, 2026-10-26 · Visual Gate PASS, Victor `visual-approved` 2026-10-27)
- **R4-BR-1 (D8)** reduce motion persists through `update({ reduceMotion })` → `nav_preferences.reduce_motion`
  (optimistic, reverts + one toast on a failed batch — PR-4/R3-BR-7); the mirror no longer holds it.
- **R4-BR-2** `theme-store.reduceMotion` derives from the nav cache entry in the same subscription (boot-seeded → the
  first themed frame; failed nav read → `false`).
- **R4-BR-3…6 (D9)** `UIProvider reduceMotion` → `<html data-vida-motion="reduce"|"full">` (CSS: every gate via
  `reducedMotionCss`, the OS `@media` + the attribute twin) + `ReducedMotionContext` (JS: `useReducedMotion()` = context
  OR OS, right on the first render). The preference only adds reduction — off never forces motion.
- **R4-BR-7/8** theme swaps stay instant (the attribute survives a swap — its own effect, not `clearCodec`); the graph
  camera goes instant (1 ms durations, no inertia).

## ② surface — what is NOT enforced live yet (baseline 2026-10-21, preferences-rescope Step 0 — superseded in part by R2/R3)
The service rules above hold **only at the service boundary**; the shipped ② surface never calls it (service not
registered, `current-spec.md` "② Surface plane"). So live today: PR-2 (defaults) is met by store defaults, not
`getMergedPreferences`; **PR-4 (persist + revert-on-error), PR-5 (theme from the DB value), PR-9 (local write +
sync_queue) are unmet in the app**; the escape hatch (business-rules.md:28) is UI-enforced in `HIDEABLE_MODULES`
(`settings/settings-model.ts:37-46`). preferences-rescope (LIF-247) closes these. **Still unmet after R4:** Modules (R5), Locale/Notifications (R6) persist; the onboarding commit (R7).

## Delegated (never enforced here — other domains own them)
PR-8 (account/data), PR-10 (PII stays in `user_profile`), PR-11 (`sms` never a channel), PR-12 (integration
`connection_config` is mediator-held `[E]`), N7 quiet-hours reschedule (Notifications' runtime; Preferences is the
config source only).
