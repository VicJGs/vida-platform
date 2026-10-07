# Relationships (CRM) — current business rules
# Durable §XXIX currency doc. Promoted from the per-slice specs as the ① backend is built.
# Module: mod-relationships #56 · LIF-137 · service `createRelationshipsService` over DB-4 025_relationships (8 tables).

> Inherits the CORE constitution (ZK-1/2/3, LF-1/2/3). PII-heaviest module — ZK-1 paramount. Intent authority =
> `docs/features/relationships/{identity,business-rules,contract,structure-data,conventions}.md`; leg roster =
> `docs/specs/foundation/backend-intent/parts/relationships.md` (REL-01…59). **Schema is the floor** — the DB-4
> authoring (`025_relationships`) resolved the aspect docs' "⚠ INTENDED / ADR-002-amendment" delta: networks,
> `closeness_tier`, snooze/priority, event-anchor, G8 fields are all LIVE columns.

## S1 — Contact spine (built · REL-01…06, REL-17, REL-54, REL-55, REL-58)
- **BR-RL-S1-1** — contact CRUD: `createContact`/`updateContact`/`listContacts`/`getContact`/`toggleFavorite` over the
  `contacts` repo. `createContact` backfills the NN-default columns (`relationship_type:'acquaintance'`,
  `interaction_count:0`, `is_favorite:false`) and **re-reads** after insert → a faithful `ContactView` (all nullable
  PII cols authoritative, not the undefined-echoed input row; Repository.create echoes input).
- **BR-RL-S1-2 (RL-2)** — `softDeleteContact` sets `contacts.deleted_at` (soft; still syncs) AND **app-layer
  hard-cascades** all 5 children keyed on `contact_id` (`contact_events`, `interactions`, `contact_reminders`,
  `reminder_group_contacts`, `network_group_contacts`) — no-FK convention; children carry no `deleted_at` so they
  hard-delete. `reminder_groups`/`network_groups` are NOT children → untouched. Cascade is defensive + idempotent
  (two transactions, eventually-consistent/re-drivable, IR-13); missing/already-deleted contact ⇒ no-op.
- **BR-RL-S1-3 (RL-17)** — enum inputs validated via canonical Zod (`RelationshipTypeSchema`, `FrequencySchema`)
  before the write; bad enum ⇒ async rejection. `CreateContactSchema` requires ONLY `first_name` (schema notNull
  floor); `closeness_tier` is OPEN vocab (`z.string().nullable()`, no CHECK/enum — Preferences-defined, G4).
- **BR-RL-S1-3b** — `updateContact`/`toggleFavorite` reject a missing OR soft-deleted contact with
  `ContactNotFoundError` (soft-delete-aware `getContact` guard before `repo.update`; never resurrect-edit a deleted
  person — PII integrity). The repo's generic `Row not found` Error never leaks.
- **BR-RL-S1-4 (RL-1/C4)** — `social_links` is a typed-JSON `[E]` field `{linkedin?,twitter?,instagram?,whatsapp?}`
  that STAYS (never retired to tags). `text()` column; M1.0 `[E]=[]` ⇒ the service owns the serialize/parse boundary
  (`JSON.stringify` on write, parse on read). Reads return a `ContactView` (= `ContactRow` with `social_links`
  parsed), NOT the raw Drizzle Row.
- **BR-RL-S1-5 (RL-1/ZK-1)** — all PII fields are `[E]`-marked; **M1.0 `encryptedFields:[]`** (pass-through seam;
  real field encryption = M3). `softDelete:true` on `contacts` only; child/junction repos hard-delete.
- **BR-RL-S1-6 (RL-12)** — every write succeeds locally first; the repo's co-transactional `sync_queue` enqueue
  carries LWW sync.
- **BR-RL-S1-7 (DB-11)** — `@vida/types/relationship.ts` reconciled to the schema floor: dropped phantom
  `Contact.tags` (retired → `entity_tags`, 0 code consumers); added `how_we_met`/`closeness_tier` (Contact),
  `energy_given`/`energy_received`/`key_takeaways` (Interaction), `is_snoozed`/`snoozed_until`/`priority`
  (ContactReminder), `anchor_type`/`anchor_days_before` (ReminderGroup), and `NetworkGroup`/`NetworkGroupContact`.

## S2 — Interactions ledger + derived contact stats (built · REL-12…16, REL-19/20/21)
- **BR-RL-S2-1** — `logInteraction`/`updateInteraction`/`deleteInteraction`/`getTimeline` over the `interactions`
  ledger (no `deleted_at` → `deleteInteraction` is hard-delete). `getTimeline` = contact's interactions, `date` desc
  (`created_at` desc tiebreak). `logInteraction` backfills `interaction_type`('in_person')/`follow_up_needed`(false)
  NN-defaults + re-reads for a faithful row.
- **BR-RL-S2-2** — `logInteraction` guards a live contact (`ContactNotFoundError` on missing/soft-deleted); an
  interaction never dangles off a non-live contact.
- **BR-RL-S2-3** — `updateInteraction`/`deleteInteraction` on an unknown id → `InteractionNotFoundError`. `contact_id`
  is NOT patchable (an interaction never migrates contacts).
- **BR-RL-S2-4 (RL-3, the derivation)** — every interaction mutation calls `recomputeContactStats(contactId)` (pure
  over the ledger, never hand-maintained): `interaction_count`=COUNT; `last_interaction_date`=MAX `date`;
  `next_contact_date`=`last + cadenceDays` where `cadenceDays = stay_in_touch_days ?? frequencyToDays(frequency)`
  (daily1/weekly7/biweekly14/monthly30/quarterly90/yearly365; `stay_in_touch_days` is the exact override, takes
  precedence). null `last` OR null `cadenceDays` ⇒ `next_contact_date` null (REL-21, a contact with no cadence is not
  tracked for overdue). Empties to count0/null-dates when the last interaction is deleted. `addDaysISO` is UTC-day-safe.
  Null-guards a vanished contact (defensive no-op). Persisted via `contactsRepo.update` (patch — `social_links` untouched).
- **BR-RL-S2-5** — `interaction_type`(8)/`sentiment`(3) validated via canonical Zod; `date` required `YYYY-MM-DD`.
- **BR-RL-S2-6** — health recompute (contract "stats + health") is **S6** (derived health engine); S2 does STATS only.

## Forward slices (not yet built)
S3 events · S4 reminders + groups + `dueIn` seam · S5 networks + graph data-prep ·
S6 health engine (derived, NOT a measurement — C1) · S7 device import (deny-safe X1/X8) · S8 tags/pages/links ·
S9 fan-out + Journal `/summary` + deny-safe seams.
