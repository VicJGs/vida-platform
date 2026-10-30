# Intake: Relationships (CRM)

<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->

Context: features/relationships (Wave 1 — independent domain; feeds Journal /summary + Tasks follow-ups + neural graph)
Sources: v2 (ADR-002 §5.9 + @vida/types/relationship.ts + CLAUDE.md §6) · v1 (life-os src/features/relationships + types/relationships.ts + API.md) · user intent
Session: 2026-06-27 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)

**Data model — 6 tables** `[FACT: ADR-002 §5.9 L2193-2364; relationship.ts]`:

- `contacts`: `first_name`[E PII], `last_name`[E], `nickname`[E], `relationship_type`{family,friend,colleague,mentor,mentee,romantic,professional,acquaintance,other}, `email`[E], `phone`[E], `avatar_url`[E], `company`[E], `job_title`[E], `location`[E], `birthday`[E], `tags`[E], `social_links`[E] JSON{linkedin,twitter,instagram,whatsapp}, `stay_in_touch_frequency`{daily…yearly}, `stay_in_touch_days`, **denormalized** `last_interaction_date`/`next_contact_date`/`interaction_count`, `is_favorite`, soft-delete. `[FACT: L2196-2237]`
- `contact_events`: `contact_id` (CASCADE), `event_type`{birthday,anniversary,holiday,custom}, `event_date` (YYYY-MM-DD or MM-DD year-agnostic), `title`[E], `description`[E], `is_recurring` (default 1), `reminder_days` JSON [1,3,7]. `[FACT: L2242-2265]`
- `interactions`: `contact_id` (CASCADE), `interaction_type`{call,text,email,in_person,video_call,social_media,letter,other}, `date`, `duration_minutes`, `summary`[E], `sentiment`{positive,neutral,negative}, `follow_up_needed`, `follow_up_date`, `follow_up_notes`[E]. `[FACT: L2270-2298]`
- `contact_reminders`: `contact_id` (CASCADE), `reminder_group_id` (SET NULL), `title`[E], `reminder_date`, `is_recurring`, `frequency`{daily…yearly}, `is_completed`. `[FACT: L2303-2325]`
- `reminder_groups`: `name`[E], `message_template`[E], `time_of_day` (HH:MM), `frequency`, `days_of_week` JSON, `is_active`. `[FACT: L2330-2350]`
- `reminder_group_contacts`: junction (`reminder_group_id` CASCADE, `contact_id` CASCADE), PK(group,contact). `[FACT: L2352-2364]`

**Intent (CLAUDE.md §6)** `[FACT: CLAUDE.md §6]`: people registration (full contact details); standalone page per person (description + interaction log + events + social links + management); important events per person; **network groups with neural graph view (Obsidian-style, Sigma.js WebGL)**; standalone page per network group; all-networks force-directed graph page; reminders per person (weekly/daily/monthly/yearly/specific weekday); **reminder groups** (for networks/lists/individuals) on a Reminders standalone page; all reminders day/week/month view; **relationship health per person AND per network** (from interaction frequency + sentiment); all-events (relationships) standalone page.

**Cross-cutting:** `contact` is a valid `entity_links` note target `[FACT: ADR-002 L3811]`; Tasks link via `contact_id` (follow-up tasks) `[FACT: CLAUDE.md §3]`; neural graph uses Sigma.js `[FACT: ADR-001]`.

## B. WHAT v1 DID — life-os relationships (legacy, for intent + lessons)

`[FACT: life-os src/types/relationships.ts + features/relationships + API.md]`

- **Full CRM**: pages AllContacts · ContactDetail · MyCircles · CircleSettings · Reminders · Events · Relationships(home). `[FACT: features/relationships/pages]`
- **Circles** (= networks): `MyCirclesPage` + `CircleSettingsPage` — v1's grouping concept. `[FACT: pages]`
- **Relationship health scoring**: `RelationshipHealthScore` component. `[FACT: components]`
- **Device contact import**: `ImportContactsButton`/`ImportContactsModal` + `capacitorCommunityContacts` (import from phone). `[FACT: components; capacitorCommunityContacts.d.ts]`
- **Interaction timeline**, **DueReminders**, **UpcomingEvents**, **ReminderGroupForm**, **QuickFilters**, **BulkActions**. `[FACT: components]`
- Richer **contact** fields: `how_we_met`, `additional_emails[]`/`additional_phones[]`, `address`, `timezone`, `preferred_contact_method`, `full_name`, individual social handles + `other_social`. `[FACT: types L22-42]`
- Richer **interaction**: `location`, `energy_given`/`energy_received`, `topics[]`, `key_takeaways`, `interaction_time`. `[FACT: types L88-101]`
- Richer **events**: `custom_type`, `work_anniversary`/`graduation` types, `reminder_enabled`, `last_reminded_at`. `[FACT: types L62-74]`
- Richer **reminders**: `is_snoozed`/`snoozed_until`, `priority`, `completed_at`, `recurrence_config`. `[FACT: types L116-124]`
- **5-level sentiment** (`very_positive…very_negative`); `relationship_type` had `close_friend`. `[FACT: types L7-9]`

### Key v1→v2 deltas (what changed, why it matters)

1. v2 **encrypts all PII** (names, email, phone, company, etc. `[E]`) — v1 was plaintext (Supabase). ZK upgrade. `[FACT: §5.9 [E] marks]`
2. v2 **collapses social** into one typed `social_links` JSON (linkedin/twitter/instagram/whatsapp); v1 had separate fields + `other_social`. `[FACT: relationship.ts L42-47]`
3. v2 **drops** v1 contact extras: `how_we_met`, `additional_emails/phones`, `address` (→ `location`), `timezone`, `preferred_contact_method`, `full_name`, inline `notes` (→ pages). `[FACT: relationship.ts omits]`
4. v2 **drops** v1 interaction richness: `location`, `energy_given/received`, `topics`, `key_takeaways`, `interaction_time`. `[FACT: interactions table]`
5. v2 **simplifies sentiment** 5→3 levels; drops `close_friend`. `[FACT: relationship.ts L34]`
6. v2 **denormalizes** `last_interaction_date`/`next_contact_date`/`interaction_count` on `contacts` (truth = interactions ledger). `[FACT: L2219-2221]`
7. **NETWORK GROUPS / CIRCLES have NO v2 table** — yet CLAUDE.md §6 needs them (neural graph, per-network pages, per-network health). v1 had circles. **Biggest schema gap.** `[FACT: ADR-002 §5.9 has no network table; CLAUDE.md §6 requires it]`
8. **Relationship health** + **neural graph** are intent with no dedicated schema (health = derived; graph = needs edges/membership). `[FACT: CLAUDE.md §6; no health/graph tables]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)

G1 — **Scope / views**: full v1 (assumed). Views: All-Contacts · Contact standalone page (info + interaction timeline + events + social + health) · Networks page + **neural graph** · per-network standalone page · Reminders standalone page (day/week/month + groups) · All-Events page. Confirm set.
G2 — **NETWORK GROUPS (the big gap — no schema)**: how to model? Proposed — a `network_groups` table + `network_group_contacts` junction (mirrors `reminder_groups`), each network with a standalone page + health. → candidate ADR-002 amendment / new tables. Confirm shape.
G3 — **Neural graph — what are the edges?**: does the graph show contact↔**network** membership only, or also **contact↔contact** relationships (who knows whom)? If contact-to-contact, we need an **edge table** (a relationship between two contacts). Which?
G4 — **Relationship health (formula)**: confirm **derived, not stored** — from interaction frequency vs `stay_in_touch` cadence + recent sentiment. What bands (e.g. healthy / at-risk / overdue)? Per-person AND per-network (network health = aggregate of members). Define the rule.
G5 — **Denormalized contact fields**: confirm `last_interaction_date`/`interaction_count` recompute from the interactions ledger, and `next_contact_date` = `last_interaction_date` + `stay_in_touch_frequency`/`days` (one source of truth, like habit streaks).
G6 — **Three reminder mechanisms — how do they relate?**: (a) per-contact `stay_in_touch` cadence → "overdue to reach out"; (b) explicit `contact_reminders` (one-off/recurring per person); (c) `reminder_groups` (batch reminder to a network/list/individual with a `message_template`). Confirm they coexist and what each is for.
G7 — **Device contact import** (v1 did via capacitor): in scope? Device-side only (ZK-safe). Mobile-only, or also desktop/web (web Contact Picker API is limited)?
G8 — **Dropped v1 fields — want any back?** Notable: `how_we_met` (how you met someone), interaction `energy_given/received` (great for health scoring) + `topics`/`key_takeaways`, reminder `snooze`+`priority`, 5-level sentiment, event `custom_type`. Which return?
G9 — **Notes via pages**: confirm contact standalone "description" = a linked `pages` row (`entity_type='contact'`). Notes also on interactions / networks?
G10 — **Tags**: `contacts.tags` is inline `[E]` JSON → migrate to the **shared** tag system (Tasks/Finance precedent), or keep inline?
G11 — **Reminder-group `message_template`**: is this for **batch "reach out" reminders** (same templated nudge to everyone in a network/list)? Confirm intent + that it never auto-sends (just reminds the user).
G12 — **Cross-module**: confirm contacts link to **Tasks** (follow-up tasks via `contact_id`) and feed **Journal /summary** (today's interactions/reminders/events). Any **Gamification** (e.g. interaction streaks)?

## Resolution

`[INTENT: Victor, 2026-06-28]` — intake **WHOLE**.

- **G1 — Views.** `[INTENT]` Default top view is user-chosen among: **Dashboard view** · **Graph view** (all
  networks + contacts as an Obsidian-style graph) · **grouped view of all contacts**. Plus: **Contact
  standalone page** · **Network standalone page** · **Reminders standalone page** — the Reminders page is for
  **creating** reminders only, **not for viewing them**. ⚠ **Reminders/events are VIEWED on the global Calendar
  page** (a platform-level surface, parked — see below), NOT inside Relationships.
- **TASKS vs EVENTS (Victor asked).** `[INTERP, confirmed]` Different types: a Task is _completable_ (lifecycle
  → completed); an Event _occurs_ and passes (never "completed", recurs). An event is **not** a subtask — it is a
  **trigger that spawns** tasks/reminders (birthday → "buy present" task + reminder, the G11 idea). The global
  Calendar is a read-only cross-module aggregator of events + tasks + reminders.
- **G2 — Network groups: ADD SCHEMA.** `[INTENT]` New `network_groups` table + `network_group_contacts`
  junction (mirrors `reminder_groups`). Each network gets a standalone page + derived health. → ADR-002 amendment.
- **G3 — Neural graph = membership edges only.** `[INTENT]` Contacts can belong to **multiple** networks; the
  graph draws each **contact as a node connecting to its network node(s)** (contact↔network membership). **No
  contact↔contact edge table** needed.
- **G4 — Health weighted by CLOSENESS (onion theory).** `[INTENT]` Health is derived (frequency vs cadence +
  recent sentiment) **and weighted by how close the contact is to the user** (inner vs outer "onion" tier): a
  neglected _close_ contact hurts health more than a neglected acquaintance. A contact's health rolls up into its
  network's health. ⚠ **closeness tier needs representation** (new concept — `closeness_tier`, or derived from
  `relationship_type` + `is_favorite`). INTENDED.
- **G5 — Denormalized fields recompute from ledger.** `[INTENT]` `last_interaction_date`/`interaction_count`
  from interactions; `next_contact_date` = last + `stay_in_touch_frequency`/`days`. One source of truth.
- **G6 — Three reminder mechanisms coexist** (stay-in-touch cadence · per-contact reminders · group reminders). `[INTENT]`
- **G7 — Device contact import: in scope, device-side, mobile-first** (native picker); web/desktop manual+CSV. `[INTENT]`
- **G8 — Restore: `how_we_met`, interaction `energy_given`/`energy_received` + `key_takeaways`, reminder snooze +
  priority.** `[INTENT]` Rest stay dropped. ⚠ → ADR-002 amendment. (energy fields feed G4 health.)
- **G9 — Both networks AND contacts get standalone pages + notes via `pages`** (`entity_type` ∈ contact, network).
  Interactions keep inline `summary`. `[INTENT]`
- **G10 — Tags → shared system, WITH SCOPING.** `[INTENT]` Migrate `contacts.tags` to the shared vocabulary, but
  tags carry a **scope**: some are **module-specific**, others **universal/shared** across modules. ⚠ this is a
  refinement to the shared tag system (Notes & Pages owns it) — flag for that context. INTENDED.
- **G11 — Group reminders: optional + BIRTHDAY-ANCHORED for important people.** `[INTENT]` The user decides if a
  reminder is needed. A group reminder can target **important people only** (closeness tier, G4) to
  congratulate / buy a present, firing on a scheduled timeframe **relative to each member's birthday**
  (`contact_events`). ⚠ group reminders gain an **event-anchored** mode (fire N days before a member's birthday),
  not just a fixed schedule. message_template never auto-sends — reminds the user only. INTENDED.
- **G12 — Cross-module CONFIRMED.** `[INTENT]` Contacts ↔ Tasks (follow-up via `contact_id`); feed Journal
  /summary; Gamification interaction-streak events ⚠ INTENDED.

### ⚠ Parked platform surfaces (NOT Relationships' to own)

- **Global Calendar page** — standalone, cross-module, read-only aggregator of events + tasks + reminders in
  multiple views. Reminders/events are _created_ in modules but _viewed_ here. Park as a platform feature
  (joins [[the journal]] + onboarding G_meta as cross-cutting surfaces). Revisit after Wave 1.

### ⚠ New INTENDED surface flagged for build (not shipped)

network_groups + junction (G2) · closeness_tier for health weighting (G4) · G8 restored fields (how_we_met,
energy_given/received, key_takeaways, reminder snooze+priority) · tag scoping universal-vs-module (G10, Notes &
Pages refinement) · event-anchored (birthday) group reminders (G11) · Gamification interaction streaks (G12).
All → candidate ADR-002 amendment + tag-system refinement.

## Change Log

| Date       | Session                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-27 | documentation-blueprint | intake harvested (v2 ADR-002 §5.9 6 tables + relationship.ts + CLAUDE.md §6 · v1 life-os relationships full CRM + API.md); gap map G1–G12 raised. Headline gaps: network_groups (no schema), neural-graph edges, relationship-health formula.                                                                                                                                                                                                                                   |
| 2026-06-28 | documentation-blueprint | G1–G12 resolved; intake WHOLE. Decisions: networks get schema (G2); graph = membership edges only, no contact↔contact (G3); health weighted by closeness/onion tier (G4, new closeness_tier); reminders viewed on a parked GLOBAL CALENDAR not in-module (G1); tags shared + SCOPED universal/module (G10); group reminders birthday-anchored for important people (G11); G8 restore how_we_met/energy/key_takeaways/snooze+priority. Parked: global Calendar platform surface. |
