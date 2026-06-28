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
- **RL-5 — Relationship health is derived, closeness-weighted (⚠ INTENDED inputs).** Health = f(time since last
  interaction vs cadence, recent sentiment, optional energy_given/received) **weighted by the contact's closeness
  tier** ("onion": inner tiers penalize neglect more). Bands: Healthy / At-risk / Overdue. Network health = the
  aggregate of its members' health. Never stored as truth — recomputed. `[INTENT G4,G8]`
- **RL-6 — Three reminder mechanisms, distinct purposes.** (a) per-contact **stay-in-touch cadence** →
  auto "overdue to reach out"; (b) explicit **`contact_reminders`** (one-off/recurring per person, optional —
  the user decides if one is needed); (c) **`reminder_groups`** → batch nudge to a network/list/individual.
  `[INTENT G6,G11]`
- **RL-7 — Group reminders never auto-send; may be event-anchored (⚠ INTENDED).** A `reminder_group`'s
  `message_template` reminds the **user** to act — it never sends a message. A group may target **important
  people** (closeness) and fire **relative to each member's birthday** (`contact_events`), not only a fixed
  schedule. `[INTENT G11]`
- **RL-8 — Events occur, they don't complete; they spawn.** A `contact_event` is time-anchored (recurring,
  year-agnostic via MM-DD) and is never "completed" — it can **trigger** tasks/reminders (birthday → present
  task + nudge). `[INTENT G1; FACT: L2247-2250]`
- **RL-9 — Follow-ups are Tasks.** `interaction.follow_up_needed`/`follow_up_date` surface a follow-up; an
  actual to-do is a **Task** linked via `contact_id`, owned by Tasks (§6 integration point). `[INTENT G12; FACT:
  CLAUDE.md §3]`
- **RL-10 — Shared, scoped tags.** Contact tags resolve to the shared vocabulary; a tag carries a **scope**
  (module-specific vs universal). `[INTENT G10]`
- **RL-11 — Device import is device-side only.** Importing phone contacts happens on the device; PII never
  transits the server in plaintext (ZK-1). `[INTENT G7; FACT: ZK-1]`
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
| Device import | reading device | "no contacts found / permission denied" | import error → per-row flags | matched + merged, no dupes |
| Health compute | computing | "new contact — no data" | compute error → flag partial | banded score (Healthy/At-risk/Overdue) |

## Failure behavior (fail loud — constitution §5)
- A failed save/import/log reverts optimistic state with a typed error — never silent loss of a person's data.
  `[INTENT G7; FACT §5]`
- A health/stat compute error shows a **flagged partial**, never a wrong score presented as real. `[INTENT G4,G5]`
- An import requiring server-side plaintext is refused, not downgraded (RL-11, ZK). `[INTENT G7; FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**INTENDED**, not in ADR-002 §5.9 / `relationship.ts` today:
- **RL-4/RL-5 networks:** `network_groups` + `network_group_contacts` tables → ADR-002 amendment.
- **RL-5 closeness tier:** a `contacts.closeness_tier` (or derived from `relationship_type`+`is_favorite`) for
  health weighting.
- **G8 restored fields:** `contacts.how_we_met`; `interactions.energy_given`/`energy_received`/`key_takeaways`;
  `contact_reminders` snooze (`is_snoozed`/`snoozed_until`) + `priority`.
- **RL-7 event-anchored group reminders** (fire relative to a member's birthday).
- **RL-10 tag scoping** (universal vs module — a Notes & Pages tag-system refinement).
- **RL-9/G12 Gamification** interaction streaks.
Until amended, the live invariants are RL-1, RL-2 (6 tables), RL-3, RL-6 (a/b/c minus event-anchor), RL-8, RL-12.
All schema additions converge into the **ADR-002 amendment**. `[FACT: ADR-002 §5.9; INTENT G2–G12]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
