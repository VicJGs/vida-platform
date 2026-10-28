<!-- Contract — features/relationships · /documentation Phase 2 · sources: ADR-002 §5.9 · relationship.ts · v1 API.md · intake -->

# Contract — Relationships (CRM) (level: Feature)

> **Status:** types exist (`@vida/types/relationship.ts`, 6 entities) but `@vida/core` `models/relationship.ts`
> is an **empty placeholder (0 lines)** — no service. Networks, health, closeness, and the restored fields have
> **no schema** yet. Signatures below are the **designed interface**; ⚠ INTENDED items depend on the ADR-002
> amendment. `[FACT: relationship.ts present; core model 0 lines; ADR-002 §5.9]`

## Exposed surface (via `@vida/core`)

- **Contact CRUD & queries** (`Contact` `[FACT: relationship.ts L53-86]`):
  - `createContact` · `updateContact` · `softDeleteContact` (cascades, RL-2) · `listContacts(filter)` ·
    `getContact(id)` · `toggleFavorite(id)`
  - `importDeviceContacts()` → **X1** device-mediated (parse/normalize/encrypt on-device; server-plaintext refused-not-downgraded) → **X8** `import_staging` (match against existing → per-row status → commit on confirm, no dupes); connector classified X2, gated by `external_in_ok` (X5) (RL-11, G7). `[INTENT; ADR-014 X1/X8/X2/X5]`
- **Interactions** (`Interaction` `[FACT: L102-115]`): `logInteraction` / `updateInteraction` /
  `deleteInteraction` → each **recomputes** the contact's stats + health (RL-3, RL-5); `getTimeline(contactId)`
- **Events** (`ContactEvent` `[FACT: L88-100]`): `createEvent` · `getUpcomingEvents(range)` ·
  `getAllEvents()` (feeds the All-Events page + global Calendar, RL-8)
- **Reminders** (`ContactReminder` `[FACT: L117-126]`): `createReminder` · `completeReminder` ·
  ⚠ `snoozeReminder(id, until)` (G8) · `getDueReminders(range)` — the **`dueIn`** read seam (R7) that ADR-013 **N1** `local-scheduled` notifications read; also consumed by the Calendar (not shown in-module). `[INTENT; ADR-013 N1; R7]`
- **Reminder groups** (`ReminderGroup` + `ReminderGroupContact` `[FACT: L128-144]`): `createGroup` ·
  `addMembers`/`removeMembers` · ⚠ `setBirthdayAnchor(groupId, daysBefore)` (RL-7) — never auto-sends
- **Networks (⚠ INTENDED, G2):** `createNetwork` · `addToNetwork`/`removeFromNetwork` · `getNetworkGraph()` →
  Sigma.js node/edge set (contact⇄network membership, RL-4) · `getNetworkHealth(id)` (aggregate, RL-5)
- **Health (derived, RL-5):** `getContactHealth(id)` → `{band, score, factors}`; closeness-weighted (⚠ closeness_tier)

## What it consumes (outside dependencies)

- **Notes & Pages** — contact + network descriptions are `pages` rows (`entity_type` ∈ contact, network), read
  via the Notes contract. `[FACT: ADR-002 §5.2; INTENT G9]`
- **Shared tag system** — tagging via the shared **`entity_tags`** primitive (`entity_type='contact'`, SP1) with `parent_tag_id` nesting (SP3), not inline `contacts.tags`; the universal-vs-module scope is a Notes-&-Pages refinement (RL-10). `[INTENT G10; ADR-006 SP1/SP3]`
- **Preferences** — reminder defaults, closeness-tier definitions, import settings. `[INTENT; FACT: Preferences contract]`

## Fed by (parent-module links — read via integration points, §6)

- **Independent domain (Wave 1)** — no upstream owner; contacts are created/owned standalone (or imported
  device-side). `[FACT: docs/core/architecture/module-dependency-graph.md]`

## Consumed by

- **Tasks** → follow-up tasks link `contact_id` (RL-9). `[FACT: CLAUDE.md §3]`
- **Notifications** → the three reminder mechanisms (RL-6) produce notifications riding the ADR-013 three-tier delivery (N1); the off-device wake payload is content-free (N2, no contact PII). Notifications is the dispatcher. `[INTENT; ADR-013 N1/N2]`
- **Global Calendar (parked) + Journal `/summary`** → due reminders (the `dueIn` seam, R7), upcoming events, today's interactions
  (RL-6/RL-8). `[INTENT G1; FACT: Notes /summary]`
- **Gamification** → interaction-streak events (⚠ INTENDED, RL-9/G12). `[INTENT G12]`

## Contract error cases

- `importDeviceContacts` without device permission → typed `ContactsPermissionError` (no partial silent import).
  `[INTENT G7]`
- `logInteraction` with a bad enum/sentiment → typed validation error (CHECK). `[FACT: ADR-002 §5.9]`
- `getContactHealth` on a contact with no interactions → `{band:'new'}`, not a false "overdue" (RL-5). `[INTERP RL-5]`
- `addToNetwork` duplicate membership → idempotent (PK on the junction, RL-4). `[FACT: junction PK; INTENT G2]`

## Completion checklist

- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
