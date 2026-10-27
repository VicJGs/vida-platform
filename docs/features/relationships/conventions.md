<!-- Conventions — features/relationships · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · v1 relationships · intake -->

# Conventions — Relationships (CRM) (level: Feature)

## How to build here

- **PII is always encrypted.** Every identifying field is `[E]`; never log, index, or sync contact PII in
  plaintext (RL-1, ZK-1). `[FACT: ADR-002 §5.9 [E]; ZK-1]`
- **Contact stats are derived, never stored truth.** Recompute `last_interaction_date`/`interaction_count` from
  the interactions ledger and `next_contact_date` from the stay-in-touch cadence on every interaction mutation
  (RL-3). `[INTENT G5]`
- **Health is computed and closeness-weighted — a derived analytic, not a measurable.** Score from frequency-vs-cadence + recent sentiment (+ energy
  fields), weighted by the contact's closeness tier; surface a band (Healthy/At-risk/Overdue); roll up to network
  health. Never persist health as authority (RL-5); and **never model it as an ADR-011 pursuable** — contacts are framework-excluded reference data (no `measurement_kind`/`binding_mode`). `[INTENT G4; ADR-011 M1 exclusion]`
- **Networks are many-to-many; the graph is membership-only.** A contact joins many networks via the junction;
  draw contact→network edges, **never** contact→contact edges (RL-4). `[INTENT G2,G3]`
- **Events occur, tasks complete.** Model a date as a `contact_event` (recurring, MM-DD year-agnostic); to act on
  it, **spawn a Task** (via `contact_id`) — don't make the event a task (RL-8/RL-9). `[INTENT G1,G12]`
- **Reminders are notification producers (N1).** The three mechanisms (RL-6) each produce a notification riding ADR-013's three-tier delivery (`local-scheduled` from the `dueIn` seam); the Reminders page creates, due reminders/events
  render on the global Calendar (parked) + Journal /summary. Notifications is the dispatcher — don't build a bespoke reminder-firing path. `[INTENT G1; ADR-013 N1]`
- **Group reminders never auto-send; the push carries no PII (N2).** `message_template` nudges the _user_; a group may be birthday-anchored for
  important people (RL-7). The off-device wake payload is **content-free** (N2) — the device composes the nudge locally after decrypt. `[INTENT G11; ADR-013 N2]`
- **Import is device-mediated (X1) + reconciled (X8).** Phone-contact import runs on the device (parse/normalize/encrypt on-device); PII never hits the server in plaintext, a server-plaintext path is **refused, not downgraded** (X1); the merge uses `import_staging` — match-against-existing, per-row status, commit on confirm (X8, RL-11). `[INTENT G7; ADR-014 X1/X8]`
- **Notes via `pages`.** Contact + network descriptions are linked `pages` rows (`entity_type` ∈ contact,
  network); only interaction `summary` stays inline (RL-1/G9). `[FACT: ADR-002 §5.2]`
- **Tags via `entity_tags`, nestable.** Use the shared **`entity_tags`** primitive (`entity_type='contact'`, SP1) with `parent_tag_id` nesting (SP3); the universal-vs-module scope is a Notes-&-Pages refinement —
  don't reintroduce an inline per-contact list (RL-10). `[INTENT G10; ADR-006 SP1/SP3]`

## Naming & layout

- Enum values are canonical (string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core`, never TS
  `enum`): `relationship_type`(9), `interaction_type`(8), `sentiment`(positive/neutral/negative),
  `event_type`(birthday/anniversary/holiday/custom), `frequency`(6). `[FACT: relationship.ts L13-36; ADR-002 §5.9]`
- ⚠ INTENDED: `contacts.closeness_tier` (onion tiers, G4); restored `how_we_met`, interaction
  `energy_given`/`energy_received`/`key_takeaways`, reminder `is_snoozed`/`snoozed_until`/`priority` (G8).
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates `YYYY-MM-DD` (events
  may be `MM-DD`), soft delete, `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`

## Local landmines / "never do"

- **Never** store or sync contact PII unencrypted (RL-1). `[FACT: ZK-1]`
- **Never** hand-edit contact stats or health — they derive from the ledger (RL-3/RL-5). `[INTENT G4,G5]`
- **Never** draw contact↔contact edges in the graph — membership only (RL-4). `[INTENT G3]`
- **Never** model a relationship event as a completable task — events trigger tasks, they aren't tasks (RL-8). `[INTENT G1]`
- **Never** auto-send from a reminder group — it reminds the user only (RL-7). `[INTENT G11]`
- **Never** put contact PII (`title`/`message`/`entity_type`/`entity_id`) in an off-device push — the wake payload is content-free (N2); compose on-device after decrypt. `[INTENT; ADR-013 N2]`
- **Never** import contacts via a path the server can read in plaintext — device-mediated, refused-not-downgraded (RL-11, X1, ZK). `[INTENT G7; ADR-014 X1]`
- **Never** model relationship health as an ADR-011 measurable — contacts are excluded reference data; health is derived, never a `measurement_kind` pursuable (RL-5). `[INTENT; ADR-011 M1 exclusion]`
- **Never** reintroduce an inline per-contact tag list — use `entity_tags` (RL-10). `[INTENT G10; ADR-006 SP1]`

## Completion checklist

- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
