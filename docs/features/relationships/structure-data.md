<!-- Structure & Data — features/relationships · /documentation Phase 2 · sources: ADR-002 §5.9 · relationship.ts · ADR-001/003 · intake -->

# Structure & Data — Relationships (CRM)  (level: Feature)

## Data model — 6 owned tables (current, authoritative) `[FACT: ADR-002 §5.9 L2193-2364; relationship.ts]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `contacts` | the person | first/last/nickname, email, phone, avatar_url, company, job_title, location, birthday, tags, social_links | `relationship_type` CHECK(9); `stay_in_touch_frequency` CHECK(6); idx (first,last); denormalized stats |
| `contact_events` | dates per person | title, description | `contact_id` **CASCADE**; `event_type` CHECK(4); `event_date` YYYY-MM-DD/MM-DD; idx contact |
| `interactions` | contact log | summary, follow_up_notes | `contact_id` **CASCADE**; `interaction_type` CHECK(8); `sentiment` CHECK(3); idx contact/date |
| `contact_reminders` | per-person reminders | title | `contact_id` **CASCADE**; `reminder_group_id` **SET NULL**; `frequency` CHECK(6) |
| `reminder_groups` | batch reminders | name, message_template | `frequency` CHECK(6); `time_of_day` HH:MM; `days_of_week` JSON |
| `reminder_group_contacts` | group↔contact junction | — | both FKs **CASCADE**; PK(group, contact) |

- Denormalized on `contacts`: `last_interaction_date`, `next_contact_date`, `interaction_count` — **cache**,
  truth = the interactions ledger (RL-3). `[FACT: L2219-2221]`
- `social_links` is typed JSON {linkedin, twitter, instagram, whatsapp}. `[FACT: relationship.ts L42-47]`
- Structured columns sync **LWW** (no CRDT). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / relationship.ts today) — ADR-002 amendment `[INTENT G2,G4,G8,G10,G11]`
- **Networks (G2):** `network_groups` (name[E], description→page, is_active) + `network_group_contacts`
  junction (PK(network, contact), many-to-many — a contact in many networks, RL-4).
- **Closeness (G4):** `contacts.closeness_tier` (onion tier) for health weighting — or derive from
  `relationship_type` + `is_favorite` (build-phase call).
- **G8 restored:** `contacts.how_we_met`; `interactions.energy_given`/`energy_received`/`key_takeaways`;
  `contact_reminders.is_snoozed`/`snoozed_until`/`priority`.
- **Event-anchored group reminders (G11):** `reminder_groups` gains a birthday-anchor mode (fire N days before a
  member's `contact_events` birthday).
- **Tag scoping (G10):** the shared tag system gains a scope (universal vs module) — a **Notes & Pages**
  refinement, not a table here. `[INTERP]`

## State management map `[FACT: ADR-001 State; v1 hooks/API.md]`
- **React Query** owns contact/interaction/event/reminder reads + optimistic writes, and the **derived**
  `getContactHealth`/`getNetworkHealth`/stats (invalidated on any interaction mutation).
- **Zustand** owns ephemeral UI: active top view (Dashboard/Graph/grouped), graph viewport/selection, timeline
  filters, form drafts, import-review state.
- Contact stats + health are **derived** (RL-3/RL-5) — never hand-maintained.

## Page / route map `[INTENT G1; FACT: CLAUDE.md §6; v1 pages]`
- **Top view (user-chosen default):** Dashboard · **Neural Graph** (networks⇄contacts, Sigma.js) · grouped
  All-Contacts.
- **Contact standalone page** — info + interaction timeline + events + social + health + linked note (`pages`).
- **Network standalone page** — members + aggregate health + linked note.
- **Reminders page** — **create** reminders only (viewing happens on the global Calendar, parked).
- **All-Events page** (relationships) — feeds / mirrored by the global Calendar.

## Dependencies / graph
- **Wave 1 (independent domain).** Out-edges: Notes (contact/network pages), Preferences, shared tags, Tasks
  (follow-ups read `contact_id`). In-edges: global Calendar (parked) + Journal `/summary`, Gamification (⚠).
  `[FACT: docs/core/architecture/module-dependency-graph.md; intake]`
- Neural graph rendered with **Sigma.js** (WebGL, 10k+ nodes). `[FACT: ADR-001]`
- No direct cross-module table reads — integration points only (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- **Contact stats** (`last_interaction_date`/`interaction_count`/`next_contact_date`) derive from the
  interactions ledger + stay-in-touch cadence (RL-3) — never a second stored truth.
- **Health** is derived, closeness-weighted (RL-5) — never persisted as authority.
- Enums (`RelationshipType`, `InteractionType`, `Sentiment`, `ContactEventType`, `Frequency`) — string-literal
  unions + SQL CHECK + Zod, declared once. `[FACT: relationship.ts L13-36]`
- Tags resolve to the shared (scoped) vocabulary (RL-10), not inline. `[INTENT G10]`

## ADRs / structural decisions
- **ADR-002 §5.9** — the 6 tables (authoritative). **ADR-001** — RQ+Zustand state, Sigma.js graph. **ADR-003** — LWW.
- ⚠ **Surfaced decision:** networks + closeness + restored fields + event-anchored group reminders + tag scoping
  → **ADR-002 amendment** (+ the tag-system refinement noted under Notes & Pages). `[INTENT G2,G4,G8,G10,G11]`

## Completion checklist
- [x] data model (6 tables) · [x] dep graph (independent domain, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
