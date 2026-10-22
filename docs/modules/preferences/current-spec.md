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
- **② frontend** — shipped as **fe-settings** (LIF-193; renamed from `fe-preferences` LIF-134, decisions.md:302) +
  **fe-onboarding** guided setup (LIF-216), both **in-session only**. The live close is **preferences-rescope**
  (LIF-247, M1.2.4). See "② Surface plane — as-built baseline" below.

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

## ② Surface plane — as-built baseline (preferences-rescope Step 0, 2026-10-21, worktree @ `c025710`)
Cross-plane baseline for the entity re-scope. Service plane above is **current** (no service commit since `3e82608`).
The surface plane's own as-built record is `apps/web/src/{settings,onboarding}/CLAUDE.md`; this section pins the
**wiring facts** the re-scope reconciles against.

- **Data plane is live.** The worker driver implements `exec`/`values`/`batch` (data-plane-wiring, 2026-10-20)
  `[FACT: apps/web/src/db/client.ts:12-15,157-167]`, so Drizzle `.all()` / `repo.findAll` run live. Every
  "blocked by the `values` seam (client.ts:154)" comment is now **stale**: `stores/preferences-store.ts:7-10` ·
  `stores/theme-store.ts:9-13` · `settings/use-preferences.ts:6-7` · `home/home-surface.tsx:24` · `App.tsx:33-34`.
- **Not registered.** `Services = { notes; journals }`; `createPreferencesService` is imported nowhere in apps/web
  `[FACT: apps/web/src/db/composition-root.ts:34-37,69-77]`. The service IS on the `@vida/core` barrel
  `[FACT: packages/core/src/index.ts:169]`.
- **Settings read/write seam is a stub.** `usePreferences()` returns the two Zustand stores + a hard-coded
  `state:'success'`; `useUpdatePreferences()` returns store setters, `persist` a commented no-op, and has **no callers**
  (panes bind the stores directly) `[FACT: settings/use-preferences.ts:19-43]`. `SettingsSurface` has **no loading
  branch** and the error branch replaces the pane `[FACT: settings/settings-surface.tsx:65,117-133]`.
- **Stores.** `theme-store` `{selection: THEME_DEFAULT}` feeds `<UIProvider selection>` `[FACT: App.tsx:35-40,102]`;
  `preferences-store` holds reduceMotion · arrangement · moduleVisibility · moduleNames · dateFormat · timeFormat ·
  weekStartsOn · notifInApp/Push/Email · quietHours `[FACT: stores/preferences-store.ts:68-80]`. Both expose a
  `hydrate()` with **no caller**.
- **Control → storage** (fe-settings seam-contract §B, `seam-contract.md:46-58`; no schema change, decisions.md:12):
  preset → `dashboard_layout.theme` · mode → `theme` · density → `compact_mode` · reduce-motion →
  `nav_preferences.reduce_motion` · arrangement → `dashboard_layout.arrangement` · show/hide + Atlas/Sync →
  `module_visibility` · rename → `dashboard_layout.moduleNames` · locale + channels → their columns. `updatePreferences`
  replaces whole JSON columns → `dashboard_layout` writes must be read-merge-write (§B HARD INVARIANT `:60-68`).
- **Readers.** `moduleVisibility`/`moduleNames`/`reduceMotion`/`dateFormat`/`timeFormat`/`weekStartsOn` have **0
  readers** outside settings/ + the stores; `useHomeArrangement` reads `arrangement` live in-session
  `[FACT: home/home-surface.tsx:25-27,74-76]`; `ModuleDock` is mounted nowhere (test-only import); `isFeatureEnabled`
  always `false` `[FACT: shell/feature-flags.ts:10-12]`; `stubShellPrefs` resolves `DEFAULT_PLACEMENT`
  `[FACT: shell/shell-prefs.ts:15-16]`; `usePersona()` = `?persona` dev override or `'neutral'`
  `[FACT: gamification/use-persona.ts:33-36]`.
- **Gaps in the controls.** No `game` preset in the Settings preset Select (`appearance-pane.tsx:16-20` vs
  `packages/ui/src/theme-resolution.ts:30`); no persona control; Mode offers Light/Dark only while `theme` allows
  `system` (default) `[FACT: appearance-pane.tsx:13-14; packages/types/src/entities/user.ts:186]`.
- **Onboarding.** `useModuleSelection().commit` and `useThemeSelection().commit` are `Promise.resolve()`
  `[FACT: onboarding/use-module-selection.ts:36; use-theme-selection.ts:39]`; `GuidedSetupSlotButton` has **0
  consumers** `[FACT: onboarding/guided-setup-entry.tsx:53-59]`. The Onboarding + GuidedSetup overlays render
  **outside** `QueryClientProvider` `[FACT: App.tsx:103-125]`.
- **Pinned ECs carried:** fe-settings EC-1…12 (census ✅8 · ❌EC-4, EC-7 · ⏳EC-11, EC-12) · fe-onboarding EC-1…10
  (✅8 · ❌EC-1 · ⏳EC-10) · inherited: fe-home EC-2/EC-9 (arrangement) · fe-gamification EC-1 (`game` preset),
  EC-10 (persona → copy) `[FACT: census/b-system-features.md:59-76,153-166; a-notes-home.md:158,165]`.

## Not owned (delegated / cited)
Account/auth/PII (PR-8/PR-10 — PII stays in `user_profile`) · data import/export (PR-8) · ADR-014 integration
credentials (PR-12) · `ai_connections`/ADR-015 · `sms` channel (PR-11, never). No schema work in this issue.
