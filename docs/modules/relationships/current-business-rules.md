# Relationships (CRM) — current business rules

# Durable §XXIX currency doc. Promoted from the per-slice specs as the ① backend is built.

# Module: mod-relationships #56 · LIF-137 · service `createRelationshipsService` over DB-4 025_relationships (8 tables).

> Inherits the CORE constitution (ZK-1/2/3, LF-1/2/3). PII-heaviest module — ZK-1 paramount. Intent authority =
> `docs/features/relationships/{identity,business-rules,contract,structure-data,conventions}.md`.
> **Schema is the floor** — the DB-4
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

## S3 — Events (built · REL-26…29)

- **BR-RL-S3-1 (REL-26)** — `createEvent` over `contact_events` (child, no `deleted_at`); backfills `event_type:'custom'`
  / `is_recurring:true`; `reminder_days` JSON serialize/parse → `EventView`; re-reads; guards a live `contact_id`
  (`ContactNotFoundError`).
- **BR-RL-S3-2 (REL-28)** — `getAllEvents(): EventView[]` — all events (soft-deleted contacts' events were
  cascade-purged), `event_date` asc (lexicographic; `MM-DD` groups before `YYYY-MM-DD`).
- **BR-RL-S3-3 (REL-27)** — `getUpcomingEvents(range): UpcomingEvent[]` (`{event, occurrence}`). Recurring events
  recur on their `MM-DD` (`nextOccurrence` projects to the range's year, wrapping to next year if passed); one-time
  (`is_recurring=false`) use the literal `YYYY-MM-DD`. Included iff `from <= occurrence <= to`; sorted by occurrence.
  Feb-29 projected literally (documented approximation).
- **BR-RL-S3-4 (REL-29, RL-8)** — events occur, never "complete", and S3 **never auto-creates a Task/reminder**. The
  event is read-surfaced for consumers (Calendar, Journal `/summary`, future Tasks) to act on; the spawn mechanism is
  the deferred cross-module Tasks contract (Tasks unbuilt). **Un-homed surface gap (noted, not invented):**
  `updateEvent`/`deleteEvent`/per-contact event read (contract REL-26/27/28 = create + 2 reads; events removed via
  contact cascade).
- **BR-RL-S3-5** — `event_type`(4) validated; `event_date` required (`MM-DD` or `YYYY-MM-DD`).

## S4 — Reminders + groups + dueIn producer (built · REL-30…42)

- **BR-RL-S4-1 (REL-30/31/32)** — `createReminder` (guard live contact; backfill is_recurring/is_completed/is_snoozed
  false; re-read), `completeReminder` (is_completed), `snoozeReminder(id,until)` (is_snoozed + snoozed_until). Unknown →
  `ReminderNotFoundError`. `contact_reminders` has no `deleted_at` (child).
- **BR-RL-S4-2 (REL-39/40/41)** — `createGroup` (days_of_week JSON→`ReminderGroupView`; backfill is_active/anchor_type),
  `addMembers`/`removeMembers` (idempotent over the UNIQUE junction), `setBirthdayAnchor(groupId,daysBefore)`
  (anchor_type='birthday'). Group ops unknown → `ReminderGroupNotFoundError`.
- **BR-RL-S4-3 (REL-34)** — `deleteGroup` hard-deletes the group, **SET NULL** reminder_group_id on member reminders
  (they survive, ungrouped), purges the junction. App-layer, idempotent.
- **BR-RL-S4-4 (REL-33/36 — the R7 dueIn producer)** — `getDueReminders(range: TimeRange): DueItem[]`
  (`{source_module:'relationships', ref_id, label, est_minutes:0, urgency:0, hard_deadline:dueMs}`). Producers:
  (1) explicit reminders (effective-due = snoozed_until if snoozed else reminder_date; skip completed); (2) stay-in-touch
  overdue (next_contact_date <= toISO, the canonical case — overdue carries forward, Notifications dedups firing);
  (3) birthday-anchor groups (birthday − anchor_days_before); (4) daily/weekly schedule groups. Sorted by due asc.
  **⚠ Grounded gap:** biweekly/monthly/quarterly/yearly SCHEDULE groups need a phase-anchor the schema lacks (no
  start_date) → not projected (homed forward: FE/Notifications scheduling or ADR-002 amendment). NOT a manufactured cut.
- **BR-RL-S4-5 (REL-42)** — a group reminder NEVER auto-sends; `getDueReminders` only surfaces (no write/transmit).
- **BR-RL-S4-6 (REL-37/38)** — N2 content-free push + N7 quiet-hours are honored DOWNSTREAM (Notifications NF-6 /
  Preferences; S9 light-honor). The local dueIn `label` may carry the decrypted title/name (on-device consumers).

## S5 — Networks + graph data-prep (built · REL-43…46)

- **BR-RL-S5-1 (REL-43)** — `createNetwork` over `network_groups` (no `deleted_at`, is_active governs lifecycle);
  backfill is_active; re-read.
- **BR-RL-S5-2 (REL-44/45, RL-4)** — `addToNetwork(networkId, contactId)` guards a live network
  (`NetworkNotFoundError`) + live contact (`ContactNotFoundError`), **idempotent** (UNIQUE(network,contact) — skip if
  present). A contact may join MANY networks. `removeFromNetwork` guards the network, removes the junction row.
- **BR-RL-S5-3 (REL-46)** — `getNetworkGraph(): {nodes, edges}` — nodes = active networks (`kind:'network'`) + member
  contacts (`kind:'contact'`); edges = one per membership (`contact → network`). **No contact↔contact edges** (RL-4).
  Edges to inactive/absent networks are dropped (no dangling); member contacts are always live (cascade).
- **BR-RL-S5-4** — `name` required (`[E]`). **Un-homed (noted):** `deleteNetwork` (not in REL-43/44/46); network
  health = REL-47 (S6); network notes/tags = S8.

## S6 — Health engine (derived · REL-22…25, 47) — the build-phase design-pass

- **BR-RL-S6-1 (REL-22/23)** — `getContactHealth(id, asOf?): {band, score, factors, partial?}`. `new` iff
  interaction_count=0 (score null, never overdue). Else: `daysOverdue = max(0, daysBetween(next_contact_date, today))`
  (today = asOf ?? realToday); `weight = closenessWeight(relationship_type, is_favorite)` (onion — family/romantic 2.0 ·
  mentor/mentee/friend 1.5 · colleague/professional 1.0 · acquaintance/other 0.75; +0.5 if favorite; `closeness_tier`
  is OPEN vocab → NOT a weight input, stays display-only); `recentSentiment` = mean of last 5 rated interactions
  (±1/0). **score = clamp(round(100 − daysOverdue·weight·1.5 + recentSentiment·15), 0, 100)**. Band: untracked →
  sentiment-only (never overdue); daysOverdue 0 → healthy (at_risk if neg sentiment); ≤ ceil(7/weight) grace →
  at_risk; else overdue. `factors` exposes the inputs.
- **BR-RL-S6-2 (REL-24)** — a non-finite compute → `{band:'new', score:null, partial:true}` (fail-loud flagged
  partial, never a wrong score as real).
- **BR-RL-S6-3 (REL-47)** — `getNetworkHealth(networkId, asOf?)` rolls up members: band = worst member
  (overdue>at_risk>healthy>new); score = mean of scored members (null if none); memberCount + per-band counts.
- **BR-RL-S6-4 (C1 — load-bearing)** — health is a **pure derived read, NOT an ADR-011 measurement**: no
  `measurement_kind`/`binding_mode`, never advertised to the measurement source registry. `asOf` = determinism seam.
  The formula is a documented, tunable design choice (the UNKNOWN homed to this [F] spec — resolved now).

## S7 — Device import (deny-safe X1/X8 · built · REL-07…11)

- **BR-RL-S7-1 (REL-07/10/11, X1)** — `importDeviceContacts(device?)` is deny-safe: absent port ⇒
  `ContactsPermissionError` (no partial silent import); present port supplies on-device-parsed `RawContact[]` (X1 —
  server-plaintext never exists in this shape, refuse-not-downgrade inherent). Returns STAGING, never auto-commits.
- **BR-RL-S7-2 (REL-08, X8 matcher)** — `stageContacts(incoming, existing)` (pure, exported): per row →
  `parse_error` (no first_name) · `matched` (natural key: case-folded email OR phone OR exact first+last name vs a
  live contact) · `new`. Never overwrites.
- **BR-RL-S7-3 (REL-08, commit-on-confirm)** — `commitContactImport(staged)` writes `new` rows (via the shared
  `createContactImpl`) → `created`; `matched` rows are SKIPPED (existing contact never overwritten — merge is P6/M2)
  → `matched`; `parse_error` → `skipped`. Caller passes the user-reviewed staging.
- **BR-RL-S7-4 (REL-09, X2/X5 — deferred M2)** — the real device bridge, the durable `import_staging` store, and the
  ingestion-guard grant enforcement (X2/X5 via `foundation/ingestion`) wire at M2; M1 = pure pipeline + deny-safe port
  ([[XS security services share a deny-safe-port build shape]]).

## S8 — Tags + pages + links (built · REL-48/49/50)

- **BR-RL-S8-1 (REL-48)** — `tagContact`/`untagContact`/`tagNetwork`/`untagNetwork` delegate ALL tag writes to
  `spaces.tagEntity`/`untagEntity` (read/write split; Spaces owns the junction, idempotent SP1 BR-14).
  Relationships guards the owned entity (`ContactNotFoundError`/`NetworkNotFoundError`); tag-id validation is Spaces'.
  `contact`+`network` are pre-seeded in `ENTITY_TYPES` → no register().
- **BR-RL-S8-2 (REL-49)** — `ensureContactNote`/`ensureNetworkNote` = titled find-or-create standalone `pages` row
  (`type:'note'`, `title`=first_name/name, `entity_type`=contact/network) via `notes.getPagesForEntity` else
  `notes.createPage` (the purposes/projects mechanism, NOT content-seeding `notes.ensureEntityNote`). Idempotent.
- **BR-RL-S8-3 (REL-50) — RATIFY** — `contact` is a valid `entity_links` target (seeded registry + `spaces.createLink`
  validates); the link is written note-side, not a relationships method.
- **Deps grew** (S8): `RelationshipsServiceDeps` += REQUIRED `spaces: SpacesService` + `notes: NotesService`.

## S9 — Fan-out + Journal + seams (built · the ① closer · REL-51/52/53/57, 33/36/38, N7)

- **BR-RL-S9-1 (REL-53)** — `getDayRelationshipsDigest(date)` → `{interactionsToday, eventsToday, remindersDue}`
  (direct counts: interactions on date; events occurring that day via MM-DD match / one-time date; explicit reminders
  effective-due that day, completed excluded). `journal.ts`: `createRelationshipsJournalContribution(svc)` (summary,
  `state:'success'` iff any activity else `'empty'`, TerminalState canon by TYPE) + `registerRelationshipsJournal`.
- **BR-RL-S9-2 (REL-33/36/38)** — `registerRelationshipsDueProvider(sessions, svc)` wires `getDueReminders` (S4) as a
  sessions SS-7 DueProvider lane; Notifications' dispatcher + Calendar read it via `sessions.dueIn`.
- **BR-RL-S9-3 — PULL-only + DueProvider, NO effect-rail PUSH.** Relationships has no measurement (C1) and no economy
  (C2) → it never pushes onto the AR-7 rail. Journal is PULL (registry), due-work is a provider lane.
- **BR-RL-S9-4 (REL-51/52/57/N7 — documented seams)** — follow-ups are Tasks-owned (relationships surfaces the
  `follow_up_*` S2 fields, Tasks consumes); interaction-streak→Gamification deferred (C2, no economy this pass);
  Preferences overrides (reminder defaults / closeness) + N7 quiet-hours are M2 / Notifications-Preferences-owned. No
  M1 relationships code for these.

## ① backend COMPLETE — all 9 slices (S1–S9) · 50 live-store tests · 59 legs REL-01…59.

S6 health engine (derived, NOT a measurement — C1) · S7 device import (deny-safe X1/X8) · S8 tags/pages/links ·
S9 fan-out + Journal `/summary` + deny-safe seams.
