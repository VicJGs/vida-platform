<!-- Identity — features/relationships · /documentation Phase 2 · sources: ADR-002 §5.9 · @vida/types/relationship.ts · CLAUDE.md §6 · docs/intake/relationships.md -->

# Identity — Relationships (CRM) (level: Feature)

**What it is.** A **personal CRM** for the user's whole social world: people with full contact details, a logged
**interaction history**, important **events**, **reminders** to stay in touch, **networks** of people, an
Obsidian-style **neural graph**, and a derived **relationship-health** signal — all encrypted, all local-first.
`[FACT: CLAUDE.md §6; ADR-002 §5.9]`

**The desire behind it.** The user wants to **be intentional about his relationships** — never let an important
person drift, remember birthdays and what matters to each one, see how his networks connect, and get nudged to
reach out _before_ a relationship goes cold — with all of that PII kept private (zero-knowledge). The "reach-out"
nudge is a **notification** riding ADR-013's three-tier delivery (N1 — a `local-scheduled` nudge from the `dueIn`
seam); Notifications is the dispatcher. `[INTENT: Victor 2026-06-28; ADR-013 N1]`

**Scope — full v1 + deliberate expansions.** `[INTENT G1–G12]`

- Owns **6 tables**: `contacts`, `contact_events`, `interactions`, `contact_reminders`, `reminder_groups`,
  `reminder_group_contacts`. `[FACT: ADR-002 §5.9]`
- **Networks (⚠ INTENDED schema, G2):** `network_groups` + `network_group_contacts` — a contact may belong to
  **many** networks; each network gets a standalone page + derived health.
- **Neural graph (G3):** contact↔**network membership** edges (each contact node links to its network node[s]);
  no contact↔contact edges. Rendered with Sigma.js (WebGL). `[FACT: ADR-001 Sigma.js]`
- **Relationship health (G4, derived):** from interaction frequency vs the contact's stay-in-touch cadence +
  recent sentiment, **weighted by closeness** ("onion" tier). Rolls up into network health.
- **Views (G1):** user-chosen default among Dashboard · Graph · grouped All-Contacts; plus Contact standalone
  page · Network standalone page · a Reminders page **for creating** reminders. Reminders/events are **viewed on
  the global Calendar** (a parked platform surface), not inside this module.

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules]`

- **Not the calendar/agenda.** Relationships _creates_ reminders + owns events, but the cross-module **viewing**
  of them lives on the global **Calendar** page (platform-level, parked) and in Journal /summary. `[INTENT G1]`
- **Not a tasks tool.** A follow-up is a **Task** (linked via `contact_id`); an **event** triggers tasks/
  reminders but is never a task itself (events occur, tasks complete). `[INTENT; FACT: CLAUDE.md §3]`
- **Not a notes store.** Contact/network descriptions are `pages` rows (`entity_type` ∈ contact, network); only
  an interaction's short `summary` is inline. `[FACT: ADR-002 §5.2; INTENT G9]`
- **Not its own tag vocabulary.** Contacts tag through the shared **`entity_tags`** primitive (`tag_id, entity_type, entity_id`, ADR-006 SP1), registering `entity_type='contact'` (SP2); nesting via `parent_tag_id` (SP3). The inline `contacts.tags` JSON is the **As-is** floor, retired in `[INTENT]`. The "universal-vs-module tag scope" refinement is a Notes & Pages concern (cited, not decided here). `[INTENT G10; ADR-006 SP1/SP3]`
- **Not a messaging app.** `reminder_groups.message_template` reminds the _user_ to reach out; it **never
  auto-sends** anything. `[INTENT G11]`
- **Not the Gamification owner.** Interaction streaks feed Gamification (⚠ INTENDED), owned there. `[INTENT G12]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT] · [x] no `{{…}}` remaining
