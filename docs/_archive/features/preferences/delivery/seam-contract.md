<!-- Seam Contract — features/preferences · Entity Delivery Flow Step 2
     The service API the UI (fe-preferences) + other modules consume. Signatures are the INTENDED public surface of
     @vida/core/services/preferences; grounded in contract.md + the finished schema. -->

# Seam Contract — `@vida/core/services/preferences`

`createPreferencesService(opts: { db: DrizzleDb; deviceId: string }): PreferencesService`
Single options object — matches the `createSessionsService({ db, deviceId, … })` house convention. Factory-object;
intra-calls via hoisted closures, never `this.` (memory factory-service-no-this).

## The consumed surface

```ts
interface PreferencesService {
  // --- user_preferences (Slice 1) ---
  // MergedPreferences = Omit<UserPreferences, keyof SyncableEntity> — config view, no id/sync (B1; sessions FocusConfig precedent)
  getMergedPreferences(): Promise<MergedPreferences> // read-or-DEFAULT (no persist); never undefined (PR-2)
  updatePreferences(patch: Partial<MergedPreferences>): Promise<MergedPreferences> // create-if-absent-or-update
  getModuleVisibility(): Promise<Record<string, boolean>> // parsed module_visibility JSON, {} if unset (PR-7)
  setModuleVisibility(moduleKey: string, visible: boolean): Promise<void> // InvalidModuleError on invalid key (D3)

  // --- nav_preferences (Slice 2) ---
  getNavPreferences(): Promise<NavPreferences> // read-or-DEFAULT (no persist)
  updateNavPreferences(patch: Partial<NavPreferences>): Promise<NavPreferences> // create-if-absent-or-update

  // --- command_bar_history (Slice 3) ---
  recordCommand(command_key: string, command_label: string, command_category?: string | null): Promise<void> // upsert (PR-6)
  pinCommand(command_key: string, pinned: boolean): Promise<void> // no-op on unrecorded key (D-S3)
  getCommandHistory(): Promise<CommandBarHistoryRow[]> // pinned-first, then frecency; Drizzle Row (see note)
}
```

## Typed errors (fail loud — constitution §5)

- `InvalidModuleError` — `setModuleVisibility` with an unknown module key (ignored + flagged, PR-7 / contract.md:43).
- Persistence failure surfaces as a typed error the ② layer reverts the optimistic value on (PR-4). The backend
  throws; the debounce/revert lives in fe-preferences.

## Types (two-package split — conventions.md:18)

Interfaces + string-union enums in `@vida/types/entities/user.ts` (`UserPreferences`/`NavPreferences`/
`CommandBarHistory` + `THEME`/`TIME_FORMAT`/`DOCK_POSITION`/`DOCK_SIZE`/`PERSONA`); canonical Zod in
`@vida/core/src/validators/user.ts` (enum schemas exist; object schemas added in Slice 1). `UserPreferences` is
extended in Slice 1a to match the schema (N-1). `DEFAULTS` objects are exported from the service (the merge base, PR-2).

## Consumers (it is the provider — read-mostly)

- **`sessions/service.ts`** — reads `pomodoro_*` (today inline; the seam `getMergedPreferences()` supersedes that read,
  migration deferred) `[FACT: sessions/service.ts:213-228]`.
- **All UI / nav / tasks / dashboard / gamification / notifications** — read via `getMergedPreferences` /
  `getNavPreferences` / `getModuleVisibility` / `feature_gamification` `[FACT: contract.md:34-39]`.
- **Notifications dispatcher** — reads the channel matrix (`in_app`/`push`/`email`, no `sms`) + `quiet_hours_*`
  (reschedule-on-change is its own; Preferences is cite-not-own, N7) `[FACT: contract.md:38; business-rules.md:25]`.

## Boundary (what the seam NEVER exposes)

No account/auth/PII (`display_name`/`avatar_url`/`birth_date` stay in `user_profile`), no `focus_areas[E]`, no
`connection_config` (mediator-held `[E]`), no `sms` channel. `[PR-8/PR-10/PR-11/PR-12]`
