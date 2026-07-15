<!-- Conventions — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 · routine.ts · docs/intake/routines.md §D/§E · CLAUDE.md Conventions -->

# Conventions — Routines  (level: Feature)

## How to build here
- **Compose, never duplicate.** A routine step *drives* an existing entity through its documented contract — launch
  its Session sub-type (`SessionRegistry.createSession`) or the entity's native completion. **Never** create a
  Routines-local runtime, scheduler, or completion record where a foundation already provides one. `[INTENT RT-3;
  FACT: sessions/contract.md]`
- **Policies are configuration, not code.** Completion / miss / acceptance-window semantics are **read from
  user settings** (Preferences/Spaces), never hardcoded. Ship a sensible default; the user owns the policy. `[INTENT
  RT-5, RT-6]`
- **Derive, don't cache.** Streaks, completion rate, ranking, time-period comparison **recompute from
  `routine_completions`**. Routines keeps no denormalized streak columns (unlike Habits). `[FACT: §5.6 has none;
  INTENT RT-14]`
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
- Notes target `entity_type='routine_action'` in `pages`; tags come from the Spaces universal vocabulary. `[FACT:
  ADR-002 L1344; intake/spaces.md SP2]`

## Pitfalls / local "never do"
- **Never write a parallel completion record for a step** — completing the step *is* completing the driven entity
  (double-counting is the failure RT-3 exists to prevent). `[INTENT RT-3]`
- **Never assume the Habits streak rule** — routine streaks are **policy-derived** (RT-7); Gamification must read the
  policy result, not reimplement "consecutive scheduled, no grace." `[INTENT RT-7]`
- **Never invent a step "mode" where a Session sub-type already exists** — extend the ADR-004 registry (via Spaces)
  instead. `[INTENT RT-3; FACT: sessions registry]`
- **Never hardcode a completion/miss policy** — it is user-configurable per method (RT-5/RT-6). `[INTENT §E]`
- **Never discard partial progress** — always record "what was done," even on interruption (RT-5, the gratitude
  rule). `[INTENT Q2]`
- **Never reach into another module's tables** — go through its contract (Sessions/Tasks/Habits/Health/Purpose).
  `[FACT: constitution §6]`

## Completion checklist
- [x] patterns in use (enforced, not aspiration) · [x] naming/layout · [x] pitfalls · [x] [FACT/INTENT] on each claim
