# DB-4 · Domain Group #2 — Preferences · Unit Spec

> **Unit:** the DB-4 per-domain schema build for the **Preferences** domain group (the platform's config provider,
> Wave-0 foundational, out-degree ≈ 0) — Stream (ii) of the M1.0 schema foundation.
> **Issue:** LIF-66 · M1/M1.0 `#10` · profile **add-backend-component** · ← DB-1 ✅ · ← DB-3 ✅ (substrate spine).
> **Flow:** the 5-phase lifecycle in `docs/roadmap/schema-foundation-build-flow.md §2`. **This file = Phase 1 (Intent
> intake).** Phase 2 (current-state read) + Phase 3 (plan double-gate) append their sections below.
> **No-Guessing:** every claim `[FACT: src]` / `[INTERP]` / `[INTENT]` / `[UNKNOWN]`. Ship-scope trimming is **forbidden
> in Phase 1** — a foundation intakes the WHOLE documented intent so nothing is silently omitted
> (`[[intake-captures-intent-not-ship-scope]]`).

## §0. Source model

Backend schema unit — the frontend source-of-truth guard (`docs/specs/foundation/frontend-source-of-truth.md`) is
**N/A** (no DS/UI/UX token surface). The intent source is the **`docs/features/preferences/` 5-aspect spec**
(`identity · structure-data · business-rules · contract · conventions`), sourced from **ADR-002 §5.17** (the 3 owned
tables, authoritative DDL), **ADR-012 §3.10** (E9 `user_profile` single-writer split — Preferences owes a receiving
amendment), **ADR-013 §3.2/§3.4** (N6 channel matrix / N7 quiet-hours config), **ADR-014 §3.2** (Layer-3 user-managed
integration surface), and the canonical enum tuples + entity interfaces in **`@vida/types/entities/user.ts`**.

> **⚠ Stale-source note (mirrors the group-#1 `entity_links` finding).** The feature docs (dated 2026-07-25) assert
> "**No `@vida/types` preferences file exists**" (structure-data.md:19, contract.md:5-7). **This is stale** —
> `packages/types/src/entities/user.ts` now defines the `THEME` / `TIME_FORMAT` / `DOCK_POSITION` / `DOCK_SIZE` tuples
> plus the `UserPreferences` / `NavPreferences` / `CommandBarHistory` / `UserProfile` interfaces. The FACT floor (§3a)
> therefore mirrors _existing_ canonical tuples, exactly as group #1 mirrored `PAGE_TYPE`. `[FACT: entities/user.ts
L178-234; [[stale-source-plus-live-convention-is-fact-not-a-decision]]]`

## §1. Identity — what this unit is

DB-4 / Preferences authors the **3 config tables Preferences owns** on top of the finished DB-3 substrate:
`user_preferences` (singleton — appearance · locale · dashboard · tasks · pomodoro · notifications · features),
`nav_preferences` (singleton — dock + mobile nav), and `command_bar_history` (many — ⌘K palette frecency + pinning).
Preferences is a **foundational config provider**: consumed widely (all UI, nav, pomodoro, tasks, notifications,
gamification, dashboard), depends on almost nothing of its own data. All three tables are **plaintext config, never
`[E]`** (PR-1). `[FACT: ADR-002 §5.17; identity.md; PR-1]`

**Boundary (what this unit is NOT):**

- **NOT `[E]`-encrypted anywhere.** Every column across the 3 tables is structural config (P), not user content —
  no field-level encryption is declared. The Repository registers an **empty `[E]` set** for these tables (same M1.0
  pass-through as every table). No `-- [E]` comments in the migration. `[FACT: ADR-002 L1097-1101 "All P"; PR-1]`
- **NOT the account/auth/PII owner.** Display name, password, biometric, delete-account are the Auth/Account domain's;
  Preferences _renders_ them as Settings sections but stores none. **PII (`display_name`/`avatar_url`/`birth_date`)
  STAYS in `user_profile` ⚠** even under the E9 split. `[FACT: identity.md:24-28; ADR-012 §3.10]`
- **NOT the data-import/export owner** (Data/Sync surface, rendered-not-owned) and **NOT an AI-config surface**
  (`ai_connections` is ADR-015, a separate page). `[FACT: identity.md:25,29]`
- **NOT the owner of the ADR-014 Layer-3 integration _tables_.** Preferences owns the management _surface_ (UI);
  the tables (`import_staging`, encrypted `connection_config` under mediator custody, integration-identity anchor)
  are the **ADR-014 ingestion owed-ledger** (ADR-002 §5.20 L3806), a **separate future issue — NOT DB-4 group #2**.
  `connection_config` is `[E]` under the OS mediator, never a plaintext preferences column (PR-12 preserves PR-1).
  `[FACT: ADR-014 §3.2/§3.4; ADR-002 §5.20 L3806; contract.md:25,31]`
- Authoring model: **hand-written SQL migration** (ADR-016 §3.5 — no drizzle-kit) + a Drizzle query-mirror module
  (`schema/preferences.ts`) + the `ENTITY_TYPES` reconcile check. Physical home / slot in §4 (P-R3).

## §2. Business Rules (inherited invariants — the intake honors these)

Every table this unit authors is a normal **syncable** table upholding `database-layer/current-business-rules.md`
(UUIDv7 PK · Unix-ms timestamps · INTEGER bool/money · TEXT enums with SQL `CHECK` + Zod for FIXED enums, OPEN vocab =
plain TEXT no CHECK · the 6 `_sync_*` columns · soft delete where applicable · three-layer encryption) and the feature
invariants **PR-1…PR-12** (`preferences/business-rules.md`). The schema-relevant ones:

- **BR-P1 — Plaintext config, never `[E]` (PR-1).** No column is `[E]`. If a field feels sensitive enough to encrypt,
  it belongs in another domain. `[FACT: ADR-002 L1097-1101; conventions.md:9,26]`
- **BR-P2 — FIXED enums → SQL CHECK, sourced from the `@vida/types` tuple.** `theme` (`THEME`), `time_format`
  (`TIME_FORMAT`), `dock_position` (`DOCK_POSITION`), `dock_size` (`DOCK_SIZE`) each carry a hand-written CHECK in the
  migration + an `enumText(col, TUPLE)` mirror in the Drizzle module. `[FACT: ADR-002 L3516,3520,3567,3570;
entities/user.ts L178-185; enum-parity.test.ts]`
- **BR-P3 — `command_bar_history.command_key` is UNIQUE.** Palette upserts by key; `recordCommand` increments an
  existing key, never duplicates (PR-6). Authored as a `UNIQUE` column constraint in the migration. `[FACT: ADR-002
L3593; PR-6]`
- **BR-P4 — Singleton config is one-row-per-vault, app-enforced, not a DDL uniqueness constraint (PR-3).**
  `user_preferences` / `nav_preferences` carry a normal UUIDv7 PK; "singleton" is an application invariant (the merge
  layer reads-or-creates the single row), not a SQL `CHECK`/partial-unique. No special DDL. `[INTERP: PR-3; ADR-002
single-user model — the tables have plain PKs, no singleton constraint]`
- **BR-P5 — RETIRE = absent, not migrated-away.** v2 is authored from zero (no v1 rows in M1.0); RETIRE (§3f) = verify
  the token never appears in `schema/`, not a data migration. `[FACT: storage-rebuild-strategy; BR-N5 precedent]`
- **BR-P6 — LWW config, no CRDT.** These are structured config columns, reconciled Last-Writer-Wins; no Yjs. No
  per-column sync flag at the schema layer (that is DB-2's `_sync_field_ts`, deferred). `[FACT: ADR-003 LWW; PR-9]`

---

## §3. Intent ledger (Phase 1 intake — the FULL Preferences set)

### 3a. FACT floor — the 3 owned tables (ADR-002 §5.17, mirrored by `entities/user.ts`)

`[FACT: ADR-002 §5.17 L3507-3607; entities/user.ts L187-234]` — authoritative and **not** flagged stale (unlike the
group-#1 §5.2 floor). Author all three, verbatim to §5.17, with the ADR-016 §3.4 full-`baseColumns` correction (P-R2).

| #   | Table                 | Cardinality | FIXED enum → CHECK                                      | Other constraints                                                                                         | Readiness      |
| --- | --------------------- | ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | `user_preferences`    | singleton   | `theme`(THEME) · `time_format`(TIME_FORMAT)             | JSON `dashboard_layout`; per-module push toggles; `quiet_hours_*`; `feature_gamification` — all plaintext | ✓ shape-locked |
| 2   | `nav_preferences`     | singleton   | `dock_position`(DOCK_POSITION) · `dock_size`(DOCK_SIZE) | JSON `mobile_nav_items`; all plaintext                                                                    | ✓ shape-locked |
| 3   | `command_bar_history` | many        | —                                                       | `command_key` UNIQUE; `use_count`/`last_used_at`/`is_pinned`                                              | ✓ shape-locked |

**`user_preferences` full column set** (ADR-002 §5.17 L3512-3558) — appearance: `theme`(CHECK) · `accent_color` ·
locale: `date_format` · `time_format`(CHECK) · `week_starts_on`(INTEGER) · `currency` · dashboard: `dashboard_layout`
(JSON) · tasks: `show_completed_tasks`(bool) · `default_task_priority`(TEXT, **no CHECK** — see P-R4) · pomodoro:
`pomodoro_work_minutes`/`pomodoro_break_minutes`/`pomodoro_long_break_minutes`/`pomodoro_sessions_before_long` · notif:
`notification_email`/`notification_push`/`notification_in_app`(bool) · `quiet_hours_enabled`(bool) ·
`quiet_hours_start`/`quiet_hours_end`(HH:MM TEXT) · per-module push: `push_habits`/`push_tasks`/`push_routines`/
`push_contacts`/`push_study`(bool) · features: `feature_gamification`(bool) · + full `baseColumns`.

**`nav_preferences` full column set** (L3564-3585) — `dock_position`(CHECK) · `dock_auto_hide`(bool) · `dock_size`
(CHECK) · `mobile_nav_items`(JSON array) · `show_labels`/`haptic_feedback`/`reduce_motion`(bool) · + full `baseColumns`.

**`command_bar_history` full column set** (L3591-3606) — `command_key`(UNIQUE) · `command_label` · `command_category` ·
`use_count`(INTEGER) · `last_used_at`(ts) · `is_pinned`(bool) · + full `baseColumns` (**P-R2 correction**: §5.17 omits
`created_at`/`updated_at` and the `CommandBarHistory` interface `extends SyncMetadata`; ADR-016 §3.4 mandates full base
on every table — same divergence class as group-#1 `page_links`/N-R2; interface reconcile is DB-11, not here).

### 3b. FIXED-vs-OPEN enum classification (BR-P2)

| Column                                      | Table            | FIXED / OPEN | CHECK?             | Source tuple                                                                |
| ------------------------------------------- | ---------------- | ------------ | ------------------ | --------------------------------------------------------------------------- |
| `theme`                                     | user_preferences | FIXED        | ✅ CHECK           | `THEME`                                                                     |
| `time_format`                               | user_preferences | FIXED        | ✅ CHECK           | `TIME_FORMAT`                                                               |
| `dock_position`                             | nav_preferences  | FIXED        | ✅ CHECK           | `DOCK_POSITION`                                                             |
| `dock_size`                                 | nav_preferences  | FIXED        | ✅ CHECK           | `DOCK_SIZE`                                                                 |
| `default_task_priority`                     | user_preferences | free default | ❌ no CHECK (P-R4) | — (references Tasks domain; §5.17 authored it as a bare `DEFAULT 'medium'`) |
| `currency` / `date_format` / `accent_color` | user_preferences | free string  | ❌ no CHECK        | —                                                                           |

### 3c. ⚠ INTENDED / build-phase intent — **AUTHOR in this unit; shape resolved in Phase 3**

These are documented intent beyond the §5.17 FACT floor. **The `⚠ INTENDED` / `[DEFERRED — build phase]` flags on
them are forward-pointers TO the build phase — and DB-4 IS the build phase, so they are IN-SCOPE to author here, not
deferrals to a later issue** (`[[build-phase-flags-mean-resolve-now-not-defer]]`; the flags were the intent-gathering
mechanism, DB-4 is where they close). Under Model B (author the whole intent upfront so downstream modules don't
silently re-decide shape) and the Phase-5 foundation-readiness bar (MOD-preferences must find every column its
`structure-data.md` promises), **all of §3c is authored in this unit**, with the exact shape resolved at the P3 gate,
grounded in a cited source (No-Guessing: undefined vocab → OPEN plain TEXT, never an invented CHECK). Because G4 + E9
extend beyond ADR-002 §5.17, this unit **also drafts the accompanying ADR-002 amendment via `/adr-new`** (the flow doc
§2 Phase 3 anticipates it), authored alongside the schema and riding the same P3 gate.

- **PB-1 — G4: six new `user_preferences` columns** — `font_size`, `compact_mode`, `number_format`,
  `default_dashboard_view`, `show_archived`, `notification_frequency`. **⚠ INTENDED** — not in ADR-002 §5.17, not in
  `entities/user.ts`. Adding them = a **candidate `/adr-new` (ADR-002 amendment)** + a `@vida/types` `UserPreferences`
  extension. Types/shapes to define in P3: `compact_mode`/`show_archived` = bool; `number_format`/`default_dashboard_view`
  = TEXT; `font_size` + `notification_frequency` **need an enum tuple defined** (candidate FIXED → CHECK) — no tuple
  exists yet. `[INTENT: structure-data.md:17; business-rules.md:44]`
- **PB-2 — G5: per-module visibility store shape** — a `module_visibility` JSON map (`moduleKey→bool`) on
  `user_preferences`, **or** a dedicated table. structure-data.md:18 calls the storage shape "a **build-phase
  decision**." Must stay conceptually distinct from `active_modules` (E9) and `feature_gamification` (PR-7,
  conventions.md:31). P3 resolves representation (lean: JSON column, mirrors `dashboard_layout`; alt: `module_prefs`
  table). `[INTENT: structure-data.md:18; PR-7]`
- **PB-3 — E9 receiving amendment (ADR-012 §3.10)** — Preferences becomes the **single-writer owner** of `persona`,
  `motivation_style`, `active_modules`, `onboarding_completed` (the `onboarding_*` family), routed **off** the
  overloaded `user_profile`. `persona` has a FIXED `PERSONA` tuple (`entities/user.ts` L13-21) → candidate CHECK;
  `active_modules` = JSON array; `motivation_style` = TEXT; `onboarding_completed` = bool. **Storage shape +
  the `active_modules ↔ module_visibility` reconciliation = `[DEFERRED — build phase]`** (structure-data.md:25). P3
  resolves: extend `user_preferences` with these 4 columns, **vs.** a Preferences-owned satellite table. **Cross-group
  boundary (flag for the plan gate):** `user_profile` is Gamification's table (group ~#19, not yet on disk) —
  whichever group authors these columns, the other must NOT. Since `user_profile` is authored from zero, this is not a
  data migration; Gamification's `user_profile` simply omits these 4 and keeps \*\*PII + `life_stage` + `focus_areas[E]`
  - `skipped_modules` + `timezone` + derived counters\*\* (conventions.md:27). `[INTENT: ADR-012 §3.10; ADR-002 §5.20
L3801; PR-10]`
- **PB-4 — N6 channel matrix / N7 quiet-hours** — **already satisfied by the FACT floor.** N6 = `notification_email`
  - `notification_push` + `notification_in_app` + per-module push toggles (in_app/push/email, **no `sms`** — §3f
    RETIRE); N7 = `quiet_hours_enabled`/`start`/`end`. No new schema; enforcement is Notifications' runtime (cite-not-own).
    `[FACT: ADR-002 §5.17; ADR-013 §3.4 N6 / §3.2 N7]`

### 3d. Tier-C — DEFERRED to another issue/ADR (cite, do NOT author here)

- **ADR-014 Layer-3 integration tables** — `import_staging`, encrypted `connection_config` (mediator custody),
  integration-identity anchor, per-source normalization contract. These are the **ADR-014 ingestion owed-ledger**
  (ADR-002 §5.20 L3806), a separate future build — **not DB-4 group #2**. Preferences owns only the _management surface_
  (UI). `[FACT: ADR-002 §5.20 L3806; ADR-014 §3.5/§3.8]`
- **`ai_connections`** (ADR-015) — a separate AI-config page, not a preferences table. `[FACT: identity.md:29]`

### 3e. `ENTITY_TYPES` registry reconcile

`_registry.ts` seeds the foundation + DB-3 substrate set. None of the 3 preferences tables is a polymorphic
`entity_type`/`entity_id` target (they carry no polymorphic ref columns), and nothing references a preference row _as_
a linkable entity. **Intent: this unit appends NOTHING to `ENTITY_TYPES`.** Confirm in P3. `[FACT: _registry.ts; the
3 tables' columns carry no entity_type]`

### 3f. RETIRE set (verify absent — BR-P5)

- **v1 social/profile fields** — `public_profile`, `show_activity`, `show_stats` (dropped: meaningless in single-user
  ZK v2, identity.md:27). Verify never authored.
- **`sms` notification channel** — v1 `NotificationChannel` had it; dropped platform-wide (un-encryptable,
  carrier-visible). The matrix is `in_app`·`push`·`email` only; no `sms` column/value. `[FACT: ADR-013 §3.4 N6/PR-11]`
- None must appear in the v2 `schema/`. `[FACT: identity.md:27; conventions.md:29]`

---

## §4. Shape resolution status — FACT floor closed by rule; Tier-B authored, shape resolved at P3

Unlike group #1 (Notes — _zero_ open decisions), Preferences has a **closed FACT floor (§3a/§3b)** _and_ a **build-phase
intent set (§3c) the docs flagged for exactly this phase.** Both are authored here: the floor is resolved by the citable
rules below; the §3c items have their shape resolved at the P3 gate, grounded in intent (never guessed). The closed
rules:

- **P-R1 — All refs plain TEXT + index, NO SQL FK.** The enforced no-FK convention across all authored tables
  (`spaces.ts:20-22`, DB-3 `BR-DB3-1`). Preferences has few cross-refs (`command_bar_history` is self-contained;
  `default_task_priority`/`default_dashboard_view` are value refs, not row FKs), so this mostly means: no `REFERENCES`
  clauses anywhere. `[FACT: current-business-rules.md BR-DB3-1; spaces.ts]`
- **P-R2 — Full `baseColumns` (incl. `updated_at`) on all 3 tables.** ADR-016 §3.4 locked pattern. `user_preferences`
  / `nav_preferences` already have `created_at`+`updated_at` in §5.17 (aligned). `command_bar_history` does **not** in
  §5.17 (and its interface `extends SyncMetadata`) — the exact §3.4 gap group #1 corrected for `page_links`; here it
  takes full `baseColumns`, interface reconcile deferred to DB-11. No `deleted_at` (config has no soft-delete
  semantic in §5.17; the merge layer read-or-creates). `[FACT: ADR-016 §3.4; N-R2 precedent; entities/user.ts L226]`
- **P-R3 — Physical home = `schema/preferences.ts` + `migrations/013_preferences.ts`.** ADR-016 §3.1 `<domain>.ts`
  layout (one per `structure-data.md`); the second Stream (ii) domain module after `notes.ts`/`012`; next migration
  slot is **`013`** (P2 confirms). `[FACT: ADR-016 §3.1; migrations/ ends at 012_notes]`
- **P-R4 — `default_task_priority` takes NO CHECK.** ADR-002 §5.17 authored it as a bare `DEFAULT 'medium'` (unlike
  `theme`/`time_format`, which carry explicit CHECKs). It references the Tasks domain's priority vocabulary, whose
  owning table is not yet authored — adding a CHECK the source omits would be manufacturing. Mirror §5.17: plaintext,
  no CHECK. Reconfirm against the Tasks table if it lands first. `[FACT: ADR-002 L3527; [[open-vocab-columns-take-no-sql-check]]]`
- **P-R5 — JSON columns = plain `text()` (RESOLVED at P3, gate-1 M1).** `dashboard_layout`, `mobile_nav_items`,
  `module_visibility`, `active_modules` are all **plain `text()`** (app `JSON.stringify`s) — the live convention across
  `spaces.ts:17-18` / `sessions.ts:59-61` / the `notes.ts` `summary_config` precedent. **Not `json<T>()`**, which only
  casts the TS type and would bind a raw object to SQLite (`_shared.ts:19`). `[FACT: spaces.ts:17-18; notes.ts:24,54]`

**Resolved at P3 (all authored; shape only, grounded in intent):** PB-1 (G4 column shapes + the ADR-002 amendment;
2 undefined-vocab enums → OPEN plain TEXT) · PB-2 (visibility JSON col vs table) · PB-3 (E9 storage shape: extend
`user_preferences` vs a Preferences-owned satellite + ensure Gamification's `user_profile` omits the 4 routed fields) ·
P-R5 minor (JSON helper). **The only exclusion is a domain boundary, not a defer:** the ADR-014 Layer-3 integration
tables (§3d) are the ingestion domain's schema (`connection_config` is `[E]` — structurally cannot be a plaintext
preferences table), authored under that domain, not here.

## §5. Phase-1 completion checklist

- [x] intent source read in full (5 aspects + `entities/user.ts` + ADR-002 §5.17/§5.20 + ADR-012 §3.10 + ADR-013/014 cites)
- [x] FULL intent intaken (no ship-scope trim) — 3 FACT-floor tables + Tier-B (§3c G4/visibility/E9) + Tier-C deferred (ADR-014/015)
- [x] FIXED vs OPEN enum classified per column (§3b; 4 FIXED→CHECK, `default_task_priority` no-CHECK)
- [x] stale-source reconciled (types exist → FACT floor is a mirror, §0 note)
- [x] RETIRE set enumerated (verify-absent: social/profile fields, `sms`; §3f)
- [x] `ENTITY_TYPES` reconcile scoped (no-op expected; confirm P3, §3e)
- [x] FACT floor closed by citable rules (§4 P-R1…P-R5); genuine Tier-B shape-open items honestly flagged for P3 (§3c)
- [x] **P2 — current-state read** (done — see §6 below)
- [x] **P3 — plan double-gate** — `sessions/PLAN-2026-08-19-db-4-preferences.md`; gate-1 REVISE (1 material: `json<T>()`→`text()`) + 6 minor → fixed → Approval 1 · preflight PASSED (§XXIX path gap fixed) · gate-2 SHIP → Approval 2.
- [x] **P4 — implement** — `schema/preferences.ts` + `migrations/013_preferences.ts` + barrel + runner + 5 parity rows + ADR-002 §5.17/§5.20 amendment + §XXIX docs. `@vida/core` 198 green · typecheck 11/11 · lint 0-err · `LATEST_VERSION`=13.
- [x] **P5 — foundation-soundness** — post-impl independent critique **REVISE→fixed** (1 material: `time_format` nullability type-lie — added `NOT NULL` to migration + §5.17) → **SHIP**. Foundation-readiness: MOD-preferences (#32) contract — every column authored — **PASS**. §XXIX promoted. **Group #2 DONE.**

---

## §6. Phase 2 — Current-state read (reconcile-and-extend baseline)

`[FACT: grep over packages/core/src/db/ · 2026-08-19]`

| Intent (§3a)                                               | On disk?              | Evidence                                                                  |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `user_preferences`                                         | ✗ **absent** — author | no `sqliteTable('user_preferences'…)` in `schema/**`                      |
| `nav_preferences`                                          | ✗ **absent** — author | no def in `schema/**`                                                     |
| `command_bar_history`                                      | ✗ **absent** — author | no def in `schema/**`                                                     |
| RETIRE `public_profile`/`show_activity`/`show_stats`/`sms` | ✓ absent (correct)    | no occurrence in `schema/**`                                              |
| `user_profile` (E9 counterpart, Gamification group ~#19)   | ✗ absent              | not yet authored — so E9 is author-from-zero, not a data migration (PB-3) |

- **Migration slot:** next number is **`013`** (`migrations/` ends at `012_notes.ts`; `ALL_MIGRATIONS` in `runner.ts`
  ends at `migration012Notes`, L23/L47). This unit adds `013_preferences.ts` + its import (after L23) + array entry
  (after L47). `[FACT: migrations/ listing; runner.ts:23,47]`
- **Barrel:** `schema/index.ts` ends with the `export * from './notes'` DB-4 line; add one
  `export * from './preferences'` line below it (the second Stream (ii) domain). `[FACT: index.ts tail]`
- **`ENTITY_TYPES`:** `_registry.ts` unchanged — no preference table is a polymorphic target (§3e); confirm no-op at P3.
- **Baseline verdict:** clean reconcile-and-extend — 3 net-new tables, zero collisions, RETIRE tokens already absent,
  FACT floor closed (§4). The **only** non-mechanical work is the Tier-B P3 resolutions (§3c: G4 columns · per-module
  visibility shape · E9 storage + cross-group boundary). P3 is an authoring plan **plus** those three shape decisions.
