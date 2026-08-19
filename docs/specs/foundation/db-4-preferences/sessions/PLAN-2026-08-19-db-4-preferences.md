# PLAN — DB-4 · Group #2 Preferences (Phase 3, gate 1)

> **Unit:** DB-4 Stream (ii) Preferences schema. **Spec:** `../_index.md` (P1 intake + P2 current-state).
> **Flow:** 5-phase lifecycle §2 · this is the **Phase-3 PLAN** for gate-1 independent critique → Approval 1.
> **Authoring model:** hand-written SQL migration (ADR-016 §3.5) + Drizzle query-mirror + `ENTITY_TYPES` check +
> enum-parity + ADR-002 amendment + §XXIX currency. **No-Guessing:** every shape call carries a `[FACT/INTENT]` cite.

## 1. Objective
Author the **full documented Preferences intent** (Model B, whole-intent-upfront) as 3 tables:
`user_preferences` (singleton), `nav_preferences` (singleton), `command_bar_history` (many) — the §5.17 FACT floor
**plus** the build-phase intent set (§3c: G4 columns · PB-2 module visibility · E9 `user_profile` split), with the
accompanying ADR-002 amendment. All plaintext (PR-1, zero `[E]`).

## 2. Shape resolutions (the §3c items — resolved here, grounded in intent)

### R1 — G4: six new `user_preferences` columns `[INTENT: structure-data.md:17; No-Guessing on vocab]`
| Column | Type | Default | CHECK? | Rationale |
|--------|------|---------|--------|-----------|
| `compact_mode` | INTEGER (bool) | `NOT NULL DEFAULT 0` | — | boolean toggle; conservative off default (mirrors §5.17 bool pattern) |
| `show_archived` | INTEGER (bool) | `NOT NULL DEFAULT 0` | — | boolean; default hide archived |
| `number_format` | TEXT | nullable, no SQL default → **app-merge default (PR-2)** | — | free-string locale format, sibling of `date_format` |
| `default_dashboard_view` | TEXT | nullable → **app-merge default (PR-2)** | — | references a dashboard view id/key; free string, no §5.17 sibling |
| `font_size` | TEXT | nullable → **app-merge default (PR-2)** | **NO CHECK (OPEN)** | vocab defined **nowhere** → plain TEXT, app-validated; a CHECK would invent a closed set (`[[open-vocab-columns-take-no-sql-check]]`) |
| `notification_frequency` | TEXT | nullable → **app-merge default (PR-2)** | **NO CHECK (OPEN)** | vocab undefined → OPEN plain TEXT, same reasoning |

- **No-Guessing note:** `font_size` / `notification_frequency` are authored as OPEN plain TEXT precisely because no
  source defines their value set. When a consumer (or a follow-up) specifies the vocab, it becomes a tuple + CHECK
  then — not invented here. The 4 text/bool columns take no vocab risk. `[INTENT: structure-data.md:17]`
- **Default sourcing (fix m2):** the bool columns (`compact_mode`/`show_archived`) take `NOT NULL DEFAULT 0` mirroring
  the §5.17 boolean pattern; the four TEXT columns are **nullable with no SQL default**, and the app supplies the
  fallback via the merge-with-defaults layer (**PR-2**, `business-rules.md:10`) — sourced, not asserted. `[FACT: PR-2]`

### R2 — PB-2: per-module visibility `[INTENT: structure-data.md:18 "build-phase decision"; PR-7]`
- **Resolution: a `module_visibility` TEXT (JSON map `{moduleKey: bool}`, plain `text()`) column on `user_preferences`,
  nullable.** The doc's first-listed option (`structure-data.md:18`; spec `_index.md` §3c PB-2); a singleton per-vault
  map needs no separate table (single-user, no-FK — a dedicated table would be over-engineering). Mirrors
  `dashboard_layout` (JSON on the same singleton). App-merge default = all-visible (**PR-2**). `[INTENT: structure-data.md:18]`
- **Kept semantically distinct (conventions.md:31, PR-7):** `module_visibility` (nav show/hide) ≠ `active_modules`
  (E9 persona/onboarding-driven) ≠ `feature_gamification` (logic enable). Three separate columns, no merge. **(fix m6)
  This distinction is authored INTO the code** — a header comment in `preferences.ts` (mirroring how `notes.ts:23-24`
  documents `type` CHECK vs `entity_type` OPEN) + a BR entry in `current-business-rules.md` (step 8), not only asserted
  in this plan's risk section.

### R3 — E9: `user_profile` single-writer split `[FACT: ADR-012 §3.10; ADR-002 §5.20 L3801; PR-10]`
- **Resolution: author the 4 routed fields as columns on `user_preferences`** (its single-writer home — the singleton
  config row Preferences owns). No satellite table: single-user + no-FK means a 2nd singleton buys nothing; one row
  keeps the `active_modules ↔ module_visibility` reconciliation trivial (adjacent columns, still distinct per R2).

| Column | Type | Default | CHECK? | Source |
|--------|------|---------|--------|--------|
| `persona` | TEXT | nullable | **CHECK (PERSONA)** | FIXED tuple exists (`entities/user.ts` L13-21); `user_profile` DDL L3372 already CHECKs it |
| `motivation_style` | TEXT | nullable | — | free string (`UserProfile.motivation_style: string\|null`) |
| `active_modules` | TEXT (JSON array, plain `text()`) | nullable | — | module-key array; authored **nullable per the §5.15 `user_profile` DDL precedent** (L3389), not the `string[]` interface — interface reconcile is DB-11 (same class as `command_bar_history`/P-R2) |
| `onboarding_completed` | INTEGER (bool) | `NOT NULL DEFAULT 0` | — | boolean (`UserProfile.onboarding_completed`; §5.15 L3387) |

- **Cross-group constraint (record for group ~#19 Gamification):** when `user_profile` is authored, it **omits**
  `persona`/`motivation_style`/`active_modules`/`onboarding_completed` (now Preferences-owned) **and** `check_in_streak*`
  (→ Check-ins, CK-11). It keeps **PII (`display_name`/`avatar_url`/`birth_date` ⚠, all `[E]`) + `focus_areas[E]` +
  `life_stage` + `skipped_modules` + `timezone` + derived `total_xp`/`current_level`**. No field ends with two writers.
  `[FACT: ADR-012 §3.10; ADR-002 §5.15 L3376]` → logged in `_index.md` §7 cross-group ledger.
- **⚠ Doc-imprecision flag (fix m3):** `conventions.md:27` calls `focus_areas`/`life_stage`/`timezone`/`skipped_modules`
  collectively "the sibling `[E]` fields" — but per §5.15 (L3376) **only `focus_areas` is `[E]`**; the other three are
  plaintext. The plan's keeper-list is more correct than the feature doc; the ADR-002 amendment + DB-11 reconcile must
  NOT propagate the "`[E]`" mislabel onto the three plaintext fields. `[FACT: ADR-002 §5.15 L3376]`
- **Not received (⚠):** PII + `focus_areas[E]` never enter Preferences (PR-1/PR-10 — plaintext only).

### R4 — FACT floor (unchanged from §3a/§3b) — mirror ADR-002 §5.17
- 4 FIXED enums → CHECK from existing tuples: `theme`(THEME) · `time_format`(TIME_FORMAT) · `dock_position`(DOCK_POSITION)
  · `dock_size`(DOCK_SIZE). `default_task_priority` → **no CHECK** (P-R4, §5.17 bare default).
- Full `baseColumns` on all 3 (P-R2). `command_bar_history` gains `created_at`/`updated_at` vs §5.17's omission +
  the `SyncMetadata`-only interface (DB-11 reconcile). `command_key` UNIQUE (BR-P3).
- **No `deleted_at`** — §5.17 config has no soft-delete semantic; the merge layer read-or-creates the singleton.
- **No speculative indexes** — singletons are single-row; `command_key` UNIQUE already indexes the palette lookup.

## 3. Authoring steps (Phase 4 preview — exact deltas)
1. **`migrations/013_preferences.ts`** — 3 `CREATE TABLE` (full columns per R1–R4), CHECKs on the 5 FIXED enums,
   `UNIQUE(command_key)`, full `baseColumns` SQL mirror. Runs inside the runner's BEGIN/COMMIT (no own txn). Zero `-- [E]`.
2. **`schema/preferences.ts`** — Drizzle query-mirror: `enumText` for the 5 CHECKed cols, `boolInt`, **plain `text()`
   for ALL JSON columns** (`dashboard_layout`/`mobile_nav_items`/`module_visibility`/`active_modules`) — the app
   `JSON.stringify`s; **not `json<T>()`** (which only casts + would bind a raw object to SQLite — `spaces.ts:17-18`,
   `sessions.ts:59-61`, and the `notes.ts` `summary_config` precedent this unit mirrors). `...baseColumns`; inferred
   `*Row`/`*Insert` types. **Header comment** mirrors `notes.ts:23-24` and MUST document (fix m6) the three-way
   distinction `module_visibility` (nav show/hide) ≠ `active_modules` (E9) ≠ `feature_gamification` (logic enable),
   cite `conventions.md:31`/PR-7.
3. **`schema/index.ts`** — append `export * from './preferences'` after the `./notes` line.
4. **`migrations/runner.ts`** — import `migration013Preferences` (after L23) + append to `ALL_MIGRATIONS` (after L47) +
   extend the DB-4 comment.
5. **`schema/_registry.ts`** — **no-op** (confirmed §3e: no preference table is a polymorphic target). Assert in plan.
6. **`validators/enum-parity.test.ts`** — add parity coverage for `theme`/`time_format`/`dock_position`/`dock_size`
   (existing tuples) + `persona` (PERSONA). **Two mechanical edits (fix m5), not just fixture rows:** (a) add
   `import { THEME, TIME_FORMAT, DOCK_POSITION, DOCK_SIZE, PERSONA }` to the top import block; (b) wire
   `migration013Preferences` into the `ddlFor` chain so the CHECK DDL is actually discovered (else a fixture row → a
   false "no DDL found" failure). Verify tuple ≡ migration CHECK for each.
7. **ADR-002 amendment** — update **§5.17** DDL (add the G4 + `module_visibility` + E9 columns to `user_preferences`,
   with inline provenance comments: E9 = ADR-012 §3.10; G4/visibility = build-phase intent) + flip the **§5.20** E9
   ledger row (L3801) from ⏳ to fulfilled (cite this unit). **Column placement (fix m4) — preserve §5.17's concern
   grouping:** `compact_mode`/`font_size` under `-- Appearance`; `number_format` under `-- Locale`;
   `default_dashboard_view`/`module_visibility` under `-- Dashboard`; `show_archived` under `-- Tasks`;
   `notification_frequency` under `-- Notifications`; the 4 E9 fields in a new `-- Onboarding & persona (E9, ADR-012
   §3.10)` group. Migration `013` column order matches this placement. **At implement time, re-locate the §5.20 row by
   its text ("receiving amendment owed"), not the frozen line — the §5.17 column insertions shift every line below them.**
   `[the "candidate ADR-002 amendment" the docs owe]`
8. **§XXIX currency** — promote **`docs/infrastructure/database-layer/current-{spec,business-rules}.md`** (path
   corrected by preflight — NOT `docs/core/…`) — add a "DB-4 group #2 — Preferences" section + BR-P1…P6 (incl. the
   `module_visibility`≠`active_modules`≠`feature_gamification` distinction, fix m6) in the same commit. The invariants'
   #7 (soft-delete `deleted_at`) is **opt-in** — §5.17 config carries none, so the 3 tables omit it (like
   `app_state`/`sync_queue`); note this so it doesn't read as a missing-column gap.

## 4. Verification (Phase 4 exit)
- `@vida/core` test suite green (parity additions pass) · root `pnpm typecheck` 11/11 · grep gates: zero `-- [E]` in
  `013`, zero `REFERENCES` (no-FK), RETIRE tokens absent, `sms` absent.
- Foundation-readiness (Phase 5): MOD-preferences `contract.md` surface — every read (`getMergedPreferences`,
  `getNavPreferences`, `getModuleVisibility`, E9 config, command history) maps to an authored column.

## 5. Risks / open checks for the critique
- **C1 — persona CHECK ownership:** persona's CHECK now lives only in `013_preferences` (not `user_profile`). Confirm
  no other migration authors a persona CHECK (grep) → parity single-source holds.
- **C2 — `default_task_priority` no-CHECK:** confirm the Tasks table (unbuilt) won't later expect a preferences-side
  CHECK; §5.17 authored it bare → mirror it (P-R4).
- **C3 — @vida/types untouched:** like group #1, this unit authors **no** `@vida/types` interface change; the new
  columns' interface fields are the DB-11 reconcile. Confirm this doesn't break any `$inferSelect↔interface` assertion
  (none exists for preferences → compiles).
- **C4 — ADR-002 edit scope:** amending an ADR from a schema unit — justified because §5.20 L3801 explicitly dockets
  the E9 "receiving amendment owed"; G4 rides the same amendment. Confirm the gate agrees this is fulfillment, not scope creep.
- **C5 — module_visibility vs active_modules:** two JSON columns with overlapping "module" semantics — confirm the
  distinct-concern justification (R2/R3) is airtight and documented so a consumer never conflates them.

## 6. Gate-1 critique — verdict REVISE → resolved (2026-08-19)
Independent adversarial critique: **trim-hunt clean, E9 routing exact, persona CHECK single-source, no-FK/plaintext/
baseColumns all hold.** Verdict REVISE on 1 MATERIAL + 6 MINOR — all applied:
- **M1 (MATERIAL) — `json<T>()` → plain `text()`** for all 4 JSON columns (step 2, R2, spec P-R5). `json<T>()` only
  casts + binds a raw object; convention is app-stringify + `text()` (`spaces.ts:17-18`; the `notes.ts` precedent).
- **m2** — nullable-no-default G4 TEXT columns sourced to **PR-2** (merge-with-defaults), not asserted (R1).
- **m3** — flagged `conventions.md:27`'s "`[E]` fields" imprecision (only `focus_areas` is `[E]` per §5.15 L3376); the
  amendment/DB-11 must not propagate the mislabel (R3).
- **m4** — §5.17 column placement pinned to the concern-grouping; migration order matches (step 7).
- **m5** — enum-parity wiring enumerated: import the 5 tuples + wire `migration013Preferences` into `ddlFor` (step 6).
- **m6** — the `module_visibility`≠`active_modules`≠`feature_gamification` distinction authored INTO `preferences.ts`
  header + a `current-business-rules.md` BR (steps 2, 8), not only asserted here.
- **m1 (minor)** — dropped the decorative memory-slug from R2; kept the load-bearing `structure-data.md:18` cite.

**→ Ready for Approval 1.** Next: `/preflight` against this revised plan → gate-2 critique → Approval 2.
