# PLAN — mod-preferences Slice 1 · user_preferences service (§XXVI gate-1)

> Unit: mod-preferences #37 (LIF-133) · Slice 1 of 3 (slice-map.md). Add Backend Component / Default · Entity
> Delivery Flow. Forward spec for the §XXVI double-gate. Every claim `[FACT: path:line]` / `[INTERP]` (No-Guessing).

## §1. Executive summary (the direction being approved)

Build the `user_preferences` half of `@vida/core/services/preferences` over the finished DB-4 #2 schema. Three edits,
no schema work:

1. **`@vida/types/entities/user.ts`** — extend the `UserPreferences` interface (parsed app shape) with the 10 columns
   the schema has but the interface lacks (N-1). `[FACT: entities/user.ts:195-221 vs schema/preferences.ts:47-88]`
2. **`@vida/core/src/validators/user.ts`** — add the Zod object schema(s) for the update patch (the file today holds
   only enum schemas). `[FACT: validators/user.ts:16-26]`
3. **`@vida/core/src/services/preferences/service.ts`** — `createPreferencesService` factory with the Slice-1 ops +
   `USER_PREFERENCES_DEFAULTS` + the JSON parse/stringify boundary.
4. **`@vida/core/src/services/preferences/types.ts`** — the service's error classes (`InvalidModuleError extends
Error`, `this.name` set) + any local types; mirrors `sessions/types.ts:98-101` pattern. `[FACT: sessions/types.ts:98-101]`
5. **`@vida/core/src/services/preferences/index.ts`** — barrel: `export * from './service'` + `export * from './types'`
   (mirrors `sessions/index.ts`). `[FACT: sessions/index.ts]`

This slice is **ratify-heavy**: the schema + the 5-aspect docs fix the shape; the only genuinely-authored logic is the
merge layer, the JSON boundary, and the module-visibility helpers.

## §2. Business rules this slice enforces (inherited — not invented)

- **PR-1 / IR-c** — `encryptedFields: []`; no field `[E]`. E9 fields (`persona`/`motivation_style`/`active_modules`/
  `onboarding_completed`) are plaintext config; never PII / `focus_areas`. `[FACT: business-rules.md:9,18; preferences.ts:9]`
- **PR-2 / N-2** — `getMergedPreferences` overlays the row on `USER_PREFERENCES_DEFAULTS`; **never `undefined`**;
  first-run (no row) returns full defaults **without persisting**. `[FACT: business-rules.md:10; contract.md:12-14; sessions/service.ts:224]`
- **PR-3 / BR-P4 / N-3** — singleton is app-enforced (`findAll()[0]`); no DDL uniqueness; **create only on first write**.
  `[FACT: db-4-preferences/_index.md:66-69]`
- **PR-4 (backend half)** — the service `throw`s a typed error on persistence failure; the debounce/optimistic-revert
  is the ② layer's, not here. `[FACT: business-rules.md:12; slice-map.md frontend]`
- **PR-7** — module visibility (`module_visibility` JSON map) is distinct from `feature_gamification` (a bool column)
  and `active_modules` (E9); the service keeps them separate. `[FACT: business-rules.md:15; conventions.md:31; preferences.ts:30-34]`
- **PR-9 / BR-P6** — writes succeed locally; config syncs LWW via the repo's co-transactional `sync_queue`. `[FACT: repository.ts:267-293]`
- **IR-a** — `initVault()` precedes writes (sync-hash path runs with empty `[E]`). `[FACT: repository.ts:339-340]`
- **IR-e** — malformed JSON in `dashboard_layout`/`module_visibility`/`active_modules` degrades to its default, never
  crashes. `[FACT: business-rules.md:26]`

## §3. What changes — detail

### 3.0 The merged-read return type (`MergedPreferences`) — resolves gate-1 B1

`getMergedPreferences` returns a **config-view type, not the `SyncableEntity` row.** `UserPreferences extends
SyncableEntity` requires `id`/`created_at`/`_sync_*` `[FACT: entities/user.ts:195]`, which the defaults-fallback path
(no row) cannot supply — returning the full row type would force an `as` cast (STANDARDS §XV violation). The live
precedent is `sessions/service.ts:220-231`, which returns a config-only subset (`FocusConfig`), not the row, for
exactly this reason `[FACT: sessions/service.ts:220-231]`. Define, in `@vida/types/entities/user.ts`:
`export type MergedPreferences = Omit<UserPreferences, keyof SyncableEntity>` (the settings fields only).
`getMergedPreferences(): Promise<MergedPreferences>`; `USER_PREFERENCES_DEFAULTS: MergedPreferences`. `updatePreferences`
returns `MergedPreferences` too (identity/sync are the repo's concern, not the config consumer's). `[FACT: contract.md:12-14]`

### 3.1 `UserPreferences` interface extension (parsed app shape)

The interface mirrors the _parsed_ shape, matching the existing convention (`dashboard_layout: Record<string,unknown>|null`,
`mobile_nav_items: string[]|null`) `[FACT: entities/user.ts:203,228]`. Add, mirroring `schema/preferences.ts`:
`compact_mode: boolean` · `font_size: string | null` · `number_format: string | null` ·
`default_dashboard_view: string | null` · `module_visibility: Record<string, boolean> | null` ·
`show_archived: boolean` · `notification_frequency: string | null` · `persona: Persona | null` ·
`motivation_style: string | null` · `active_modules: string[] | null` · `onboarding_completed: boolean`.
Types are the schema's (bool → `boolean`, TEXT → `string|null`, JSON map → `Record<string,boolean>|null`, JSON array
→ `string[]|null`, `persona` → the FIXED `Persona`). `[FACT: schema/preferences.ts:47-88; DB-4 §3c types _index.md:129-141]`

### 3.2 `USER_PREFERENCES_DEFAULTS`

Mirror the schema `.default(...)` values exactly (conventions.md:6, structure-data.md:44 single-source):
`theme:'system'` · `accent_color:'#6366f1'` · `compact_mode:false` · `font_size:null` · `date_format:'YYYY-MM-DD'` ·
`time_format:'24h'` · `week_starts_on:1` · `currency:'USD'` · `number_format:null` · `dashboard_layout:null` ·
`default_dashboard_view:null` · `module_visibility:null` · `show_completed_tasks:true` ·
`default_task_priority:'medium'` · `show_archived:false` · pomodoro `25/5/15/4` · notif `email/push/in_app:true` ·
`quiet_hours_enabled:false` · `quiet_hours_start/end:null` · `notification_frequency:null` · push\_\* `:true` ×5 ·
`feature_gamification:true` · `persona:null` · `motivation_style:null` · `active_modules:null` ·
`onboarding_completed:false`. `[FACT: schema/preferences.ts:45-88]`

### 3.3 Service ops (factory-object; no `this.`, IR-8)

- `getMergedPreferences(): Promise<MergedPreferences>` — `const row = (await repo.findAll())[0]`; if no row return
  `{ ...USER_PREFERENCES_DEFAULTS }`; else `toMerged(row)`. No persist.
  **Merge rule (m1, refined at impl per §XXVIII):** `toMerged` maps the row's **config columns** explicitly (drops
  id/timestamps/_sync). Because the Drizzle `$inferSelect` types every DB-nullable-with-default column as `| null`
  (`.default()` does NOT imply `notNull` — `_shared.ts:20`, e.g. `accent_color`/`currency`/`week_starts_on`/
  `date_format`/`default_task_priority`) while the merged-view type (interface) is non-null, a plain spread widens the
  return type and fails `: MergedPreferences`. So each **non-null-typed** field coalesces `row.x ?? DEFAULTS.x` (the
  `??` only ever fires on a `null` the merged view forbids — the row always carries DEFAULTS values, so `row` still
  wins for every real value incl. `theme:'dark'`; this does NOT contradict m1's intent, it enforces the merged-view
  contract). **Genuinely-nullable** fields (`font_size`, `module_visibility`, `active_modules`, `quiet_hours_\*`,
`persona`, …) pass through as-is. The 3 JSON columns parse via `parseJson(v, DEFAULTS.x)`with try/catch → default on
malformed (IR-e).`[FACT: _shared.ts:19-21; entities/user.ts UserPreferences non-null scalar fields]`
- `updatePreferences(patch): Promise<MergedPreferences>` — validate patch (Zod); `serialize` the 3 JSON keys to TEXT;
  `const row = (await repo.findAll())[0]`; if absent `repo.create({ ...serialize(DEFAULTS), ...serialize(patch) })`
  else `repo.update(row.id, serialize(patch))`; return the merged config view (`getMergedPreferences` shape).
- `getModuleVisibility(): Promise<Record<string,boolean>>` — parse `module_visibility` → `{}` if null/malformed.
- `setModuleVisibility(key, visible): Promise<void>` — **structure-validate** `key` (non-empty string) → else
  `throw new InvalidModuleError(key)`; read map, set `key`, `updatePreferences({ module_visibility: map })`. Membership
  validation deferred (no registry on disk, D3). `[FACT: no MODULE tuple in @vida/types; contract.md:43]`

### 3.4 Repo wiring

`createRepository(db, userPreferences, { deviceId, encryptedFields: [], softDelete: false })`. `[FACT: repository.ts:236; preferences.ts (no deleted_at)]`

## §4. Acceptance criteria (the Verification Gate)

Live-store Vitest (better-sqlite3 + `migrate` + `initVault`, mirroring `sessions-service.test.ts:1-20`):

1. `getMergedPreferences` on an empty store → deep-equals `USER_PREFERENCES_DEFAULTS` (a `MergedPreferences`, no id/sync keys), **no row created** (`repo.findAll()` still empty). (PR-2/N-3/B1)
2. `updatePreferences({ theme:'dark' })` → persists; `getMergedPreferences().theme==='dark'`, other fields still default. (PR-2)
3. Second `updatePreferences` → **updates the same row** (`findAll().length===1`), `_sync_version` incremented. (PR-3/BR-P4)
4. E9 round-trip: `updatePreferences({ persona:'student', active_modules:['tasks'] })` → parsed back correctly. (PR-1/PR-10)
5. JSON boundary: `module_visibility` set via `setModuleVisibility('habits', false)` → `getModuleVisibility()` returns `{habits:false}`. (PR-7)
6. `setModuleVisibility('', true)` → throws `InvalidModuleError`. (D3)
7. Malformed JSON in a stored row → read degrades to default, no throw. (IR-e)
8. `sync_queue` gets a row per write (co-transactional enqueue). (PR-9)
9. Invalid patch (e.g. `theme:'neon'`) → Zod rejects with a typed error. (BR-P2)

- `pnpm --filter @vida/core typecheck` 0 errors · `pnpm --filter @vida/core test` green · lint 0.

## §5. Out of scope (this slice)

nav_preferences (Slice 2) · command_bar_history (Slice 3) · debounce/optimistic/themeStore/search UI (② fe-preferences) ·
sessions inline-read migration (deferred hygiene) · account/data/integration/AI (other domains).

## §6. Ratify vs Decide

RATIFY: all shape, enums, plaintext, no-FK, no-soft-delete, singleton-app-enforced, read-or-default, JSON-as-TEXT.
DECIDE → grounded mirrors (§ service-spec ledger): D1 interface = schema mirror · D2 DEFAULTS = schema `.default()`
mirror · D3 module-key = structure-validate (no registry to check membership against). None genuinely open.
