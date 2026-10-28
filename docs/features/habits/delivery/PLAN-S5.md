# PLAN — S5 · Effect fan-out + cross-module seams + journal registration

# Spec: feature:mod-habits · slice S5 (§XXVI g1) · Status: draft

# No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded per Victor's standing directive.

## 1. Identity

S5 is the cross-module surface — the completion effect fan-out (HAB-16) + purpose contribution (HAB-17) + economy
feed (HAB-18) + fail-loud isolation (HAB-19) + entity_tags consumer (HAB-21) + pages seam (HAB-22) + sync ride
(HAB-25) + project_habits association (HAB-27) + reminder-schedule expose (HAB-06) + `registerHabitsJournal`.
`[FACT: parts/habits.md:16-22,25-28,32,35-37]`
Habits is an effect **PRODUCER** — it EMITS via the rail; the WRITES (purpose metric, `consequence_ledger`) are
owned by Purpose/Gamification handlers (M2/deferred). No `registerHabitsEffects` (owns no handler).

## 2. Business Rules (S5 slice)

- **BR-S5-1 · Completion effect fan-out is POST-COMMIT + guarded + idempotent, on ANY done-leaving mutation (HAB-16).**
  After a completion is persisted + the cache recomputed, if the row is DONE (`count>=target`) fire — each guarded
  (`registry.resolve(type)` else no-op) — `complete_habit_occurrence` · `contribute_purpose_metric` · `award_xp` on
  `effects.rail.applyEffect`. **Fired from every mutation that can leave the row done: `logCompletion` /
  `logDetailedCompletion` / `backfillCompletion` AND `editCompletion`** (an edit that flips a partial→done must fire,
  g1 B1) — gated purely on the derived done-state, NOT on which method. The rail dedups via `effect_event_id` (R1):
  `EffectEvent{ subjectNaturalKey = habitId, transition = 'completed:'+date, targetRef = habitId }` → the same
  (habit,date) = the same key → a re-fire is a safe no-op (`applied:false`), never a double-count. Dormant without an
  `effects` port or a registered handler. `[FACT: business-rules.md:23-24,31-41; parts/habits.md:17,26; foundation/effects/types.ts:37-43; foundation/effects/event-id.ts:25; checkins/service.ts:229-242]`
- **BR-S5-1b · `deleteCompletion` does NOT reverse a fired effect (documented deferral).** A delete that removes a
  done row leaves the prior effect on the rail's ledger — there is NO reverse/compensation effect in the ADR-004 S4
  catalogue and the intent names none. S5 does NOT build reversal (no owning contract → over-engineering); flagged
  as a known M1 trade-off. `[FACT: foundation/effects/types.ts:20-33 (no reverse member); parts/habits.md:26]`
- **BR-S5-2 · Effects never fail the persisted completion (HAB-19, IR-5).** The fan-out is post-commit; a handler
  throw does NOT roll back or fail `logCompletion` (the row is already saved). Each effect emit is failure-isolated.
  `[FACT: business-rules.md:79-84; interpretation.md IR-5]`
- **BR-S5-3 · Purpose contribution is emit-only; the standalone path is re-drivable, the auto-path is non-fatal
  (HAB-17/19).** `contributeToPurposeMetrics(habitId, completion)` emits `contribute_purpose_metric` (Purpose owns
  the metric write via its handler — never a direct `purpose_metric_value` write, R2); on emit failure it throws a
  typed `MetricContributionError` (the caller re-drives). The auto-fan-out (BR-S5-1) calls the emit wrapped: a throw
  is caught and **non-fatal** (the completion is already persisted, BR-S5-2). **Flag semantics in M1: there is no
  notification sink wired yet — the auto-path swallows non-fatally (a caught error, no rethrow); the typed
  `MetricContributionError` + re-drive surface is the standalone method (a ② P6 concern for the visible flag).**
  `[FACT: business-rules.md:31-36,81-82; parts/habits.md:27; conventions.md:24-26; checkins/service.ts:232-234]`
- **BR-S5-4 · Economy feed is emit-only (HAB-18).** `award_xp` (ADR-012 generalizes → `grant_currency(XP)`); habits
  NEVER writes `consequence_ledger` (R2) — Gamification's handler does. `[FACT: business-rules.md:37-41; parts/habits.md:28]`
- **BR-S5-5 · entity_tags consumer, deny-safe (HAB-21).** `getEntityTags(entityType, entityId)` (the ratified
  seam-contract + finance FIN-35 signature, g1 B2) resolves via the `associations` (`AssociationResolver`) port —
  `resolveAssociations({entityType, entityId}, 'separate')` → `r.mode==='separate' ? r.tags : []`; absent port → `[]`.
  Callers pass `HABIT_ENTITY_TYPE` for a habit. Habits authors no tag DDL/registry — it's a consumer. `[FACT: parts/habits.md:31; services/finance/service.ts:698-702; foundation/spaces/association-resolver.ts:83]`
- **BR-S5-6 · project_habits association (HAB-27, C1).** Habits OWNS the `project_habits` junction (KEPT — only the
  `purpose_*` trio retired). `linkProject`/`unlinkProject`/`listProjectsForHabit` over the `projectHabits` repo
  (softDelete:true). **`linkProject` is idempotent/resurrect-aware** (g1 NIT-3): find a LIVE pair → return it; find a
  soft-deleted pair → resurrect (clear `deleted_at`); else create — never let the raw `UNIQUE(project_id,habit_id)`
  surface. `unlinkProject` soft-deletes. Navigational (links OUT). `[FACT: parts/habits.md:37; db/schema/habits.ts:119-131,128]`
- **BR-S5-7 · Journal contribution (HB-6 consumed-by).** `registerHabitsJournal(registry, svc)` registers a
  `JournalContribution` (module='habits', sectionKey='summary') whose `summary(date)` returns the habits due on
  `date` + their done status; **`due-count > 0 ⇒ state:'success'`** (a due-but-not-done day still HAS data to show),
  else `'empty'` — reuses `TerminalState` by TYPE (never `deriveTerminalState` — the gamification/UX-4 precedent).
  `[FACT: contract.md:44; services/gamification/journal.ts:30-68; services/journals/types.ts:58-64]`
- **BR-S5-8 · Reminder schedule + sync + pages are data/seam-only (HAB-06/25/22).** The reminder schedule is
  already exposed on the habit (`frequency`/`days_of_week`/`times_of_day`) via the S1/S4 reads — Preferences/
  Notifications consume it (no new code). Sync rides the foundation substrate (no code). A habit's notes are a
  `pages` row (`entity_type='habit'`) — Notes-owned; S5 exports a `HABIT_ENTITY_TYPE='habit'` constant for the
  registration, the page linking itself is ②/Notes. `[FACT: parts/habits.md:16,25,32,35; conventions.md:23]`

## 3. Contract (S5 — appended)

```
contributeToPurposeMetrics(habitId: string, completion: HabitCompletion): Promise<void>   // emit; throws MetricContributionError
getEntityTags(entityType: string, entityId: string): Promise<TagAssociation[]>             // finance FIN-35 sig; deny-safe → []
linkProject(habitId: string, projectId: string): Promise<ProjectHabit>                     // idempotent/resurrect-aware
unlinkProject(habitId: string, projectId: string): Promise<void>
listProjectsForHabit(habitId: string): Promise<string[]>                                   // project_ids
// module-init:
export function registerHabitsJournal(registry: JournalRegistry, svc: HabitsService): void
export const HABIT_ENTITY_TYPE = 'habit'
export class MetricContributionError extends Error
```

- `HabitsServiceDeps.effects?: EffectsPort` + `associations?: AssociationResolver` (both deny-safe/dormant).
  `[FACT: checkins/types.ts:33-46 (EffectsPort); finance/types.ts:50 (associations)]`

## 4. Acceptance (✓live)

- [ ] with no `effects` port, a done `logCompletion` persists + fires NOTHING (dormant) ✓live
- [ ] with a stub rail+registry resolving the 3 types, a done completion fires each once; a re-log of the same date does not double-fire (idempotent key) ✓live
- [ ] an `editCompletion` that flips a partial→done fires the 3 effects once; a re-edit does not double-fire (B1) ✓live
- [ ] a partial (`count<target`) completion fires NO effects ✓live
- [ ] a `contribute_purpose_metric` handler that throws does NOT fail `logCompletion` (row persists) — failure isolated (BR-S5-2) ✓live
- [ ] `contributeToPurposeMetrics` throws `MetricContributionError` when its emit fails ✓live
- [ ] `getEntityTags` → `[]` with no associations port; → resolver tags with one ✓live
- [ ] `linkProject`/`listProjectsForHabit`/`unlinkProject` round-trip; a re-link after unlink resurrects (no UNIQUE throw) ✓live
- [ ] `registerHabitsJournal` → a JournalContribution whose `summary(date)` returns due habits + done status; empty day → `state:'empty'` ✓live
- [ ] `tsc` 0 · eslint 0 · full `@vida/core` suite green

## 5. Implementation Prompt (ordered; cites §2)

1. **`services/habits/types.ts`** — add `EffectsPort` import (from foundation/effects) or a local `{rail,registry}`;
   `effects?`, `associations?` on deps; `MetricContributionError` (`.name`); the 5 method sigs; `HABIT_ENTITY_TYPE`.
   Import `TagAssociation`/`AssociationResolver` (foundation/spaces), `JournalContribution`/`JournalRegistry`/
   `SectionData`/`DataPoint` (../journals), `ProjectHabit` (@vida/types).
2. **`services/habits/service.ts`** — add `projectHabitsRepo` (softDelete:true). Add `emitCompletionEffects(habit,
completion)`: if `completion.count >= habit.target_count`, for each of the 3 effectTypes: `if (effects &&
effects.registry.resolve(t)) { try { await effects.rail.applyEffect({subjectNaturalKey: habit.id, transition:
'completed:'+completion.completed_date, effectType: t, targetRef: habit.id}) } catch { /* post-commit, isolated
(BR-S5-2) */ } }`. **Call it after the recompute in a shared post-mutation step used by log/detailed/backfill AND
   `editCompletion`** (B1 — gate on the derived done-state, not the method; the idempotent key makes a re-fire safe).
   `deleteCompletion` fires nothing + does not reverse (BR-S5-1b). Add `contributeToPurposeMetrics` (guarded emit;
   throw `MetricContributionError` on failure). `getEntityTags(entityType, entityId)` (finance FIN-35 shape;
   `associations` deny-safe → []). `linkProject` idempotent/resurrect-aware (find live→return, soft-deleted→clear
   `deleted_at` via update, else create; BR-S5-6) · `unlinkProject` (soft-delete the pair) · `listProjectsForHabit`
   (findWhere `habit_id` + `isNull(deleted_at)` → project_ids). All post-commit effects failure-isolated.
3. **`services/habits/journal.ts`** (new) — `createHabitsJournalContribution(svc)` + `registerHabitsJournal`;
   `summary(date)` = due-on-date habits (isScheduledOn) + done status (via a completion read) → SectionData. Mirror
   gamification/journal.ts.
4. **`services/habits/index.ts`** — export the journal helpers + `HABIT_ENTITY_TYPE` + `MetricContributionError`.
5. **tests** — add an S5 describe block: a `stubRail` (records applyEffect calls; a throwing variant) + a
   `stubRegistry` (resolve returns a marker for the 3 types) + a stub `associations`. Cover every §4 item.
6. Run typecheck + `test -- habits` (Node 24) + eslint. Done = §4 green → S5 Verification Gate.

## 6. Open UNKNOWNs

- [UNKNOWN → read at impl] the exact `EffectRail`/`EffectRegistry` import path + `resolve` return shape (foundation/
  effects barrel); the `AssociationResolver.resolveAssociations` signature (foundation/spaces) — mirror finance FIN-35.

## 7. Change Log

| Date       | Session               | Change                                                                                                                                                                          |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 2026-09-23-mod-habits | S5 PLAN — emit-only producer (fan-out guarded/idempotent/post-commit/isolated); entity_tags + project_habits + journal contribution; no registerHabitsEffects (owns no handler) |
