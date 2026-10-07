# services/relationships — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
Contact CRM — interactions, reminders, events, stay-in-touch

## Owning ADR / context
relationships context

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
BUILDING (mod-relationships #56 · LIF-137 ①) — `createRelationshipsService` over DB-4 `025_relationships` (8 tables).
- **S1 built** — contact CRUD spine (`createContact`/`updateContact`/`softDeleteContact`/`listContacts`/`getContact`/
  `toggleFavorite`) + DB-11 `@vida/types` reconcile. Deps = `{db, deviceId}` (grow per slice). `social_links` JSON
  boundary → `ContactView`; soft-delete app-layer cascade (RL-2); M1.0 `encryptedFields:[]`.
- Forward: S2 interactions+stats · S3 events · S4 reminders+groups+dueIn · S5 networks · S6 health (derived, no M*) ·
  S7 device import (deny-safe) · S8 tags/pages/links · S9 fan-out+Journal.
- Currency: `docs/modules/relationships/current-{spec,business-rules}.md`.
- **Test gate:** better-sqlite3 live-store, Node-ABI-matched (an ABI error = environment, not code; `pnpm rebuild
  better-sqlite3` to switch Node).
