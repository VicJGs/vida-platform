<!-- Conventions — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 · routine.ts · CLAUDE.md Conventions -->

> ⚠ **Superseded in part (2026-10-21).** The As-is/naming layer predates the shipped reframe (migration 018) and D1–D2.
> Full rewording lands in the §XXIX pass at unit close.

# Conventions — Routines (level: Feature)

## How to build here

- **Compose, never duplicate.** A routine step _drives_ an existing entity through its documented contract — launch
  its Session sub-type (`SessionRegistry.createSession`) or the entity's native completion. **Never** create a
  Routines-local runtime, scheduler, or completion record where a foundation already provides one. `[INTENT RT-3;
FACT: sessions/contract.md]`
- **Policies are configuration, not code.** Completion / miss / acceptance-window semantics are **read from
  user settings** (Preferences/Spaces), never hardcoded. Ship a sensible default; the user owns the policy. `[INTENT
RT-5, RT-6]`
- **Derive, don't cache.** Streaks, completion rate, ranking, time-period comparison **recompute from
  `routine_completions`**. Routines keeps no denormalized streak columns (unlike Habits). As a pursuable, the routine
  carries `measurement_kind` (`rate`) × `binding_mode` (`derived-pull`); `progress()` derives on read — no stored
  progress column (ADR-011 M1/M2/M3). `[FACT: §5.6 has none; INTENT RT-14; ADR-011 M1/M2/M3]`
- **Aggregate through the provider seam.** Surface scheduled occurrences to the Calendar/Journal via `dueIn` +
  `summary(date)` — read live, mirror nothing (honors the Sessions aggregator rule). `[INTENT RT-13]`
- **Data conventions (inherit CLAUDE.md):** UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · booleans 0/1 · JSON as
  TEXT (`recurrence_days`, `skip_dates`) · `[E]` field-level encryption on `title`/`description`/`skip_reason` ·
  `_sync_*` on every syncable table · soft delete via `deleted_at`. `[FACT: CLAUDE.md Conventions; ADR-002 §5.6]`

## Naming & layout

- Aspect docs = the canonical 5 (`identity · business-rules · contract · structure-data · conventions`), matching
  every documented feature. `[FACT: docs/features/habits/]`
- Invariants are `RT-N`; steps referenced by `step_type` + `entity_ref` (not the retired `action_type` +
  `linked_*_id`). `[INTENT structure-data]`
- Notes target `entity_type='routine_action'` in `pages`; tags via the **`entity_tags`** primitive (ADR-006 SP1) —
  the Spaces universal vocabulary; routines registers `entity_type='routine_action'` as a consumer. `[FACT:
ADR-002 L1344; ADR-006 SP1]`

## Pitfalls / local "never do"

- **Never write a parallel completion record for a step** — completing the step _is_ completing the driven entity
  (double-counting is the failure RT-3 exists to prevent). `[INTENT RT-3]`
- **Never assume the Habits streak rule** — routine streaks are **policy-derived** (RT-7); Gamification must read the
  policy result (a `derived-pull` measure), not reimplement "consecutive scheduled, no grace." **Never write XP from
  Routines** — a completion event fires the `grant_currency(XP)` feeder effect (ADR-012 E2) that Gamification applies →
  `consequence_ledger` (E3). `[INTENT RT-7; ADR-012 E2/E3]`
- **Never invent a step "mode" where a Session sub-type already exists** — extend the ADR-004 registry (via Spaces)
  instead. `[INTENT RT-3; FACT: sessions registry]`
- **Never hardcode a completion/miss policy** — it is user-configurable per method (RT-5/RT-6). `[INTENT §E]`
- **Never discard partial progress** — always record "what was done," even on interruption (RT-5, the gratitude
  rule). `[INTENT Q2]`
- **Never reach into another module's tables** — go through its contract (Sessions/Tasks/Habits/Health/Purpose). The
  routine→purpose contribution rides the **`contributions`** primitive (ADR-011 M7 — retires the As-is
  `purpose_routines`), Purpose-owned; there is no `project_routines` junction. `[FACT: constitution §6; ADR-011 M7]`

## Completion checklist

- [x] patterns in use (enforced, not aspiration) · [x] naming/layout · [x] pitfalls · [x] [FACT/INTENT] on each claim
