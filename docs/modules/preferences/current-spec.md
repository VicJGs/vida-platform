<!-- CURRENT-SPEC — module: preferences · born D6 (§XXIX Currency Rule) at mod-preferences #37 Slice 1.
     Ground truth for /critique + /preflight + §XXVII. Reflects SHIPPED code; unbuilt slices flagged. -->

# Preferences — Current Spec (as-built)

**Context:** `@vida/core/services/preferences` — the platform's config provider (Wave-0 foundational, out-degree ≈ 0)
over the finished DB-4 #2 schema (`user_preferences`, `nav_preferences`, `command_bar_history`;
`schema/preferences.ts` · migration 013). Issue: mod-preferences #37 (LIF-133), M1.1.1 Backend.

## Build status (per slice)
- **Slice 1 · `user_preferences` — SHIPPED** (this session). Service + types + validator + tests.
- **Slice 2 · `nav_preferences` — SHIPPED** (this session). `getNavPreferences`/`updateNavPreferences` +
  `MergedNavPreferences` + `NavPreferencesFields`/`UpdateNavPreferencesSchema` + `NAV_PREFERENCES_DEFAULTS`.
- **Slice 3 · `command_bar_history` — SHIPPED** (this session). `recordCommand` (upsert-by-key) /
  `pinCommand` / `getCommandHistory` (pinned-then-frecency) + `RecordCommandSchema`. **① backend complete.**
- **② frontend** (Settings/Cmd+K UI, debounce, themeStore, settings search) — `fe-preferences` (LIF-134).

## Exposed surface (SHIPPED — Slice 1)
`createPreferencesService(opts: { db: DrizzleDb; deviceId: string }): PreferencesService` — factory-object, single
options arg (house convention). Rides the DB-6 Repository (`encryptedFields: []`, `softDelete: false`).

- `getMergedPreferences(): Promise<MergedPreferences>` — read-or-DEFAULT (`findAll()[0]` overlaid on
  `USER_PREFERENCES_DEFAULTS`); **never persists, never `undefined`** (PR-2).
- `updatePreferences(patch: Partial<MergedPreferences>): Promise<MergedPreferences>` — Zod-validated
  (`UpdatePreferencesSchema`); creates the singleton on first write, updates it after; returns the merged view.
- `getModuleVisibility(): Promise<Record<string, boolean>>` — parsed `module_visibility`, `{}` if unset/malformed.
- `setModuleVisibility(moduleKey, visible): Promise<void>` — structure-validates the key → `InvalidModuleError`;
  membership deferred to the ② consumer (no module registry exists, D3).
- `getNavPreferences(): Promise<MergedNavPreferences>` — read-or-DEFAULT nav config (Slice 2).
- `updateNavPreferences(patch): Promise<MergedNavPreferences>` — Zod-validated create-if-absent-or-update (Slice 2).
- `recordCommand(command_key, command_label, command_category?): Promise<void>` — upsert-by-key (PR-6/BR-P3) (Slice 3).
- `pinCommand(command_key, pinned): Promise<void>` — set pin; no-op on unrecorded key (D-S3) (Slice 3).
- `getCommandHistory(): Promise<CommandBarHistoryRow[]>` — pinned-then-frecency; returns the Drizzle Row (house
  convention for raw list readers; `_sync_status` union boundary → DB-11 interface reconcile) (Slice 3).

## Types
- `@vida/types/entities/user.ts` — `UserPreferences` (extended to the full schema shape: +G4 ×6, `module_visibility`,
  E9 ×4) + `MergedPreferences = Omit<UserPreferences, keyof SyncableEntity>` (the config view).
- `@vida/core/src/validators/user.ts` — `UserPreferencesFields` (z.object) + `UpdatePreferencesSchema` (`.partial()`).
- `USER_PREFERENCES_DEFAULTS: MergedPreferences` (service export) — mirrors every schema `.default(...)` (PR-2 base).

## Internal shape
- `toMerged(row)` — row → config view; `?? DEFAULTS.x` for non-null-typed fields (preserves falsy-valid 0/false),
  JSON columns (`dashboard_layout`/`module_visibility`/`active_modules`) parsed with default fallback (IR-e).
- `serialize(patch)` — config patch → repo write shape; JSON columns `JSON.stringify`d to TEXT.
- `parseJson(v, fallback)` — try/catch parse; malformed → fallback (never throws).

## Consumers
- `sessions/service.ts:213-228` reads `pomodoro_*` from the raw table today (IR-3 seam); `getMergedPreferences`
  supersedes it — migration is a deferred hygiene follow-up.

## Tests
`services/preferences/__tests__/preferences-service.test.ts` — 10 live-store tests (better-sqlite3 + migrate +
`initVault`), covering AC1–9 + the metadata-strip assertion.

## Not owned (delegated / cited)
Account/auth/PII (PR-8/PR-10 — PII stays in `user_profile`) · data import/export (PR-8) · ADR-014 integration
credentials (PR-12) · `ai_connections`/ADR-015 · `sms` channel (PR-11, never). No schema work in this issue.
