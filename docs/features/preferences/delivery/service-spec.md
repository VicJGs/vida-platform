<!-- Service Spec Set — features/preferences · Entity Delivery Flow Step 2 §4 (operations · operation-flow · invariants · composition)
     The ① service tier. Ratify-mode where the schema/docs fixed it; Decide-mode on the genuinely-open shape (marked). -->

# Service Spec — `@vida/core/services/preferences`

## Composition (what it rides, does not re-implement)

- **Repository** (`db/repository.ts`) — one `createRepository` per table, `encryptedFields: []`, `softDelete: false`.
  All persistence (row build, sync-meta, co-transactional `sync_queue`) is the repo's. `[FACT: repository.ts:236-497]`
- **Types + validators** in `@vida/types` (entities/user.ts + validators/user.ts) — extended, not forked.
- **No foundation substrate** beyond the Repository (Preferences is Wave-0, out-degree ≈ 0 — it is itself a substrate).

## Operations & flow

### Slice 1 — user_preferences

- **`getMergedPreferences()`** — **read-or-DEFAULT, does NOT persist.** `{ ...USER_PREFERENCES_DEFAULTS,
...(findAll()[0] ?? {}) }` (row wins), returning a complete `UserPreferences`, never `undefined` (PR-2). No
  create-on-read — grounded in `sessions/service.ts:224` (reads `findAll()[0]`, falls back to hard defaults) +
  `contract.md:12-18` (only `updatePreferences` persists). JSON columns parse-with-fallback (IR-e).
- **`updatePreferences(patch)`** — resolve the singleton (`findAll()[0]`); if absent, `repo.create({
...USER_PREFERENCES_DEFAULTS, ...patch })`; else `repo.update(id, patch)` → return the merged row. This is the
  **only** create path for the row. E9 fields (`persona`/`motivation_style`/`active_modules`/`onboarding_completed`)
  are ordinary patch keys.
- **`getModuleVisibility()` / `setModuleVisibility(key, visible)`** — parse `module_visibility` JSON → `{}` on
  absent/malformed (IR-e); set mutates the map and patches back via `updatePreferences`.
  **D3 grounded:** there is **no module registry in `@vida/types`** (`grep` confirms no `MODULE_KEY`/`MODULES` tuple;
  `active_modules`/`module_visibility` are open JSON) → membership cannot be validated against a canon that doesn't
  exist (No-Guessing: do not invent one). So `setModuleVisibility` validates **structure** (non-empty string key),
  throwing `InvalidModuleError` on a structurally-invalid key; **membership validation is deferred to the ② consumer
  that owns the module list** (the Settings screen, fe-preferences). `[FACT: no module tuple in @vida/types;
contract.md:43 InvalidModuleError; business-rules.md:36 "invalid key ignored + flagged"]`

### Slice 2 — nav_preferences

- **`getNavPreferences()` / `updateNavPreferences(patch)`** — identical read-or-DEFAULT (read) + create-or-update
  (write) shape as Slice 1, over `NAV_PREFERENCES_DEFAULTS`.

### Slice 3 — command_bar_history

- **`recordCommand(key, label, category?)`** — `repo.findWhere(eq(command_key, key))`; if found →
  `repo.update(id, { use_count: +1, last_used_at: now })`; else `repo.create({ command_key, command_label,
command_category, use_count: 1, last_used_at: now, is_pinned: false })`. Idempotent-by-key (PR-6, UNIQUE BR-P3).
- **`pinCommand(key, pinned)`** — lookup by key → `repo.update(id, { is_pinned: pinned })`.
- **`getCommandHistory()`** — `repo.findAll()` then in-service sort: `is_pinned` desc, then `use_count` desc, then
  `last_used_at` desc (frecency, N-5/PR-6). No `deleted_at` on this table → `findAll` returns all.

## Invariants (enforced by the service, checked at the Verification Gate)

- **PR-1 / IR-c** — `encryptedFields: []`; no field ever `[E]`; E9 receives config only, never PII / `focus_areas`.
- **PR-2 / N-2** — every read merges DEFAULTS; first-run returns full defaults, not null.
- **BR-P4 / PR-3 / N-3 / IR-b** — singletons app-enforced one-row-per-vault; **reads never persist** (read-or-default),
  create only on first write → no first-read race. Always read `findAll()[0]`. No DDL uniqueness.
- **PR-6 / BR-P3 / N-4** — `command_key` upsert; never duplicate.
- **IR-a** — `initVault()` before any write (sync-hash path runs even with empty `[E]`).
- **IR-e** — malformed JSON config degrades to default, never crashes.
- **IR-d / IR-f** — delegates account/data/integration; no `sms`; N7 quiet-hours reschedule is Notifications', not here.

## Out of scope (this unit)

Debounce/optimistic (PR-4) · Zustand theme store (PR-5) · settings search index (G7) · Settings/Cmd+K UI → all ②
(fe-preferences). Account/data/integration/AI surfaces → other domains (cited, not built). `sessions` inline-read
migration → deferred hygiene follow-up.

## Ratify vs Decide ledger

- **RATIFY (doc/schema-fixed):** all 3 table shapes, all columns incl. G4/E9/PB-2 (schema DONE), FIXED enums,
  plaintext boundary, no-FK, no-soft-delete, singleton-is-app-enforced, upsert-by-key, pinned-then-frecency order.
- **DECIDE → all three collapse to grounded mirrors once doc-checked (per "ground everything"):**
  (D1) `UserPreferences` interface + Zod extension = **mirror the schema column-for-column** (schema/preferences.ts
  - DB-4 §3c types: bool/TEXT/JSON/`PERSONA`) — mechanical, not a choice. (D2) `DEFAULTS` = **mirror the schema
    `.default(...)` values** (conventions.md:6; structure-data.md:44 single-source) — mechanical. (D3) `setModuleVisibility`
    = **structure-validate only** (no module registry exists → No-Guessing forbids inventing one; membership deferred to
    the ② owner). None is a genuine open decision; each is doc/schema-determined.
