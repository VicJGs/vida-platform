# DB-4 · Domain Group #14 — Relationships (CRM) · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #14 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `025_relationships` (v25) · **Schema file:** `schema/relationships.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** relationships ✅IMPLEMENTED (2026-07-24, LITE gate SHIP/0-blocking) — the ADR-realignment (SP1/SP3 tags · N1/N2 delivery · X1/X8 ingestion naming) is DONE; the DDL + the `[INTENT]` build-phase additions are THIS build's job.

> The platform's personal **CRM** — the PII-heaviest module. **8 tables**: 6 reshaped from the §5.9 FACT floor +
> **2 net-new networks** (`network_groups`, `network_group_contacts`). Every shape is doc-determined; **zero
> build-decisions**, consistent with groups #1–#12.

## §0. Source model

Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/relationships/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects) ·
`docs/intake/relationships.md` §Resolution (**WHOLE**, Victor 2026-06-28) · `part-1.2-reruns/relationships.md` (implemented) ·
`ADR-002 §5.9` (exact 6-table DDL floor) · `relationship.ts` (4 live enums) · `common.ts` (`FREQUENCY`, `PRIORITY`) ·
`database-layer/current-*.md` + prior-group precedent (no-FK · ledger-no-`deleted_at` · OPEN-vocab-no-CHECK).

## §1. Identity — what this unit is

A personal CRM: people (`contacts`) with encrypted PII, a logged interaction history (`interactions`), important dates
(`contact_events`), three reminder mechanisms (`contact_reminders` · `reminder_groups` + its junction), and — **net-new
this build** — **networks** (`network_groups` + `network_group_contacts`, a contact belongs to _many_, RL-4) feeding the
Sigma.js neural graph. Relationship **health is a derived, closeness-weighted analytic** — NOT a stored column, NOT an
ADR-011 measurable (C1). Wave-1 independent domain.

### Scope boundary — doc-DECIDED (settled-intent / owned-elsewhere split)

The `⚠ INTENDED` set is **settled intent** (intake §Resolution = WHOLE), so the build-phase flags → **author now**
([[build-phase-flags-mean-resolve-now-not-defer]]). The rerun's C6 "networks stay schema-0 `[INTENT]`" was the guard for
the _doc-realignment_ pass — DB-4 IS the build phase → networks are authored.

**AUTHOR (settled → build-phase):**

- **Networks (G2):** `network_groups` (name[E], is_active; description→pages) + `network_group_contacts` junction (M:N, RL-4).
- **`contacts.closeness_tier`** (G4, onion tier for health weighting) — OPEN `TEXT`, no CHECK (tier vocab is **Preferences-defined**, `contract.md:31`).
- **`contacts.how_we_met`** [E] (G8 restored).
- **`interactions.energy_given` / `energy_received` / `key_takeaways`** (G8 restored — energy feeds health, RL-5).
- **`contact_reminders.is_snoozed` / `snoozed_until` / `priority`** (G8 restored).
- **`reminder_groups` event-anchored mode (G11/RL-7):** `anchor_type` + `anchor_days_before` (fire N days before a member's birthday).
- **Retire inline `contacts.tags`** → shared `entity_tags` (G10/SP1); register `entity_type='contact'` (+`'network'`). No `tags` column.

**OUT (owned elsewhere / cite-not-author):**

- **Notification delivery (N1/N2, ADR-013)** — the three reminder mechanisms _produce_ notifications; the three-tier
  delivery + content-free wake payload are **Notifications-owned**. **No delivery columns** here (rerun Primary B, cite-not-re-spec).
- **Device import (X1/X8/X2/X5, ADR-014)** — `importDeviceContacts()` is a device-side **service**; `import_staging`
  is ADR-014-owned; `external_in_ok` is an ADR-010 grant (**no new columns**, rerun G-X2/X5). **No `import_staging` table** here.
- **Relationship health formula / closeness banding** — a service/design concern; health is derived, never stored (C1/C5). No table.
- **Neural graph rendering** — Sigma.js is a UI concern; the graph reads `network_group_contacts` membership (RL-4). No graph table (G3: membership edges only, no contact↔contact edge table).
- **Gamification interaction streaks (012)** — not a driver; the edge stays `[INTENT]`, **no `grant_currency`/E2** (C2).
- **Global Calendar** — a parked platform surface (reminders/events _viewed_ there); not Relationships' to own.
- **`@vida/types` interface reconcile** — DB-11 (every group defers it).

### Boundary — what this unit is NOT (doc-cited)

NOT the notification dispatcher · NOT the device-import service/`import_staging` · NOT the health-compute/closeness-banding
engine · NOT the Sigma.js graph · NOT the Gamification economy · NOT the global Calendar · NOT the DB-11 interface reconcile.

## §2. Business Rules (inherited invariants the intake honors)

- **RL-1 [E] set** (ZK-1, paramount — PII-heaviest module): all identifying contact fields + free text encrypted;
  `*_type`/`sentiment`/`frequency`/`priority`/`anchor_type` enums, dates, flags, counts, `energy_*`, `closeness_tier` are
  plaintext. (M1.0 = empty `[E]` set, pass-through — BR-DB6-3; `[E]` marked via `@encrypted` JSDoc.)
- **RL-2 cascade-from-contact — app/sync-layer** (no-FK): deleting a contact cascades its `contact_events`/`interactions`/
  `contact_reminders`/`reminder_group_contacts`/`network_group_contacts`; `contact_reminders.reminder_group_id` SET NULL on
  group delete. Under the no-FK convention the DDL carries plain-TEXT refs, **no `REFERENCES`**; cascade/orphan = app-layer.
- **RL-3 derived contact stats** — `last_interaction_date`/`interaction_count`/`next_contact_date` are a **cache**;
  truth = the interactions ledger. Plain nullable columns, never a second stored truth.
- **RL-4 M:N networks** — a contact in many networks via `network_group_contacts`; graph = membership edges only (RL-3/G3).
- **RL-5 health derived, closeness-weighted — NOT a measurable** (C1): no `measurement_kind`/`binding_mode`; contacts are
  ADR-011-excluded reference data. Health recomputed, never persisted.
- **RL-10 shared tags** — `entity_tags` (`entity_type='contact'`, SP1) + `parent_tag_id` nesting (SP3); inline `tags` retired.
- **RL-6/RL-7 reminders** produce notifications (N1) + never auto-send + content-free push (N2) — Notifications-owned (cite).
- **RL-11 device import** is device-mediated (X1) + reconciled via `import_staging` (X8) — ADR-014-owned service (cite).

### Enum CHECK sets (FIXED → SQL CHECK, tuple-sourced) + OPEN-vocab (no CHECK)

**FIXED (9 parity rows):**
| Table.column | Tuple (`@vida/types`) | Note |
|---|---|---|
| `contacts.relationship_type` | `RELATIONSHIP_TYPE` (9) | live (`relationship.ts`); DEFAULT `'acquaintance'` |
| `contacts.stay_in_touch_frequency` | `FREQUENCY` (6) | reuse (`common.ts`); nullable |
| `contact_events.event_type` | `CONTACT_EVENT_TYPE` (4) | live; DEFAULT `'custom'` |
| `interactions.interaction_type` | `INTERACTION_TYPE` (8) | live; DEFAULT `'in_person'` |
| `interactions.sentiment` | `SENTIMENT` (3) | live; nullable |
| `contact_reminders.frequency` | `FREQUENCY` (6) | reuse; nullable |
| `contact_reminders.priority` | `PRIORITY` (5) | **reuse `common.ts`** (G8); nullable, no default |
| `reminder_groups.frequency` | `FREQUENCY` (6) | reuse; nullable |
| `reminder_groups.anchor_type` | `REMINDER_GROUP_ANCHOR` (2) | **NET-NEW** `{schedule,birthday}` (G11); NOT NULL DEFAULT `'schedule'` |

**OPEN-vocab (plain TEXT, NO CHECK, NO tuple — [[open-vocab-columns-take-no-sql-check]]):**
`contacts.closeness_tier` — the onion-tier vocabulary is **Preferences-defined** (`contract.md:31` "closeness-tier
definitions"), user-configurable → genuinely not a platform tuple. Nullable.

## §3. Intended shape — 8 tables (floor + settled amendments, cited)

6 entity tables + 2 junctions. **All 8** use `...baseColumns` (id · created*at · updated_at · 6 `\_sync*_`).
**Junctions take a synthetic `id`PK +`UNIQUE(pair)`+ reverse-lookup index — NOT §5.9's composite PK** (the live
**entity_tags-v2 junction convention**,`project_habits`:29-30, which deliberately reshaped the same-shaped §5.5 composite-PK
junction; [[stale-source-plus-live-convention-is-fact-not-a-decision]] — §5.9's composite PK + `SyncMetadata`-only shape is
the stale source, the synthetic-id reshape is live). This also keeps the introspection harness's `pk == ['id']`assertion
uniform across all 8. **No cross-table FK** (all`_\_id`plain TEXT; cascade/SET-NULL app-layer — no-FK convention, superseding
§5.9's`REFERENCES`/`CASCADE`). **`deleted_at`on`contacts` ONLY\*\* (§3 shape-resolution 2).

### §3a. `contacts` `[FACT: §5.9 L2227-2265; AMEND how_we_met/closeness_tier G4/G8; tags RETIRED G10]`

`first_name[E]`(NOT NULL) · `last_name[E]` · `nickname[E]` · `relationship_type`(CHECK 9, DEFAULT 'acquaintance') ·
`email[E]` · `phone[E]` · `avatar_url[E]` · `company[E]` · `job_title[E]` · `location[E]` · `birthday[E]`(YYYY-MM-DD) ·
`how_we_met[E]`(**NEW G8**, nullable) · `social_links[E]`(JSON, KEPT — C4) · `closeness_tier`(**NEW G4**, OPEN no-CHECK,
nullable) · `stay_in_touch_frequency`(CHECK `FREQUENCY`, nullable) · `stay_in_touch_days`(INTEGER) ·
`last_interaction_date`(cache, RL-3) · `next_contact_date`(cache) · `interaction_count`(NOT NULL DEFAULT 0) ·
`is_favorite`(NOT NULL DEFAULT 0) · `deleted_at`. **No `tags` column** (retired → entity_tags). **No name index** (both `[E]`
ciphertext — §5.9 F7/D7 note; decrypt-in-memory / FTS5).

### §3b. `contact_events` `[FACT: §5.9 L2275-2295]`

`contact_id`(plain TEXT, no-FK, NOT NULL) · `event_type`(CHECK 4, NOT NULL DEFAULT 'custom') · `event_date`(NOT NULL;
YYYY-MM-DD or MM-DD year-agnostic) · `title[E]` · `description[E]` · `is_recurring`(NOT NULL DEFAULT 1) · `reminder_days`(JSON
array). **No `deleted_at`** (child of contact; RL-2 cascade). Index: `idx_contact_events_contact`(contact_id).

### §3c. `interactions` `[FACT: §5.9 L2303-2327; AMEND energy/key_takeaways G8]`

`contact_id`(plain TEXT, no-FK, NOT NULL) · `interaction_type`(CHECK 8, NOT NULL DEFAULT 'in_person') · `date`(NOT NULL) ·
`duration_minutes`(INTEGER) · `summary[E]` · `sentiment`(CHECK 3, nullable) · `follow_up_needed`(NOT NULL DEFAULT 0) ·
`follow_up_date` · `follow_up_notes[E]` · `energy_given`(**NEW G8**, INTEGER, nullable, plaintext) · `energy_received`(**NEW
G8**, INTEGER, nullable, plaintext) · `key_takeaways[E]`(**NEW G8**, nullable). **No `deleted_at`** — the **interactions
ledger** (RL-3, truth-source); hard-deletes with the contact (the `habit_completions`/`routine_completions` ledger
precedent, HB-11/RT-17). Indexes: `idx_interactions_contact`(contact_id) · `idx_interactions_date`(date).

> **`deleted_at` note (the one call a critic pokes):** omitting it is a **deliberate floor-mirror** — §5.9 gives `deleted_at` to `contacts` alone; re-adding it to `interactions` would be the _drift_ (over-adding beyond the floor). A mis-logged interaction hard-deletes with its contact (RL-2 cascade); tombstone-on-hard-delete is a sync-layer concern.
> **[E] note:** `energy_given`/`energy_received` = plaintext numeric analytic (the `sentiment`/`duration_minutes`
> precedent — analytic metadata, not identifying PII). `key_takeaways` = free text about a person → `[E]` (the `summary` precedent).

### §3d. `contact_reminders` `[FACT: §5.9 L2336-2357; AMEND snooze/priority G8]`

`contact_id`(plain TEXT, no-FK, NOT NULL) · `reminder_group_id`(plain TEXT, no-FK, nullable — was SET NULL) · `title[E]`(NOT
NULL) · `reminder_date` · `is_recurring`(NOT NULL DEFAULT 0) · `frequency`(CHECK `FREQUENCY`, nullable) · `is_completed`(NOT
NULL DEFAULT 0) · `is_snoozed`(**NEW G8**, NOT NULL DEFAULT 0) · `snoozed_until`(**NEW G8**, TEXT date, nullable) ·
`priority`(**NEW G8**, CHECK `PRIORITY`, nullable). **No `deleted_at`** (child of contact; RL-2 cascade; `is_completed`
governs lifecycle).

### §3e. `reminder_groups` `[FACT: §5.9 L2363-2383; AMEND event-anchor G11]`

`name[E]`(NOT NULL) · `message_template[E]` · `time_of_day`(HH:MM) · `frequency`(CHECK `FREQUENCY`, nullable) ·
`days_of_week`(JSON array) · `is_active`(NOT NULL DEFAULT 1) · `anchor_type`(**NEW G11**, CHECK `REMINDER_GROUP_ANCHOR`, NOT
NULL DEFAULT 'schedule') · `anchor_days_before`(**NEW G11**, INTEGER, nullable — days before a member's birthday when
`anchor_type='birthday'`). **No `deleted_at`** (`is_active` governs lifecycle — the FACT-floor pattern).

### §3f. `reminder_group_contacts` (junction) `[FACT: §5.9 L2385-2397; RESHAPE project_habits v2]`

`...baseColumns` (synthetic `id` PK) · `reminder_group_id`(plain TEXT, no-FK, NOT NULL, was CASCADE) · `contact_id`(plain
TEXT, no-FK, NOT NULL, was CASCADE). `UNIQUE(reminder_group_id, contact_id)` (pair-uniqueness) + `idx_reminder_group_contacts_contact`(contact_id)
reverse lookup (reminder_group_id covered by the UNIQUE leading col). No `deleted_at` (`project_habits` precedent).

### §3g. `network_groups` (NET-NEW — G2) `[INTENT: intake G2; structure-data.md:22]`

`name[E]`(NOT NULL) · `is_active`(NOT NULL DEFAULT 1). Description → a `pages` row (`entity_type='network'`, G9) — **no
`description` column**. Health derived (RL-5) — no stored column. **No `deleted_at`** (mirrors `reminder_groups`: `is_active`
governs lifecycle).

### §3h. `network_group_contacts` (NET-NEW junction — G2/RL-4) `[INTENT: intake G2; structure-data.md:22-23]`

`...baseColumns` (synthetic `id` PK) · `network_group_id`(plain TEXT, no-FK, NOT NULL) · `contact_id`(plain TEXT, no-FK, NOT
NULL). `UNIQUE(network_group_id, contact_id)` — M:N, idempotent membership (RL-4) + `idx_network_group_contacts_contact`(contact_id)
reverse lookup. No `deleted_at`. Mirrors `reminder_group_contacts` (project_habits v2 junction shape).

### §3i. `ENTITY_TYPES` registry — append

`+= 'contact', 'network'` — both are pages + entity_links + entity_tags targets (contact/network standalone pages + notes
via `pages`, G9; shared tags retire inline `contacts.tags`, RL-10/SP1; networks register `entity_type='network'` now that
they land, SP2/RL-4). **Excluded:** `contact_event`/`interaction`/`contact_reminder`/`reminder_group` (addressed via
`contact_id`/own refs, not polymorphic targets — the `habit_completions` precedent) + the 2 junctions.

### §3j. `@vida/types` — net-new enum now; interfaces → DB-11

NET-NEW tuple + Zod validator: **`REMINDER_GROUP_ANCHOR`** = `['schedule','birthday']` (in `relationship.ts` + `z.enum` in
`@vida/core` validators). Reuse `RELATIONSHIP_TYPE`/`INTERACTION_TYPE`/`SENTIMENT`/`CONTACT_EVENT_TYPE` (live) + `FREQUENCY`
(×3) + `PRIORITY` (`common.ts`). The 6 interfaces reconcile (Contact +how_we_met/closeness_tier −tags · Interaction
+energy/key_takeaways · ContactReminder +snooze/priority · ReminderGroup +anchor_type/anchor_days_before · new NetworkGroup

- NetworkGroupContact) → **DB-11** (interface reconcile deferred every group; cited, not done here).

## §4. Physical home & authoring model

- `packages/core/src/db/schema/relationships.ts` — the 8 Drizzle mirrors (query-type only). All 8 `...baseColumns`
  (+ `deleted_at` on `contacts` only); junctions = synthetic `id` PK + `unique(pair)` + reverse index (project_habits v2 shape).
- `packages/core/src/db/migrations/025_relationships.ts` — hand-written SQL DDL (8 CREATE TABLE + 7 indexes: 3 entity + 2
  junction `UNIQUE` + 2 junction reverse), `up()` only, no self-transaction. Registered in `migrations/runner.ts` `ALL_MIGRATIONS`.
- `schema/index.ts` barrel += `export * from './relationships'`.
- `schema/_registry.ts` `ENTITY_TYPES` += `'contact', 'network'`.
- `@vida/types` `relationship.ts` += `REMINDER_GROUP_ANCHOR` (+ Zod in `@vida/core` validators).
- `validators/enum-parity.test.ts` += migration-025 import (both lists) + the 9 FIXED parity rows.
- `db/tests/relationships-introspection.test.ts` (NEW) — mirror #14; PRAGMA vs the 8 Drizzle mirrors (col-set/nullability/pk/defaults).

## §5. Phase-1 completion checklist

- [x] intake §Resolution (WHOLE) + rerun (implemented) + all 5 aspects read; roster = `structure-data.md` authoritative
- [x] §5.9 exact DDL floor read; [E] set (RL-1) + enum vocabs grounded; on-disk verified (6 tables absent from new `schema/`; networks grep-clean)
- [x] scope boundary doc-decided (settled-intent authored / owned-elsewhere out); **zero build-decisions**
- [x] no-FK convention cited (supersedes §5.9 REFERENCES/CASCADE); **no M\*** (C1); tags retired (C-tags); `social_links` kept (C4); no E2 (C2)
- [x] networks authored now (build phase supersedes rerun-C6 schema-0 guard, [[build-phase-flags-mean-resolve-now-not-defer]])

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. **no-FK** — every `*_id` (contact_id ×3, reminder_group_id, both junction pairs) plain TEXT, no `REFERENCES`; cascade/SET-NULL app-layer (RL-2; `current-spec.md` no-FK convention + 12 prior groups). §5.9 REFERENCES = superseded.
2. **`deleted_at` = `contacts` only** — the §5.9 floor gives it to contacts alone; children/ledgers/groups/junctions omit it (RL-2 cascade; the `habit_completions`/`routine_completions` ledger precedent; `reminder_groups`/`network_groups` use `is_active`). Every table matches its FACT-floor analog.
3. **`closeness_tier`** = nullable OPEN `TEXT`, no CHECK — Preferences-defined vocab (`contact.md:31`); an explicit column (onion = user-assigned), not derived.
4. **Networks authored** — `network_groups`(name[E], is_active) + `network_group_contacts`(M:N junction); description→pages; health derived (G2/G3/RL-4/RL-5).
5. **Reminder event-anchor** — net-new `REMINDER_GROUP_ANCHOR{schedule,birthday}` + nullable `anchor_days_before`; DEFAULT `'schedule'` = the pre-existing all-scheduled semantics (backward-faithful, not a manufactured constraint).
6. **Restored G8 fields** — `how_we_met[E]` · `energy_given`/`energy_received`(INT, plaintext) · `key_takeaways[E]` · `is_snoozed`/`snoozed_until`/`priority`(reuse `PRIORITY`).
7. **tags retired** → entity_tags (register `contact`+`network`); **no M\*** on any table (health derived, C1); `social_links` kept (C4).
8. **N1/N2/X1/X8 = cite-not-author** — no notification-delivery columns, no `import_staging` table (Notifications/ADR-014-owned).

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create

`entity_tags`/`parent_tag_id` (AR-6/Spaces). `pages` (notes-via-pages target). `RELATIONSHIP_TYPE`/`INTERACTION_TYPE`/
`SENTIMENT`/`CONTACT_EVENT_TYPE` (`relationship.ts`, DB-9) + `FREQUENCY`/`PRIORITY` (`common.ts`). Notifications delivery +
ADR-014 ingestion substrates (cited, not (re)authored).

### To author — 8 confirmed ABSENT

The 6 §5.9 tables are absent from the new `schema/` (they lived in the pre-ADR-016 monolith); the 2 network tables are
net-new (schema-0, grep-clean).

### `ENTITY_TYPES` diff · Migration slot · `@vida/types`

Append `'contact', 'network'` · migration `025_relationships` (v25; next after 024) · net-new `REMINDER_GROUP_ANCHOR`.

### Baseline verdict

Reconcile-and-extend: append-only (no prior-group edits). Pattern = `finance.ts`/`020_finance.ts`/`finance-introspection.test.ts`.

## Phase 3 — Implementation Plan (gate-1 draft)

### §P3.1 — Exact DDL intent

The 8 CREATE TABLEs per §3a–§3h (all baseColumns [+deleted_at on `contacts`]; junctions = synthetic id + UNIQUE(pair);
FIXED→CHECK; OPEN→plain TEXT; no REFERENCES) + 7 indexes: `idx_contact_events_contact` · `idx_interactions_contact` ·
`idx_interactions_date` · `uq_reminder_group_contacts`(UNIQUE) · `idx_reminder_group_contacts_contact` ·
`uq_network_group_contacts`(UNIQUE) · `idx_network_group_contacts_contact`. Drizzle mirrors match 1:1.

**Nullability — read from the §5.9 source; no-FK strips only `REFERENCES`, not `NOT NULL`; additive columns nullable.**

- **NOT NULL (§5.9 floor):** `contacts.{first_name, relationship_type DEFAULT 'acquaintance', interaction_count DEFAULT 0,
is_favorite DEFAULT 0}` · `contact_events.{contact_id, event_type DEFAULT 'custom', event_date, is_recurring DEFAULT 1}` ·
  `interactions.{contact_id, interaction_type DEFAULT 'in_person', date, follow_up_needed DEFAULT 0}` ·
  `contact_reminders.{contact_id, title, is_recurring DEFAULT 0, is_completed DEFAULT 0}` · `reminder_groups.{name,
is_active DEFAULT 1}` · both junctions' `id` PK + ref pair (`reminder_group_id`/`network_group_id` + `contact_id`) — +
  `created_at`/`updated_at`/`_sync_*` (baseColumns on all 8). All other §5.9 columns nullable.
- **Additive columns — nullable (no default):** `contacts.{how_we_met, closeness_tier}` · `interactions.{energy_given,
energy_received, key_takeaways}` · `contact_reminders.{snoozed_until, priority}` · `reminder_groups.anchor_days_before`.
- **Additive with default (backward-faithful):** `contact_reminders.is_snoozed` NOT NULL DEFAULT 0 (boolean flag, like `is_completed`) ·
  `reminder_groups.anchor_type` NOT NULL DEFAULT 'schedule' (existing rows are all scheduled).
- **Net-new tables:** `network_groups.{name, is_active DEFAULT 1}` NOT NULL; `network_group_contacts` PK pair NOT NULL.

### §P3.2 — Registry & validators

`ENTITY_TYPES += 'contact', 'network'`. `@vida/types`: `REMINDER_GROUP_ANCHOR` tuple + `z.enum` validator; 9 parity rows.

### §P3.3 — Files, migration, tests

`schema/relationships.ts` · `migrations/025_relationships.ts` (+runner `ALL_MIGRATIONS`) · `index.ts` barrel ·
`enum-parity.test.ts` (`migration025Relationships` added to import list + the apply-chain + 9 rows) ·
`relationships-introspection.test.ts` (new; applies `migration025Relationships.up`, self-contained no-FK; 8 tables ×4 assertions).
`boolInt` mirror defaults as `true`/`false` literals (`finance.ts` precedent).

### §P3.4 — DB-11 deferrals (cited, not fixed here)

`@vida/types` interfaces: Contact (+how_we_met/closeness_tier, −tags) · Interaction (+energy_given/energy_received/key_takeaways) ·
ContactReminder (+is_snoozed/snoozed_until/priority) · ReminderGroup (+anchor_type/anchor_days_before) · new `NetworkGroup` +
`NetworkGroupContact`. Interface reconcile = DB-11 (every group defers it).

### §P3.5 — Plan checklist (pre-critique)

- [ ] 8 tables authored SQL + Drizzle mirror parity · [ ] 9 CHECK↔tuple parity rows green · [ ] introspection 8×4 green
- [ ] 1 net-new enum + Zod green · [ ] ENTITY_TYPES +2 · [ ] runner registers 025 · [ ] typecheck/lint 0 · [ ] §XXIX currency

## Phase 4 — Preflight (folds resolved against live code)

- **F1 (shape-correcting) — junction PK.** The §5.9 floor's `reminder_group_contacts` is `SyncMetadata`-only + composite PK;
  the LIVE DB-4 junction convention (`project_habits`:29-30, entity_tags-v2) is **synthetic `id` PK + baseColumns +
  `UNIQUE(pair)` + reverse index**, explicitly reshaping the same-shaped §5.5 composite junction. → **both junctions reshaped**
  (§3f/§3h corrected). Keeps `pk == ['id']` uniform across all 8 in the introspection harness.
- **F2 — enum-parity wiring.** `enum-parity.test.ts`: import `migration025Relationships` + add to the `ddlFor` apply-chain
  (24→25) + 9 FIXTURE rows; import `RELATIONSHIP_TYPE`/`INTERACTION_TYPE`/`SENTIMENT`/`CONTACT_EVENT_TYPE` + net-new
  `REMINDER_GROUP_ANCHOR` (`FREQUENCY`/`PRIORITY` already imported). `extractCheckSet` regex matches multi-line CHECKs
  (`[^)]*` spans newlines — finance precedent) and `stay_in_touch_frequency` ≠ `frequency` collision-free (`\(\s*<col>` anchor).
- **F3 — Zod validator.** Add `ReminderGroupAnchorSchema = z.enum(REMINDER_GROUP_ANCHOR)` to `validators/relationship.ts`
  (the 4 existing relationship schemas live there). `enums.test.ts` is a REPRESENTATIVE spread (finance's `InterestType`/
  `FiscalOwnerType` aren't rows) → no required addition; typecheck guarantees tuple↔schema structural equality.
- **F4 — introspection self-containment.** `migration025Relationships.up(driver)` applies standalone in-memory (no cross-migration
  FK, no-FK convention) → the `finance-introspection` mirror pattern applies verbatim (better-sqlite3 + PRAGMA, 8×4).
- **F5 — grep-clean.** `REMINDER_GROUP_ANCHOR`/`anchor_type` absent from `packages/`; all 8 tables absent from new `schema/`.
- **PREFLIGHT VERDICT: PASSED** (1 shape-correcting fold F1 folded into §3; F2–F5 mechanical, confirmed).
