# PLAN — mod-preferences Slice 2 · nav_preferences service (§XXVI gate-1)

> Unit: mod-preferences #37 (LIF-133) · Slice 2 of 3. A near-clone of Slice 1's singleton pattern, smaller. Every
> claim `[FACT: path:line]`. Reuses the Slice-1 conventions (read-or-DEFAULT, MergedX view type, `??` merge, JSON
> boundary) — grounded, already vetted.

## §1. Executive summary

Add the `nav_preferences` half to `@vida/core/services/preferences`. No schema work; the schema (`nav_preferences`,
`schema/preferences.ts:92-101`) + interface are DONE. Two edits + one service extension:

1. **`@vida/types/entities/user.ts`** — add `MergedNavPreferences = Omit<NavPreferences, keyof SyncableEntity>`.
   The `NavPreferences` interface itself is **already complete** (7 cols = schema exactly; entities/user.ts:224-232
   vs schema/preferences.ts:92-101) — **no extension needed** (grounding: unlike Slice-1's stale interface). `[FACT]`
2. **`@vida/core/src/validators/user.ts`** — add `NavPreferencesFields` (z.object) + `UpdateNavPreferencesSchema =
.partial()`; FIXED enums reuse `DockPositionSchema`/`DockSizeSchema` (already defined, validators/user.ts:25-26).
3. **`services/preferences/service.ts`** — add `NAV_PREFERENCES_DEFAULTS`, a `navRepo`, and
   `getNavPreferences`/`updateNavPreferences` to the existing factory (same read-or-DEFAULT + create-on-write shape).

## §2. Business rules enforced (same family as Slice 1)

- **PR-1** — `encryptedFields: []` (plaintext). **PR-2** — read-or-DEFAULT, never `undefined`. **PR-3/BR-P4** —
  singleton, create-on-write. **BR-P2** — Zod-validated (`dock_position`/`dock_size` FIXED). **PR-9** — co-tx
  `sync_queue`. **IR-a** — vault. **IR-e** — malformed `mobile_nav_items` JSON → default.
  `[FACT: business-rules.md PR-1/2/3/9; db-4-preferences/_index.md BR-P2]`

## §3. What changes

### 3.1 `MergedNavPreferences` (@vida/types)

`export type MergedNavPreferences = Omit<NavPreferences, keyof SyncableEntity>` — the config view (B1 pattern).

### 3.2 `NAV_PREFERENCES_DEFAULTS` — mirror schema `.default(...)` (schema/preferences.ts:94-100)

`dock_position:'bottom'` · `dock_auto_hide:false` · `dock_size:'medium'` · `mobile_nav_items:null` ·
`show_labels:true` · `haptic_feedback:true` · `reduce_motion:false`. `[FACT: schema/preferences.ts:94-100]`

### 3.3 Service ops (added to the same factory)

- `getNavPreferences(): Promise<MergedNavPreferences>` — `(await navRepo.findAll())[0]` overlaid on defaults; no persist.
- `updateNavPreferences(patch): Promise<MergedNavPreferences>` — Zod-validate; create-if-absent-or-update; return merged.
- Reuse `parseJson` for `mobile_nav_items` (JSON array → `string[]|null`); reuse the `?? DEFAULTS.x` merge rule
  (falsy-safe). A small `toMergedNav(row)` + `serializeNav(patch)` mirror the Slice-1 helpers.
- `navRepo = createRepository(db, navPreferences, { deviceId, encryptedFields: [], softDelete: false })`.

## §4. Acceptance (Verification Gate — extend the same test file)

1. `getNavPreferences` empty store → deep-equals `NAV_PREFERENCES_DEFAULTS`, no row created. (PR-2/N-3)
2. `updateNavPreferences({ dock_position:'left' })` → persists; merged reflects it, other fields default. (PR-2)
3. Second write → same row, `_sync_version` bumped. (PR-3/BR-P4)
4. `mobile_nav_items` round-trip: `updateNavPreferences({ mobile_nav_items:['home','tasks'] })` → parsed back. (IR-e boundary)
5. `dock_size:'huge'` (out-of-enum) → Zod rejects, typed throw. (BR-P2)
6. `reduce_motion:false` / `dock_auto_hide:false` survive the merge (falsy-preservation `??`).
7. `sync_queue` row per write with `table_name==='nav_preferences'`. (PR-9)

- typecheck 0 · @vida/core test green · eslint 0.

## §5. Out of scope

user_preferences (Slice 1 ✓) · command_bar_history (Slice 3) · ② frontend nav UI (fe-preferences).

## §6. Ratify vs Decide

RATIFY: entire nav shape/enums/defaults (schema + complete interface). DECIDE: none — `MergedNavPreferences` +
DEFAULTS are mechanical mirrors; the pattern is Slice-1-established. No open decision.
