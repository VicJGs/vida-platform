<!-- Business Rules — features/relationships · /documentation Phase 2 · sources: ADR-002 §5.9 · relationship.ts · CLAUDE.md §6 · intake -->

# Business Rules — Relationships (CRM)  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3. Relationships holds heavy
> **PII**, so ZK-1 is paramount. Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **RL-1 — Encrypted PII.** All identifying contact fields (`first_name`, `last_name`, `nickname`, `email`,
  `phone`, `avatar_url`, `company`, `job_title`, `location`, `birthday`, `tags`, `social_links`) and free text
  (`summary`, `follow_up_notes`, event `title`/`description`, reminder `title`, group `name`/`message_template`)
  are `[E]` (ZK-1). Plaintext config: the `*_type`/`sentiment`/`frequency` enums, dates, flags, counts. `[FACT:
  ADR-002 §5.9 [E] marks; relationship.ts @encrypted]`
- **RL-2 — Cascade from the contact.** Deleting a contact **cascades** its `contact_events`, `interactions`,
  `contact_reminders`, and `reminder_group_contacts` / `network_group_contacts` rows; soft delete (`deleted_at`)
  hides without destroying. `[FACT: ADR-002 L2244,2272,2305,2354; INTENT G2]`
- **RL-3 — Denormalized contact stats derive from the interactions ledger.** `last_interaction_date` and
  `interaction_count` recompute from `interactions`; `next_contact_date` = `last_interaction_date` +
  `stay_in_touch_frequency`/`stay_in_touch_days`. The columns are a cache; the ledger is truth. `[INTENT G5; FACT:
  L2219-2221]`
- **RL-4 — A contact may belong to many networks (⚠ INTENDED).** Membership is many-to-many via
  `network_group_contacts`; the neural graph draws each contact node linked to its network node(s) — **no
  contact↔contact edges**. `[INTENT G2,G3]`
- **RL-5 — Relationship health is derived, closeness-weighted (⚠ INTENDED inputs) — NOT a measurable.** Health = f(time since last
  interaction vs cadence, recent sentiment, optional energy_given/received) **weighted by the contact's closeness
  tier** ("onion": inner tiers penalize neglect more). Bands: Healthy / At-risk / Overdue. Network health = the
  aggregate of its members' health. Never stored as truth — recomputed. It is a **derived internal analytic, not an ADR-011 pursuable**: contacts are framework-excluded reference data — health carries **no** `measurement_kind`/`binding_mode`, and is not advertised as an M5 source. `[INTENT G4,G8; ADR-011 M1 exclusion]`
- **RL-6 — Three reminder mechanisms, distinct purposes — each a notification producer (N1).** (a) per-contact **stay-in-touch cadence** →
  auto "overdue to reach out"; (b) explicit **`contact_reminders`** (one-off/recurring per person, optional —
  the user decides if one is needed); (c) **`reminder_groups`** → batch nudge to a network/list/individual.
  Each produces a **notification** riding ADR-013's three-tier delivery (**N1**): the "reach out before it goes cold" nudge is the canonical `local-scheduled` case, read from the **`dueIn`** seam (R7, `getDueReminders`); Notifications is the dispatcher (Relationships is a producer). `[INTENT G6,G11; ADR-013 N1; R7]`
- **RL-7 — Group reminders never auto-send; the wake payload is content-free (N2); may be event-anchored (⚠ INTENDED).** A `reminder_group`'s
  `message_template` reminds the **user** to act — it never sends a message. And no contact **PII ever leaves in an off-device push**: the wake payload carries **no** `title`/`message`/`entity_type`/`entity_id` (**N2**); the device syncs, decrypts, and composes the nudge locally — the platform's most PII-critical use of N2 (reinforces RL-1). A group may target **important
  people** (closeness) and fire **relative to each member's birthday** (`contact_events`), not only a fixed
  schedule. `[INTENT G11; ADR-013 N2; ZK-1]`
- **RL-8 — Events occur, they don't complete; they spawn.** A `contact_event` is time-anchored (recurring,
  year-agnostic via MM-DD) and is never "completed" — it can **trigger** tasks/reminders (birthday → present
  task + nudge). `[INTENT G1; FACT: L2247-2250]`
- **RL-9 — Follow-ups are Tasks.** `interaction.follow_up_needed`/`follow_up_date` surface a follow-up; an
  actual to-do is a **Task** linked via `contact_id`, owned by Tasks (§6 integration point). `[INTENT G12; FACT:
  CLAUDE.md §3]`
- **RL-10 — Shared tags via `entity_tags`, nestable.** Contact tags resolve to the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`, SP1; `entity_type='contact'`), with nesting via **`parent_tag_id`** (SP3), not the inline `contacts.tags` JSON (As-is floor). The "universal-vs-module scope" refinement is a Notes-&-Pages concern (cited, not owned here). `[INTENT G10; ADR-006 SP1/SP3]`
- **RL-11 — Device import is device-mediated (X1).** Importing phone contacts is **X1** device-mediated: the device parses/normalizes on-device, encrypts (R3), writes vault rows; PII never
  transits the server in plaintext, and a **server-plaintext path is refused, not downgraded** (ZK-1). The merge uses **`import_staging`** (X8 — match against existing contacts, per-row status, commit on user confirm, never a silent overwrite); the connector is classified by X2 and gated by `external_in_ok` (X5). `[INTENT G7; ADR-014 X1/X8/X2/X5; FACT: ZK-1]`
- **RL-12 — Local-first.** Every create/edit/log/import succeeds locally first; multi-device reconciles LWW on
  structured columns. `[FACT: LF-2; ADR-003]`

## Validation & edge cases
- Enum CHECKs `[FACT: ADR-002 §5.9]`: `relationship_type`(9), `interaction_type`(8), `sentiment`(3),
  `event_type`(4), `frequency`(6).
- An event `event_date` may be `MM-DD` (year-agnostic recurring) or full `YYYY-MM-DD` (RL-8). `[FACT: L2247]`
- A `contact_reminder.reminder_group_id` is **SET NULL** if its group is deleted (the reminder survives,
  ungrouped). `[FACT: L2306]`
- A contact with no interactions has health = "unknown/new", not "overdue" (RL-5 needs a baseline). `[INTERP RL-5]`
- `stay_in_touch_frequency` null → contact is not tracked for "overdue"; appears only on explicit reminders/events
  (RL-3/RL-6). `[INTERP RL-3]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| All-Contacts / Dashboard | skeleton | "no contacts" + add/import CTA | typed read error, retry | grouped contacts + health badges |
| Neural graph | building graph | "no networks yet" | graph build error → list fallback | Sigma.js network⇄contact graph |
| Contact standalone | skeleton | "no interactions/events yet" | typed error, retry | info + timeline + events + health |
| Log interaction | — | — | validation (bad enum) inline | persisted; stats + health recomputed |
| Create reminder/event | — | — | save fails → revert, typed toast | persisted (viewed on Calendar) |
| Network standalone | skeleton | "no members" + add CTA | typed error, retry | members + aggregate health |
| Device import (X1 device-mediated; X8 `import_staging`) | reading device | "no contacts found / permission denied" | import error → per-row flags (staging status) | matched + merged, no dupes (commit on confirm) |
| Health compute | computing | "new contact — no data" | compute error → flag partial | banded score (Healthy/At-risk/Overdue) |

## Failure behavior (fail loud — constitution §5)
- A failed save/import/log reverts optimistic state with a typed error — never silent loss of a person's data.
  `[INTENT G7; FACT §5]`
- A health/stat compute error shows a **flagged partial**, never a wrong score presented as real. `[INTENT G4,G5]`
- An import requiring server-side plaintext is refused, not downgraded (RL-11, ADR-014 X1, ZK). `[INTENT G7; ADR-014 X1; FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**INTENDED**, not in ADR-002 §5.9 / `relationship.ts` today:
- **RL-4/RL-5 networks:** `network_groups` + `network_group_contacts` tables → ADR-002 amendment.
- **RL-5 closeness tier:** a `contacts.closeness_tier` (or derived from `relationship_type`+`is_favorite`) for
  health weighting.
- **G8 restored fields:** `contacts.how_we_met`; `interactions.energy_given`/`energy_received`/`key_takeaways`;
  `contact_reminders` snooze (`is_snoozed`/`snoozed_until`) + `priority`.
- **RL-7 event-anchored group reminders** (fire relative to a member's birthday).
- **RL-10 tag migration** — inline `contacts.tags` → `entity_tags` (SP1) + `parent_tag_id` (SP3); the universal-vs-module scope is a Notes & Pages tag-system refinement.
- **RL-9/G12 Gamification** interaction streaks (012 is **not** a driver of this re-run — kept as the existing `[INTENT]` edge, no economy contract added).
- **RL-6/RL-7 notification delivery** (ADR-013 N1/N2) + **RL-11 device-import ingestion** (ADR-014 X1/X8) are `[INTENT]` naming contracts — the mechanisms are Notifications-/ADR-014-owned (cite-not-re-spec).
Until amended, the live invariants are RL-1, RL-2 (6 tables), RL-3, RL-6 (a/b/c minus event-anchor), RL-8, RL-12.
All schema additions converge into the **ADR-002 amendment**. `[FACT: ADR-002 §5.9; INTENT G2–G12; ADR-006/013/014]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
