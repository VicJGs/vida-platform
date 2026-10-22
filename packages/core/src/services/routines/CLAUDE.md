# services/routines — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
Routines — the cross-module ORCHESTRATOR: a named, ordered, recurring sequence of polymorphic steps, each driving a
real entity elsewhere (habit · task · session). Composes and derives; owns only its 3 tables (migration 018).

## Owning ADR / context
routines context · durable docs `docs/modules/routines/current-{spec,business-rules}.md` · delivery
`docs/features/routines/delivery/` (interpretation · reconciliation · slice-map · seam-contract · PLAN-S*)

## Pattern
`createRoutinesService(deps)` — factory-object, hoisted closures, no `this.`. Data flow GOVERNED by
docs/core/architecture/data-flow.md (validate → repository → encrypt-seam → return). Rides foundation/ substrates; does not
re-implement them. Repos `encryptedFields: []` (M1.0 dormant `[E]` seam). `findWhere` reads add `isNull(deleted_at)`
explicitly. Lists sort `sort_order|step_order`, then `created_at`, then id.

## Status
As-built (re-scope 2026-10-21): S1 routine + step CRUD · S2 completion ledger + skips · S2c floor conformance
(setLifecycle, entity_type registry check, date/progress/RRULE/name validation, ordering). Next: S3 run/drive (the RT-3
composition core) per the slice-map. Composition-root registration is NOT this module's ① track (fe-routines entity close).
