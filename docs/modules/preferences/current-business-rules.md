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

## ② surface — what is NOT enforced live yet (baseline 2026-10-21, preferences-rescope Step 0)
The service rules above hold **only at the service boundary**; the shipped ② surface never calls it (service not
registered, `current-spec.md` "② Surface plane"). So live today: PR-2 (defaults) is met by store defaults, not
`getMergedPreferences`; **PR-4 (persist + revert-on-error), PR-5 (theme from the DB value), PR-9 (local write +
sync_queue) are unmet in the app**; the escape hatch (business-rules.md:28) is UI-enforced in `HIDEABLE_MODULES`
(`settings/settings-model.ts:37-46`). preferences-rescope (LIF-247) closes these.

## Delegated (never enforced here — other domains own them)
PR-8 (account/data), PR-10 (PII stays in `user_profile`), PR-11 (`sms` never a channel), PR-12 (integration
`connection_config` is mediator-held `[E]`), N7 quiet-hours reschedule (Notifications' runtime; Preferences is the
config source only).
