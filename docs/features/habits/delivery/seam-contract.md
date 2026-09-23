<!-- Seam contract — features/habits · Entity Delivery Flow §2 · MOD-habits ① (LIF-125)
     The backend↔frontend API seam: the createHabitsService surface ② fe-habits (LIF-182) plans against, plus the
     cross-module ports ① injects. Signatures ratified from parts/habits.md + the aspect contract.md; the factory/
     port shape follows the finance/gamification/checkins precedents (interpretation §1 DEPENDENCIES). -->

# Seam Contract — Habits (① → ② and ① → cross-module)

## 1. Factory (composition root)
```ts
export function createHabitsService(deps: HabitsServiceDeps): HabitsService

export interface HabitsServiceDeps {
  db: DrizzleDb                    // required
  deviceId: string                // required (app_state)
  // — optional cross-module ports; each deny-safe when absent (interpretation ORGANIZATION/IR-5) —
  effects?: EffectsPort           // { rail, registry } — guarded post-commit emit; dormant if unresolved (S5)
  contributions?: ContributionsPort // Purpose ladder write via the S4 contribute_purpose_metric effect (S5)
  prefs?: HabitsPrefsPort         // habit_backfill_window_days (S3) + push_habits schedule (S5); deny-safe
  associations?: AssociationsPort // entity_tags resolver (SP1); absent → [] (S5)
  notes?: NotesPagesPort          // pages seam for habit notes (S5); absent → no-op
}
```
- Factory body: destructure deps, instantiate `habitsRepo`/`completionsRepo`/`projectHabitsRepo` **inline** via
  `createRepository(db, table, cfg)`, hoist intra-service calls to closures (no `this.`), return a plain object.
  `[FACT: packages/core/src/services/finance/service.ts:167-176; checkins/service.ts:137-158]` [[factory-service-no-this-for-intra-calls]]
- Repo cfg: `habits` → `{ deviceId, encryptedFields: [], softDelete: true }`; `habit_completions` →
  `{ deviceId, encryptedFields: [], softDelete: false }` (hard-delete ledger, IR-3); `project_habits` →
  `{ deviceId, encryptedFields: [], softDelete: true }`. `[FACT: interpretation IR-3/IR-4; migrations/017_habits.ts:74,110]`

## 2. Operation surface (the DX contract ② consumes)
> Full per-leg signatures + evidence live in `docs/specs/foundation/backend-intent/parts/habits.md:11-38` (the
> operations lens). Return shapes are `@vida/types` interfaces after the S1 reconcile.

**Definition (S1)** — `createHabit(input)` · `updateHabit(id, patch)` · `softDeleteHabit(id)` · `listHabits(filter)` → `Habit` / `Habit[]`
**Completion ledger (S2)** — `logCompletion(habitId, {date?, count?, value?})` · `logDetailedCompletion(habitId, {count, value, mood_before, mood_after, ease_rating, satisfaction})` · `editCompletion(habitId, date, patch)` · `deleteCompletion(habitId, date)` → `HabitCompletion` (all recompute the streak cache)
**Backfill (S3)** — `backfillCompletion(habitId, pastDate, {...})` → `HabitCompletion` | throws `BackfillWindowError`
**Derived reads (S4)** — `getTodayHabits()` → `Habit[]` grouped by `time_of_day` · `getStreak(habitId)` → `{current, longest, total}` · `getCompletionRate(habitId, range)` · `getMoodTrend(habitId, range)` · `getCalendar(habitId, month)`
**Cross-module (S5)** — `contributeToPurposeMetrics(habitId, completion)` (emit) · `getEntityTags(entityType, entityId)` (deny-safe → []) · plus the registration helpers below.

## 3. Registration helpers (composed at app wire-up, not in the factory)
```ts
export function registerHabitsJournal(registry: JournalRegistry, svc: HabitsService): void  // S5
```
**No `registerHabitsEffects`** — habits is an effect **PRODUCER** (it EMITS `complete_habit_occurrence`/
`contribute_purpose_metric`/`award_xp`), not a handler OWNER. `registerGamificationEffects` exists because
gamification OWNS the economy handlers; habits owns none, so it registers nothing on the rail. `[FACT: packages/core/src/services/gamification/journal.ts:66-74 (registerGamificationJournal = the pattern; registerGamificationEffects registers economy handlers gamification owns); foundation/effects/CLAUDE.md (per-module handlers registered by owners)]`

## 4. Typed errors (fail-loud, `.name` set)
- `BackfillWindowError` (S3) — backfill beyond the configured window; no row written. `[FACT: parts/habits.md:23; contract.md:54]`
- `MetricContributionError` (S5) — purpose contribution failed; **completion still persists**, contribution flagged, never silently dropped (IR-5). `[FACT: parts/habits.md:29; contract.md:56-57]`
- `ZodError` — enum/rating validation (habit config; ratings 1–5). `[FACT: parts/habits.md:34; contract.md:55]`
- (No bespoke not-found error — `Repository.update/delete` throw on a missing row; finance dropped its redundant guard. `[FACT: TASKS.md finance S1 decision]`)

## 5. Cross-module ports — direction + ownership (interpretation ORGANIZATION)
| Port | Direction | Owner | ① behavior (deny-safe) |
|------|-----------|-------|------------------------|
| `effects` (rail+registry) | ① emits | Sessions/AR-7 (rail) | guarded post-commit `applyEffect`; no-op if registry unresolved; idempotent via R1 |
| `contributions` | ① emits `contribute_purpose_metric` | Purpose | Purpose owns the metric write; ① never writes `purpose_metric_value` |
| economy (`award_xp`→`grant_currency`) | ① emits via `effects` | Gamification | ① never writes `consequence_ledger` (R2) |
| `prefs` | ① reads | Preferences | `habit_backfill_window_days` (S3) + `push_habits` schedule expose (S5); **permissive (fail-OPEN)** default — null window = no limit (a user convenience policy, NOT a fail-closed security gate) |
| `associations` | ① reads/writes | Spaces | `entity_tags` (SP1); absent → `[]` |
| `notes` | ① delegates | Notes & Pages | habit notes = `pages` row (`entity_type='habit'`); never inline |
| `project_habits` | ① reads/writes (owned junction) | Habits (KEPT) | navigational; C1 — never retired |

## 6. What ② `fe-habits` builds against this seam
The 4 view surfaces (Dashboard · today-list Calendar/List/Checkbox · per-habit standalone · All-Habits Overview),
optimistic completion apply/revert, detailed-log affordance, streak badges, analytics charts, calendar backfill UI,
and the flag/revert surface — all consume the read/write operations above. `[FACT: parts/habits.md:5; identity.md:17-21]`

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-23 | 2026-09-23-mod-habits | initial seam-contract — factory + deps ports + operation surface + typed errors + cross-module port ownership table, ratified from parts/habits.md + the service precedents |
