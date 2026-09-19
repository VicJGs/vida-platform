<!-- Interpretation Layer — features/preferences · Entity Delivery Flow Step 1 (add-backend-component / Default)
     Unit: mod-preferences #37 (LIF-133) · M1.1.1 Backend · the ① service tier over the finished DB-4 #2 schema.
     Purpose: make the implicit explicit before decomposing. Every claim [FACT: path:line] / [INTERP] / [INTENT]. -->

# Interpretation — Preferences service tier (①)

**What this unit builds.** The `@vida/core/services/preferences` service tier over the *already-finished* DB-4 #2
schema (`user_preferences`, `nav_preferences`, `command_bar_history` — `schema/preferences.ts`,
`migrations/013_preferences.ts`). Schema + migration are DONE and shape-locked
`[FACT: docs/specs/foundation/db-4-preferences/_index.md:219 "Group #2 DONE"]`. This is a service-only build; no
schema work. The ② frontend (Settings screen, Cmd+K UI, debounce hooks, theme store) is a separate issue
(`fe-preferences`, LIF-134) `[FACT: .claude/tasks/fe-preferences.md]`.

---

## DEPENDENCIES — what must already exist (and does)

- **The 3 tables + migration 013.** All columns present, incl. the Tier-B intent the DB-4 build authored: G4 six
  columns, PB-2 `module_visibility`, E9 split (`persona`/`motivation_style`/`active_modules`/`onboarding_completed`)
  `[FACT: db/schema/preferences.ts:42-112]`. Plaintext everywhere, zero `[E]` `[FACT: preferences.ts:9; PR-1
  business-rules.md:9]`.
- **The generic Repository** — `createRepository(db, table, {encryptedFields, deviceId, softDelete})`; encrypt-on-write
  / decrypt-on-read, co-transactional `sync_queue` enqueue on every mutation `[FACT: db/repository.ts:236-497]`.
  Preferences repos: `encryptedFields: []` (PR-1), `softDelete: false` (no `deleted_at` on any of the 3
  `[FACT: preferences.ts` — no deleted_at column]`).
- **FIXED enum tuples in `@vida/types`** — `THEME`, `TIME_FORMAT`, `DOCK_POSITION`, `DOCK_SIZE`, `PERSONA`
  `[FACT: entities/user.ts:13,186-193]`.
- **A live consumer ALREADY reads the raw table (the seam this unit fulfils).** `sessions/service.ts` builds
  `userPrefsRepo = createRepository(db, userPreferences, {deviceId, encryptedFields: []})` and reads
  `pomodoro_*` directly, commented *"services/preferences unbuilt → read the table directly, IR-3"*
  `[FACT: services/sessions/service.ts:213-228]`. When this service exists, that inline read is a candidate to
  migrate onto the seam (see NEEDS).

## NEEDS — implicit work the docs imply but don't spell out as steps

- **N-1 · The `@vida/types` `UserPreferences` interface is STALE vs the schema.** It stops at `feature_gamification`
  and is **missing** all 10 build-phase columns the schema has: `font_size`, `compact_mode`, `number_format`,
  `default_dashboard_view`, `show_archived`, `notification_frequency` (G4), `module_visibility` (PB-2), and
  `persona`/`motivation_style`/`active_modules`/`onboarding_completed` (E9)
  `[FACT: entities/user.ts:195-221 vs schema/preferences.ts:47-88]`. The DB-4 spec §3c intended "a `@vida/types`
  `UserPreferences` extension" `[FACT: db-4-preferences/_index.md:128]` but the P4 completion record lists only the
  ADR-002 amendment `[FACT: _index.md:219]`. **A service that types its public surface off `UserPreferences` cannot
  expose these fields.** → Slice 1 must extend the interface to match the schema (SSOT: interfaces live in
  `@vida/types`, conventions.md:18). This is a *build* item, not a ratify.
- **N-2 · A `DEFAULTS` object must be authored (PR-2).** Reads are never `undefined`; the DB row overlays a
  hardcoded `DEFAULTS` — and on first run (no row) full defaults are returned `[FACT: business-rules.md:10 PR-2;
  conventions.md:6]`. No `DEFAULTS` const exists in the repo today `[FACT: grep — none in services/ or types/]`.
  The schema `.default(...)` values are the source of truth to mirror `[FACT: preferences.ts:45-112]`.
- **N-3 · Singleton logic: read-or-DEFAULT, create-on-WRITE (BR-P4/PR-3).** `user_preferences`/`nav_preferences`
  are one-row-per-vault, **app-enforced, not a DDL constraint** — normal UUIDv7 PK, no partial-unique
  `[FACT: db-4-preferences/_index.md:66-69 BR-P4]`. The Repository has no singleton concept
  (`create`/`findById`/`findAll`/`update`) `[FACT: repository.ts:185-217]` → the service owns it. **Grounded shape:
  a READ returns `findAll()[0]` overlaid on DEFAULTS and does NOT persist a row** — the live precedent
  `sessions/service.ts:224` reads `(await userPrefsRepo.findAll())[0]` and falls back to hard defaults, never
  creating `[FACT: sessions/service.ts:224-230]`; contract.md has only `updatePreferences` persist
  `[FACT: contract.md:12-18]`. The single row is created on the **first write** (read-or-create there).
- **N-4 · Command-palette upsert-by-key (PR-6/BR-P3).** `command_key` is UNIQUE (SQL-migration-only)
  `[FACT: preferences.ts:106; _index.md:63-65]`; `recordCommand` increments an existing key, never duplicates
  → the service looks up by `command_key` (`findWhere(eq(command_key, k))`) then `update`-or-`create`.
- **N-5 · Ordering lives in the service, not the DB.** Palette = pinned-first then frecency (`use_count`,
  `last_used_at`) `[FACT: business-rules.md:14 PR-6]`; `getCommandHistory` sorts in-service after `findAll`.

## ORGANIZATION — how the code is shaped here

- **Factory-object service** — `createPreferencesService(db, {deviceId}) → object literal`; intra-service calls go via
  hoisted closures / the `service` const, **never `this.`** (breaks on the destructure consumption shape)
  `[FACT: services/sessions/service.ts factory shape; memory factory-service-no-this-for-intra-calls]`.
- **Physical home** — `packages/core/src/services/preferences/` (dir + placeholder CLAUDE.md exist)
  `[FACT: services/preferences/CLAUDE.md]`. Two-package type split (conventions.md:18; CLAUDE.md Conventions):
  interfaces + string-literal-union enums extend `@vida/types/entities/user.ts` `[FACT: entities/user.ts:186-234]`;
  **canonical Zod lives in `@vida/core/src/validators/user.ts`** (which today holds only the enum schemas —
  `ThemeSchema`/`PersonaSchema`/… — no object schema yet) `[FACT: packages/core/src/validators/user.ts:16-26]`.
  Do NOT create new files — extend the colocated ones (memory db4-types-may-be-colocated).
- **Data flow** — validate → repository → (encrypt-seam, dormant) → return; rides `foundation/` substrates, does not
  re-implement them `[FACT: services/preferences/CLAUDE.md:11-13; docs/core/architecture/data-flow.md]`.
- **Backend ≠ frontend split.** This unit owns the *persist + merge + query* surface. Debounce/optimistic (PR-4),
  Zustand `themeStore` (PR-5), the searchable settings index (G7), and the Settings/Cmd+K UI are the ② frontend
  `[FACT: business-rules.md:12-13; structure-data.md:30-37]`.

## IMPLICIT RULES — invariants a mock would hide (backstopped by the live-store Verification Gate)

- **IR-a · `initVault()` is required even with empty `[E]`.** Every mutation runs `computeSyncHash → hashContent`
  (encryption path) regardless of the `[E]` set `[FACT: repository.ts:339-340,162-169]`; the live-store smoke must
  init the vault or writes fail `[FACT: memory m10-repos-use-empty-encryptedfields-seam]`.
- **IR-b · Concurrency: no create-on-read (dissolves the race).** Because reads never persist (N-3), there is no
  first-read create race. The only create is on first write; a concurrent double-first-write is mitigated by
  read-first (`findAll()[0]`) + always reading the first row — single-user local-first makes even that near-nil
  `[INTERP: N-3 + BR-P4 single-writer model; sessions/service.ts:224]`.
- **IR-c · Plaintext boundary is a hard NEVER.** No preference field is ever `[E]`; if a field feels sensitive it
  belongs in another domain `[FACT: conventions.md:9,26 PR-1]`. E9 receives config ONLY — never PII
  (`display_name`/`avatar_url`/`birth_date`) or the sibling `[E]` `focus_areas` (stay in `user_profile`)
  `[FACT: conventions.md:27; business-rules.md:18 PR-10]`.
- **IR-d · Delegate, never own.** The service builds NOTHING for account/auth/data-export (PR-8) or the ADR-014
  integration credential custody (PR-12, `connection_config` is `[E]` under the OS mediator) — those are other
  domains `[FACT: business-rules.md:16,20]`. No `sms` channel anywhere (PR-11) `[FACT: business-rules.md:19]`.
- **IR-e · Malformed JSON degrades to default, never crashes.** `dashboard_layout`/`mobile_nav_items`/
  `module_visibility`/`active_modules` are plain `text()` the app stringifies; a bad value falls back to its default
  (ties to PR-2) `[FACT: business-rules.md:26; preferences.ts:56-58,87 P-R5]`.
- **IR-f · N7 quiet-hours is cite-not-own.** Preferences owns `quiet_hours_*` as config; the reschedule-on-change
  enforcement is the Notifications dispatcher's `[FACT: business-rules.md:25 N7]` — no scheduling logic here.

## Step 1.5 — Envision Gate: **N/A**
Pure-backend service tier — it renders no surface a user forms a mental model of (entity-delivery-flow.md §3.75).
If the decomposition surfaces a user-visible affordance it belongs to `fe-preferences`, not here. Stated, not skipped.
