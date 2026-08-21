# DB-4 · Domain Group #22 — Notifications ("the System's out-loud voice") · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #22 of 21 active (the FINAL group) · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `032_notifications` (v32) · **Schema file:** `schema/notifications.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** NONE — no `part-1.2-reruns/notifications.md`. The 5 aspect docs + `docs/intake/notifications.md` (RESOLUTION **WHOLE**, Victor 2026-07-19, N1–N7) are the source. **ADR-013** ("Zero-Knowledge Notification Delivery", Accepted 2026-07-19) governs delivery (service, not schema).

> **The dead-last observer leaf** — a **pure sink** (in-degree = everything, out-degree 0). Almost all of it is service /
> ADR-013: the dispatcher (`reminder-engine.ts`, 0 bytes), the two production paths, derived-until-fire reminders, and the
> ZK wake-signal delivery are NOT schema. This unit authors the **1 table** (`notifications`) — the §5.16 FACT floor + the
> RESOLUTION-N4 build-phase AMENDMENTs (`metadata[E]` + a 3-flag delivery-audit). Every shape is doc-determined; **zero
> build-decisions**, consistent with groups #1–#21. **Authoring it COMPLETES DB-4 (21/21) → the M1.0 schema foundation.**

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/notifications/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects) ·
`docs/intake/notifications.md` §RESOLUTION (**WHOLE**, Victor 2026-07-19) · **no rerun** ·
`ADR-002 §5.16` (the 1-table DDL floor, L3472-3503) + `§5.20` (named-not-enumerated → this build IS the amendment) ·
**ADR-013** (ZK delivery — service/transport, NOT schema) · **ADR-012 §3.1** (`surface_notification` = the Additive producer) ·
`packages/types/src/common.ts:80-108` (the **existing** `NOTIFICATION_TYPE` + `Notification` interface — the nullability oracle) ·
`packages/core/src/validators/common.ts:8` (the **existing** `NotificationTypeSchema`) ·
`packages/core/src/db/schema/preferences.ts:69-71` (the channel-triad precedent for the delivery-audit shape).

## §1. Identity — what this unit is
The OS's **alerting layer** — the single place every module's "you should look at this" surfaces. A **pure sink**: it
observes all modules and nothing depends on it. Two production paths (event-driven `surface_notification` Additive effect;
time-driven `dueIn()` dispatcher) land as one row shape. But the v2 surface is **1 table, 0 service logic**; the dispatcher,
derived-reminder model, and ZK wake-signal delivery are INTENDED (service + ADR-013). **This unit's schema footprint = the
`notifications` record.**

### Scope boundary — doc-cited (author vs service vs Preferences)
**AUTHOR (§5.16 floor + the RESOLUTION-N4 build-phase AMENDMENTs):**
- **`notifications`** — the polymorphic inbox row: type + `[E]` content + entity link + read/archive/expire lifecycle +
  delivery-audit + optional `metadata[E]` + sync.

**OUT — service logic (M1.1) / ADR-013 (not schema):**
- The **dispatcher** (`reminder-engine.ts`, NF-2/NF-3) — an on-device loop reading `dueIn()`, gating against Preferences,
  materializing a row at fire time. NOT a table.
- **Derived-until-fire reminders** (NF-3) — upcoming reminders are a derived view over `dueIn()`; **no phantom future rows**.
- **ZK delivery** (NF-6, ADR-013) — content-free wake-signal relay + per-channel fidelity collapse (in-app full · push
  wake-only · email generic · SMS dropped) + on-device compose. Server schema unchanged (opaque-blob relay).
- **Digest/batching** (NF-15, N5) — `notification_frequency` → **Preferences** §5.17 (INTENDED-later), NOT here.

**OUT — owned elsewhere (read via seams, referenced not authored):**
- **Delivery config** (channels · quiet hours · per-module toggles) → **Preferences** `user_preferences` §5.17 (NF-4).
- **"What's coming"** → **Sessions** `dueIn()` (NF-3). **The subject fact** → its own module (`entity_type`/`entity_id`
  link, never copied, NF-10). **Achievement/level state** → Gamification (NF-14).
- **Time-driven convergence** (NF-8, the dispatcher keying a `dueIn` occurrence) → dispatcher **service** (M1.1); no
  doc-named column (may reuse `effect_event_id` as a generic convergence key, its design choice).

### Boundary — what this unit is NOT (doc-cited)
NOT the dispatcher/scheduler (service + Sessions `dueIn`) · NOT the delivery layer (ADR-013) · NOT the Global Calendar ·
NOT a source of truth for any signal (reads via seams) · NOT the delivery-config owner (Preferences) · NOT a phantom-inbox
(derived-until-fire) · NOT a link/tag target (terminal sink, out-degree 0 → no `ENTITY_TYPES` append).

## §2. Business Rules (inherited invariants the shape honors)
- **NF-10 — polymorphic entity link, no inline copy.** `entity_type`/`entity_id` (plaintext structural refs) + `action_url`
  deep-link; never copies the subject beyond the `[E]` title/message the producer supplied. `[FACT: §5.16; INT-1]`
- **NF-11 — Encryption.** `[E]` on user-derived free text: `title`, `message`, `action_label`, **`metadata`** (INTENDED).
  Plaintext structural: `type`, `entity_type`/`entity_id`, `action_url`, read/archive flags, timestamps, **delivery-audit**.
  `[FACT: §5.16 E-marks; NF-11]`
- **NF-12 — six types, fixed for v1.** `type` ∈ {info,success,warning,error,reminder,achievement}; all 22 producers fit —
  no new type. `[FACT: §5.16 CHECK; NF-12]`
- **NF-13 — lifecycle: read → archive → expire → purge.** `is_read`/`read_at` on view; `is_archived`/`archived_at` on
  dismiss; `expires_at` auto-archives; a retention purge (hard delete) reclaims. → **no `deleted_at`** (purge, not soft-delete).
  `[FACT: §5.16 fields; NF-13]`
- **NF-8 — Additive cross-device convergence via UNIQUE `effect_event_id` ON THE ROW.** An event-driven notification is a
  `surface_notification` **Additive** output row (ADR-012 §3.1); per ADR-012 L45/L139 it carries a deterministic
  `effect_event_id` + a **UNIQUE on the output row** — this (NOT the device-local `applied_effects` ledger, `effects.ts:5`)
  is what converges a multi-device collision to one row. Mirrors the live `consequence_ledger` sibling (`economy.ts:46,52`,
  the other `surface_*` Additive row). Nullable: only event rows carry it; a time-driven dispatcher fire has no ADR-012
  effect id (NF-8 keys it by the `dueIn` occurrence — dispatcher service). `[FACT: ADR-012 L45/L139; economy.ts:46,52; effects.ts:5]`
- **NF-9 — local-first, LWW sync.** The row + its `is_read`/`is_archived` state sync as an encrypted blob under LWW/HLC.
  `[FACT: LF-2; ADR-003]`
- **v2 dropped `updated_at`** (intake L22 — v1 had it; v2 keeps only `created_at`; mutation tracked via `read_at`/
  `archived_at`/`_sync_lww_ts`). → **no `updated_at`.** `[FACT: intake L22; §5.16 DDL L3475-3500; interface common.ts:90-108]`

## §3. Intended shape — 1 table (§5.16 floor + N4 AMENDMENTs; nullability = the `common.ts` interface)

### §3a. `notifications` `[FACT: §5.16 L3475-3502; interface common.ts:90-108; AMENDMENTs RESOLUTION N4]`
Bespoke column set — **`id` + fields + `created_at` + `...syncColumns`** (NOT `baseColumns`: no `updated_at`; NO `deleted_at`):

| Column | Drizzle | Null | Source |
|---|---|---|---|
| `id` | `uuidPk()` | NN (pk) | §5.16 |
| `type` | `enumText('type', NOTIFICATION_TYPE)` NN | NN | §5.16 CHECK(6); interface `NotificationType` |
| `title` **[E]** | `text` NN | NN | interface `string` |
| `message` **[E]** | `text` | nullable | interface `string \| null` |
| `action_url` | `text` | nullable | interface `string \| null` |
| `action_label` **[E]** | `text` | nullable | interface `string \| null` |
| `entity_type` | `text` | nullable | interface `string \| null` (OPEN, no CHECK — registry-validated) |
| `entity_id` | `text` | nullable | interface `Id \| null` |
| `is_read` | `boolInt` NN DEFAULT 0 | NN | interface `boolean` |
| `read_at` | `timestampMs` | nullable | interface `Timestamp \| null` |
| `is_archived` | `boolInt` NN DEFAULT 0 | NN | interface `boolean` |
| `archived_at` | `timestampMs` | nullable | interface `Timestamp \| null` |
| `expires_at` | `timestampMs` | nullable | interface `Timestamp \| null` |
| **`delivered_in_app`** | `boolInt` NN DEFAULT 0 | NN | AMENDMENT N4 (delivery-audit, P) |
| **`delivered_push`** | `boolInt` NN DEFAULT 0 | NN | AMENDMENT N4 |
| **`delivered_email`** | `boolInt` NN DEFAULT 0 | NN | AMENDMENT N4 |
| **`metadata`** **[E]** | `text` | nullable | AMENDMENT N4 (optional entity payload JSON) |
| **`effect_event_id`** | `text` | nullable | **ADR-012 L45/L139** — the Additive cross-device convergence key (event rows only; time-driven = NULL); plaintext structural |
| `created_at` | `timestampMs` NN | NN | §5.16; interface `Timestamp` |
| `_sync_*` ×6 | `...syncColumns` | per `_shared` | §5.16; NF-9 |

- **`UNIQUE(effect_event_id)`** (`uq_notifications_event`) — ADR-012 L45/L139 "UNIQUE `effect_event_id` on the output row";
  the `consequence_ledger` sibling pattern (`economy.ts:52`). Plain single-column UNIQUE (not the composite — surface_notification's
  effect_type is constant, no target_ref subdivision on the floor). **SQLite treats NULLs as distinct**, so the many time-driven
  (NULL) rows are unconstrained while event rows converge on their id — no partial index needed. Authored in SQL + the Drizzle mirror.
- **Partial index** `idx_notifications_unread ON notifications(is_read) WHERE is_archived = 0` — **SQL-migration-only** (the
  `idx_pages_journal_unique` NP-2 partial-index precedent, `notes.ts:65`; not expressible/kept in the Drizzle mirror).
- **delivery-audit = 3 boolean flags** (`delivered_in_app`/`delivered_push`/`delivered_email`) — grounded on the
  structure-data's primary phrasing + the Preferences channel-triad (`notification_{email,push,in_app}`, `preferences.ts:69-71`;
  the canonical channel representation, SMS dropped). Default `0` (nothing fired yet), vs Preferences' default `1` (channels
  on). **No `delivered_channels` JSON set** (the doc-offered alternative diverges from the live triad convention).
- No cross-table FK. **`effect_event_id`** present (nullable + UNIQUE, ADR-012 — the Additive convergence key). No
  `updated_at`, no `deleted_at`.

## §4. Physical home & authoring model
- `packages/core/src/db/schema/notifications.ts` (NEW) — 1 Drizzle mirror. Hand-composed `{ id: uuidPk(), …fields,
  created_at: timestampMs('created_at').notNull(), ...syncColumns }`. No `baseColumns`, no `updated_at`, no `deleted_at`.
  The partial index is NOT in the mirror (SQL-only).
- `packages/core/src/db/migrations/032_notifications.ts` (NEW) — hand-written SQL DDL (1 CREATE TABLE + 1 CHECK + 1 partial
  INDEX), `up()` only, no self-transaction. Registered in `migrations/runner.ts` `ALL_MIGRATIONS`.
- `schema/index.ts` barrel += `export * from './notifications'`.
- `validators/enum-parity.test.ts` — append `migration032Notifications.up(driver)` to the `ddlFor` chain + import
  `NOTIFICATION_TYPE` + **1 parity row** (`notifications.type` → `NOTIFICATION_TYPE`).
- `db/tests/notifications-introspection.test.ts` (NEW) — apply 032 in-memory (PRAGMA), diff the table vs the mirror on
  col-set/nullability/pk/defaults + guards (no `updated_at`/`deleted_at`; partial index `idx_notifications_unread` exists).

**NOT edited (doc-cited):** no `_registry.ts` `ENTITY_TYPES` append (terminal sink — not a polymorphic target; absent from
`note.ts` ENTITY_LINK_TARGET + `_registry`, correct); no new `@vida/types` enum/validator (`NOTIFICATION_TYPE` +
`NotificationTypeSchema` exist — the `Notification` interface reconcile [add metadata/delivery-audit + sync] → DB-11); no
ADR-002 §5-body edit (named-not-enumerated §5.20; stale-source rule).

## §5. Phase-1 completion checklist
- [x] all 5 aspects + intake §RESOLUTION (WHOLE, N1–N7) read; roster = §5.16 floor + N4 AMENDMENTs; no rerun
- [x] dispatcher/delivery/ZK-wake confirmed **service + ADR-013** (not schema); `notification_frequency` → Preferences (N5)
- [x] colocation confirmed & handled: `NOTIFICATION_TYPE` + `Notification` + `NotificationTypeSchema` exist → reconcile-and-extend, zero net-new types
- [x] no `updated_at` (v2 dropped it, FACT) · no `deleted_at` (purge lifecycle NF-13) · **`effect_event_id` nullable + UNIQUE** (ADR-012 L45/L139 Additive convergence — gate-1 catch; `applied_effects` is device-local)
- [x] nullability = the `common.ts` interface (oracle); 1 FIXED CHECK reuse existing tuple; delivery-audit = 3-flag (Preferences-triad grounded) — **zero build-decisions**

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)
1. **1 table = §5.16 floor + N4 AMENDMENTs** (`metadata[E]` + 3 delivery-audit flags). Dispatcher/delivery = service + ADR-013.
2. **Bespoke shape: `id + fields + created_at + syncColumns`** — NO `updated_at` (v2 dropped it, intake L22 + interface
   confirms); NO `deleted_at` (read→archive→expire→purge, NF-13). Not `baseColumns`.
3. **Nullability = the `common.ts:90` interface** (the $inferSelect oracle): title NN, is_read/is_archived NN (default 0),
   created_at NN, type NN; message/action_url/action_label/entity_*/read_at/archived_at/expires_at nullable.
4. **delivery-audit** — the docs offered an either-or (structure-data L19: "flags … **or** a small `delivered_channels` set");
   resolved to **3 boolean flags** (`delivered_in_app`/`delivered_push`/`delivered_email`, NN default 0) via the live
   Preferences channel-triad precedent (`preferences.ts:69-71`) + the structure-data's primary phrasing — a precedent-grounded
   resolution of a doc-offered alternative, not a free pick. `metadata[E]` nullable. Both P/[E] per NF-11.
5. **`effect_event_id` present** (nullable + UNIQUE) — **ADR-012 L45/L139** mandate a UNIQUE `effect_event_id` on the
   `surface_notification` Additive output row for cross-device convergence (the `applied_effects` ledger is device-local,
   `effects.ts:5` — it cannot converge across devices); the `consequence_ledger` sibling carries it (`economy.ts:46,52`).
   Nullable (event rows only; time-driven = NULL, SQLite NULLs distinct). **No `ENTITY_TYPES` append** (terminal sink).
   Partial index SQL-only (NP-2 precedent).
6. **No new enum/validator** (`NOTIFICATION_TYPE`/`NotificationTypeSchema` exist); interface reconcile → DB-11. **No ADR-002
   §5-body edit.**

## Phase 2 — Current-state read (reconcile-and-extend baseline)
### Already authored — DO NOT re-create / reference only
- `@vida/types`: `NOTIFICATION_TYPE` + `Notification` interface (`common.ts:80-108`); `NotificationTypeSchema`
  (`validators/common.ts:8`).
- Preferences delivery-config: `user_preferences.notification_{email,push,in_app}` + quiet-hours + per-module toggles
  (`preferences.ts:69-71`) — the config Notifications READS (NF-4).
- DB-3 substrate: `applied_effects` (AR-7 **device-local** replay-dedup ledger, `effects.ts:5` — NOT cross-device; the
  cross-device convergence is the row's own UNIQUE `effect_event_id`, ADR-012). `consequence_ledger` (the sibling Additive
  output row carrying `effect_event_id` + UNIQUE, `economy.ts:46,52`).

### To author — 1 table + 1 parity row
`notifications` (`schema/notifications.ts`) + `032_notifications.ts` (absent, grep-clean); enum-parity +1 row. **No
`@vida/types`/`_registry` edit** (reconcile-and-extend; interface reconcile → DB-11).

### Baseline verdict
Reconcile-and-extend, **append-only at the types layer**: `NOTIFICATION_TYPE`/`Notification`/`NotificationTypeSchema` used
as-is; the `schema/`/migration/parity layers are clean-add. Pattern = `journals.ts`/`030_journals.ts` (a reduced-column
single table), with the `type` CHECK + partial index of `check-ins`.

## Phase 3 — Implementation Plan (gate-1 draft)
### §P3.1 — Exact DDL intent (`032_notifications.ts`)
1 CREATE TABLE per §3a (bespoke tail: `created_at INTEGER NOT NULL` + 6 `_sync_*`, no `updated_at`) + `type` CHECK(6) +
the 3 delivery-audit flags + `metadata` + **`effect_event_id TEXT` (nullable)** + **`UNIQUE(effect_event_id)`** + 1 partial
INDEX `idx_notifications_unread(is_read) WHERE is_archived = 0`. `up()` only, no self-transaction. Drizzle mirror matches 1:1
(`boolInt` defaults mirror as `false`; `unique().on(effect_event_id)` IS in the mirror; the partial index is SQL-only, NOT in
the mirror). No CHECK beyond `type`; no FK.

### §P3.2 — Registry & validators
**None.** No `ENTITY_TYPES` append (terminal sink). No new validator (`NotificationTypeSchema` exists). 1 parity row imports
the existing `NOTIFICATION_TYPE`.

### §P3.3 — Files, migration, tests
`schema/notifications.ts` (NEW) · `migrations/032_notifications.ts` (NEW, +runner) · `index.ts` barrel ·
`enum-parity.test.ts` (apply-chain +032 + import + 1 row) · `notifications-introspection.test.ts` (NEW; 1 table ×4 + guards).
`pnpm typecheck` 0 · `@vida/core` green · eslint 0.

### §P3.4 — DB-11 deferrals (cited, not fixed here)
`Notification` interface reconcile (add `metadata`/`delivered_*` + the sync fields — the interface today omits them) →
**DB-11**. The introspection diffs SQL vs the Drizzle mirror (the oracle where the interface lags).

### §P3.5 — Plan checklist (pre-critique)
- [ ] `notifications` authored SQL + Drizzle mirror parity (col-set/nullability/pk/defaults) · [ ] 1 CHECK↔tuple parity row green
- [ ] partial index authored (SQL-only) + introspection index guard · [ ] no updated_at/deleted_at guards · [ ] runner registers 032 (v32) · [ ] index.ts barrel · [ ] typecheck/lint 0 · [ ] §XXIX currency (BR-NF-*)

## §4-Acceptance (Definition of Done)
- `notifications` exists with EXACTLY the §3a columns (§5.16 floor + 3 delivery-audit flags + metadata); nullability/pk/
  defaults match the Drizzle mirror (introspection green); partial index `idx_notifications_unread` present.
- `effect_event_id` present (nullable + `UNIQUE`, ADR-012 L45/L139). No `updated_at`, no `deleted_at`, no `ENTITY_TYPES`
  append, no new `@vida/types` enum/validator, no ADR-002 §5-body edit.
- Migration 032 applies clean (runner v32); `LATEST_VERSION === 32`. 1 enum-parity row green.
- `pnpm typecheck` 0 · `@vida/core` full suite green · eslint 0.
- §XXIX: `database-layer` current-spec + current-business-rules promoted (BR-NF-1…n); **DB-4 marked 21/21 COMPLETE → M1.0
  schema foundation done**; commit-together.
