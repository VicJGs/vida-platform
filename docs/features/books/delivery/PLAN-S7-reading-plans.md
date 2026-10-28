# PLAN — S7: Reading plans / Quota Planner (BOO-27/28/29/30/31/32/33)

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice 7 of 10.
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §0 Documentation grounding (authority trace — the intent source for every S7 element)

> The aspect docs + the Part-1.2 rerun driver-tokens are the intent authority; they outrank the slice-map/seam-contract.

| S7 element                                                                                                                                   | Authoritative doc source (intent)                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| plan family = `reading_plans` + `reading_plan_books` junction                                                                                | schema `schema/books.ts:165-188` · `structure-data.md:26` ("the Quota Planner") · BR-BK (db-4-books)                                                                                                                                                               |
| `arrangement` ∈ {sequenced, parallel}; `goal` ∈ {manual, auto}; `target` = date·weekday·day-of-month                                         | **BK-11** (`business-rules.md:56-61`) · `contract.md:28` (`createPlan`) · `@vida/types` `READING_PLAN_ARRANGEMENT`/`READING_PLAN_GOAL_TYPE`                                                                                                                        |
| **NO stored measurement axes** — the pursuable goal is Purpose/target-owned; Books NAMES the axes (quantitative × derived-pull), stores none | **C-M1** (rerun `books.md:71,79,87,136`, "Do NOT assert a stored `books.measurement_kind`; the pursuable is the reading-plan goal — Purpose/target-owned; Books absent from L240") · the exact default values deferred (`rerun §5:157` "this unit NAMES the axes") |
| **Books owns plans; consumers consume** (Study Planner reads, never writes)                                                                  | **BK-12** (`business-rules.md:62-64`) · `conventions.md` ("Never let the Study Planner write reading plans")                                                                                                                                                       |
| auto-goal = **arithmetic over days-until-target** (mature core); Calendar-slot reconciliation **visibly stubbed** (forward dep)              | **BOO-28** (`parts/books.md:38`) · BK-11 · `structure-data.md:48-49` · `rerun §5` (Calendar forward dep)                                                                                                                                                           |
| quota distribution — sequenced = A-then-B ordering; parallel = quota split across books                                                      | **BOO-29** (`parts/books.md:39`) · BK-11/BK-15                                                                                                                                                                                                                     |
| recalculation **never silently drops the target**; `TargetUnreachableProposal` (extend date / raise quota)                                   | **BOO-32** (`parts/books.md:42`) · `business-rules.md:128-129` (fail-loud) · `conventions.md:28-29` · `contract.md:30,67`                                                                                                                                          |
| `getTodayQuotas` = Reading Hub + **Journal `/summary`** provider                                                                             | **BOO-30** (`parts/books.md:40`) · `contract.md:29`                                                                                                                                                                                                                |
| quota computations + projections are **derived** (React-Query), never hand-maintained                                                        | `structure-data.md:38-41` ("React Query owns … quota computations + projections; … derived — never hand-maintained")                                                                                                                                               |
| `quota_distribution` / `recalculation_state` are **stored** `json<Record>` columns                                                           | schema `schema/books.ts:171-172` (the plan's computed state — written at create/recalc)                                                                                                                                                                            |
| intake resolutions                                                                                                                           | `intake/books.md` B6 (quotas) · B9 (plan goal) · B15 (user-arranged)                                                                                                                                                                                               |

**Nothing is deferred that this slice owns.** The exact `measurement_kind`/`binding_mode` default _values_ for a
pursued reading goal are the one genuinely-deferred item (`rerun §5:157` → build-phase + ADR-011 + Purpose owner) —
but C-M1 settles that they are **NOT stored on `reading_plans`** and the pursuit is **Purpose-owned** (Purpose is
unbuilt — `services/purposes` is a CLAUDE.md only), so S7 takes **no measurement/Purpose dep** and writes no axis.
Calendar-slot reconciliation is a documented forward-dep stub (BOO-28). Both are homed, not open.

## §1 Context (ground truth)

- **BASELINE clean.** No code changed since S6 (`92e5b30`); `current-*` end at BR-BK-S6-8. Nothing to regenerate.
- **Scope: 7 legs** — BOO-27 (`createPlan`), BOO-28 (auto-goal derivation), BOO-29 (quota distribution), BOO-30
  (`getTodayQuotas`), BOO-31 (`recordQuotaProgress`), BOO-32 (`recalculate`), BOO-33 (`getProjection`). `[slice-map.md:21]`
- **Schema exists — NO migration.** `reading_plans` (`arrangement`/`goal_type` enums notNull, `target_date`,
  `target_completion_date`, `quota_distribution` json, `recalculation_state` json, `deleted_at`) +
  `reading_plan_books` (`plan_id`, `book_id`, `sequence`, `quota`, `deleted_at`) are live (`schema/books.ts:165-188`).
- **NO new deps.** S7 is self-contained: `reading_plans`/`reading_plan_books` repos + the existing `booksRepo`
  (page basis for the arithmetic) + `readingRepo` (crediting a session's pages in `recordQuotaProgress`). No
  measurement dep (C-M1), no Purpose (unbuilt), no Calendar (forward-dep). `[seam-contract.md:109-114]`
- **The frozen seam-contract pins the surface** (`seam-contract.md:109-114`): `createPlan(input): ReadingPlan` ·
  `getTodayQuotas(): TodayQuotas` · `recordQuotaProgress(planId, sessionRef): void` · `recalculate(planId):
ReadingPlan` · `getProjection(planId): PlanProjection`. `TargetUnreachableProposal` is the typed recalc error
  (`seam-contract.md:59`).

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S7-\*)

- **BR-BK-S7-1 (`createPlan` — Books-owned, arrangement/goal/target, NO axes / BOO-27, BK-11/BK-12, C-M1).**
  `createPlan({ books: {bookId, sequence?}[], arrangement, goalType, targetDate, quota? })` validates (`arrangement`
  ∈ `READING_PLAN_ARRANGEMENT`, `goalType` ∈ `READING_PLAN_GOAL_TYPE`, ≥1 book, each book guarded exists →
  `BookNotFoundError`), creates a `reading_plans` row + one `reading_plan_books` row per book (with `sequence` for
  `sequenced`), computes the initial `quota_distribution` (BR-BK-S7-2), and stores it. **No `measurement_kind`/
  `binding_mode` is written** (C-M1 — the pursuable goal is Purpose-owned; `reading_plans` has no such column). A
  `manual` goal takes the caller's `quota`; an `auto` goal derives it. `[business-rules.md:56-64; rerun C-M1 books.md:71]`
- **BR-BK-S7-2 (auto-goal + quota distribution — arithmetic, Calendar stubbed / BOO-28/29, BK-11).** For `goal='auto'`
  the daily quota is **arithmetic over days-until-target**: `totalPages = Σ book.total_pages` (books with no
  `total_pages` contribute 0 — honest, not guessed), `days = max(1, targetDate − today)`, `dailyQuota = ceil(totalPages
/ days)`. Distribution: **sequenced** orders books by `sequence` and allocates days per book proportional to pages
  (A-then-B); **parallel** splits the daily quota across books by page share. The **Calendar-slot reconciliation**
  (free-time slots from Routines) is a **visibly-stubbed forward dep** — `quota_distribution.calendarReconciled=false`
  is stamped so the P6 Hub renders the stub honestly. `[parts/books.md:38-39; structure-data.md:48-49; rerun §5]`
- **BR-BK-S7-3 (`getTodayQuotas` — derived Hub + Journal provider / BOO-30).** `getTodayQuotas()` derives, per active
  (non-deleted) plan, today's `{ planId, target, done, status: 'on-pace'|'behind'|'ahead' }` from the stored
  `quota_distribution` + the plan's recorded progress (`recalculation_state`). **Derived on read, never stored**
  (`structure-data.md:38-41`). The shape feeds the Reading Hub strip AND the daily-Journal `/summary` block
  (`registerBooksJournal` composes it at S10). `[contract.md:29; parts/books.md:40]`
- **BR-BK-S7-4 (`recordQuotaProgress` — link a session's pages to the plan / BOO-31).** `recordQuotaProgress(planId,
sessionRef)` guards the plan exists (`ReadingPlanNotFoundError`), reads the referenced `reading_sessions` row
  (`sessionRef` = a reading session id; its `pages_read ?? 0` is the contribution), and credits it into the plan's
  `recalculation_state` running progress (serialized json). Idempotent per `sessionRef` (a re-record of the same
  session does not double-count — the running state keys by session id). `[contract.md:29; parts/books.md:41]`
- **BR-BK-S7-5 (`recalculate` — reshape or propose, never silent drop / BOO-32, BK-11).** `recalculate(planId)`
  guards exists and computes `requiredDailyQuota = ceil(remainingPages / max(1, remainingDays))`. **When on/ahead of
  the planned pace** (`requiredDailyQuota ≤ the stored original `dailyQuota``) it reshapes silently — redistributes the
remaining pages over the remaining days, stamps `recalculation_state`, returns the reshaped `ReadingPlan`. **When
behind** (`requiredDailyQuota > original dailyQuota`, OR `remainingDays ≤ 0` with pages left) it throws
**`TargetUnreachableProposal`** carrying `{ options: ['extend_date','raise_quota'], suggestedDate (keeps the
  original pace), suggestedQuota (= requiredDailyQuota, keeps the date) }`— **never a silent rewrite** of the
target (the user chooses).`remainingDays ≤ 0`⇒ only`extend_date` is viable (`suggestedQuota`omitted). This is
the grounded reading of BOO-32's two named options (extend date / raise quota).`[business-rules.md:56-61,128-129;
  conventions.md:28-29; contract.md:30,67; parts/books.md:42]`
- **BR-BK-S7-6 (`getProjection` — derived trajectory / BOO-33).** `getProjection(planId)` guards exists and derives
  `{ planId, projectedCompletionDate, onTrack, remainingPages, remainingDays }` from the stored distribution + recorded
  progress (arithmetic; Calendar stubbed). Derived on read, never stored. `[contract.md:30; structure-data.md:48]`
- **BR-BK-S7-7 (BK-12 ownership — Books-only writes).** `createPlan`/`recordQuotaProgress`/`recalculate` are
  Books-only writes; S7 exposes **no** plan-write surface to consumers. The Study-Planner read-provider
  (`getPlansForConsumer`) is **S10/BOO-45** (not here). `[business-rules.md:62-64; slice-map.md:24]`
- **BR-BK-S7-8 (persistence / json write boundary / N-fold).** `reading_plans` repo = `softDelete:true`,
  `encryptedFields:[]` (plan rows carry no [E]); `reading_plan_books` repo = `softDelete:true`. `quota_distribution`
  - `recalculation_state` are `json<Record>` columns **WRITTEN** this slice → the service `JSON.stringify`s on write +
    parses defensively on read (the knowledge `key_concepts` precedent — one cast per boundary;
    [[json-t-columns-need-service-serialize-in-m10]]). `@vida/types` `ReadingPlan` + `ReadingPlanBook` interfaces added
    (the N-fold). `[schema/books.ts:165-188; structure-data.md:38]`

## §3 Deferred (homed, not built here)

- **The `measurement_kind`/`binding_mode` default values for a pursued reading goal** → build-phase + ADR-011 +
  **Purpose** (unbuilt). C-M1: not stored on `reading_plans`; S7 names the axes (quantitative/derived-pull), writes
  none. `[rerun §5:157; C-M1 books.md:71]`
- **Calendar-slot reconciliation** (free-time slots from Routines) → forward dep; S7 stamps `calendarReconciled=false`
  and uses days-until-target arithmetic. `[BOO-28; structure-data.md:48-49]`
- **Study-Planner read-provider** (`getPlansForConsumer`) → **S10/BOO-45** (consumers consume; BK-12). `[slice-map.md:24]`
- **`registerBooksJournal`** (composes `getTodayQuotas` into the Journal `/summary`) → **S10/BOO-30** (counted at its
  S7 home; the Journal wiring is S10). `[slice-map.md:24,28-29]`
- **All plan UI** (Plan wizard, All Plans list, per-plan page, quota rings, recalc-proposal alerts) → `fe-books` P6.

## §4 Acceptance (the live-store Verification Gate maps 1:1)

Live-store (REAL better-sqlite3, Node 24), fixtures = books with `total_pages`:

1. **createPlan (auto, parallel)** — creates the plan + one `reading_plan_books` row per book; `quota_distribution`
   round-trips through JSON (stored + parsed); `calendarReconciled=false`. Unknown book ⇒ `BookNotFoundError`; empty
   books ⇒ validation reject.
2. **createPlan (manual)** — stores the caller's `quota`; no auto-derivation overrides it.
3. **auto-goal arithmetic** — a 300-page plan over 10 days ⇒ `dailyQuota = 30`; a book with no `total_pages`
   contributes 0 (not guessed).
4. **getTodayQuotas** — derives per-plan `{target, done, status}`; status is `behind` when progress < expected-by-today,
   `ahead` when >, `on-pace` otherwise; returns `[]` when no active plan.
5. **recordQuotaProgress** — credits a reading session's `pages_read` to the plan's running state; re-recording the
   same `sessionRef` does not double-count; unknown plan ⇒ `ReadingPlanNotFoundError`.
6. **recalculate — reshape** — after a shortfall, the distribution reshapes over remaining pages/days; returns the
   updated `ReadingPlan`; `recalculation_state` round-trips JSON.
7. **recalculate — unreachable** — a target that cannot be met throws `TargetUnreachableProposal` carrying
   `options: ['extend_date','raise_quota']` (never a silent target rewrite).
8. **getProjection** — derives `{projectedCompletionDate, onTrack, remainingPages, remainingDays}`; unknown plan ⇒
   `ReadingPlanNotFoundError`.

@vida/core suite stays green (1496 + new S7 tests); tsc 0; eslint 0; gitleaks clean.

## §5 Implementation prompt (type-first; factory-object; no `this.`)

**(a) `@vida/types`** — add `ReadingPlan` (mirror `reading_plans`: `arrangement: ReadingPlanArrangement`, `goal_type:
ReadingPlanGoalType`, `target_date`/`target_completion_date: string|null`, `quota_distribution`/`recalculation_state:
Record<string,unknown>|null`, `deleted_at`) + `ReadingPlanBook` (mirror `reading_plan_books`: `plan_id`, `book_id`,
`sequence: number|null`, `quota: number|null`, `deleted_at`).

**(b) `validators/books.ts`** — `CreatePlanSchema` (`books: {bookId: string, sequence?: int}[] min(1)`, `arrangement:
ReadingPlanArrangementSchema`, `goalType: ReadingPlanGoalTypeSchema`, `targetDate: string` YYYY-MM-DD, `quota?: int
positive` for manual). (Enum Zod schemas reused from `validators/learning.ts`.)

**(c) `services/books/types.ts`** — service-layer types: `CreatePlanInput` (`z.infer`), `TodayQuota`/`TodayQuotas`
(`{ planId; target; done; status: 'on-pace'|'behind'|'ahead' }[]`), `PlanProjection`, `QuotaDistribution` (internal
json shape: `{ dailyQuota; perBook: Record<bookId, number>; calendarReconciled: false }`), `RecalculationState`
(internal: `{ progressBySession: Record<sessionId, number>; pagesDone: number }`); errors `ReadingPlanNotFoundError`

- `TargetUnreachableProposal` (an `Error` carrying `options: ('extend_date'|'raise_quota')[]` + `suggestedDate?` +
  `suggestedQuota?`). Add the 5 methods to `BooksService` after `openReader`. A `today: () => string` injection is NOT
  added — use the existing calendar-date helper / `new Date()` boundary the service already uses for dates (ground the
  "today" source in the repo convention before coding; if none exists, pass `asOf?` through the derived reads).

**(d) `services/books/service.ts`** — `plansRepo` (`reading_plans`, softDelete:true) + `planBooksRepo`
(`reading_plan_books`, softDelete:true); `toReadingPlan`/`toReadingPlanBook` mappers (parse the json columns +
`_sync_status` cast); pure helpers `computeDistribution(books, arrangement, goalType, days, manualQuota?)` +
`deriveTodayStatus(dist, state, asOf)` + `deriveProjection(...)` + `daysBetween(fromISO, toISO)` (parse both
`YYYY-MM-DD` as `Date.UTC` → day diff, TZ-consistent) + `todayISO()` (`Date.now()` → `YYYY-MM-DD`); the 5 methods
(hoisted closures, no `this.`), `JSON.stringify`-ing `quota_distribution`/`recalculation_state` on every write.
**`createPlan` writes the plan row + N `reading_plan_books` rows ATOMICALLY** via `db.transaction(tx => { plansRepo
.createInTx(tx, …); for (book) planBooksRepo.createInTx(tx, …) })` — both tables are Books-local, so the atomic
option IS available here (unlike S6's cross-service compose). The derived reads accept `asOf?: string` (default
`todayISO()`) for deterministic tests.

**(e) D6 / §XXIX** — refresh `current-spec.md` (method rows + persistence addendum) + `current-business-rules.md`
(BR-BK-S7-1..8) in the SHIP commit.

**Order:** @vida/types (2 interfaces) → validators → types (inputs + derived shapes + errors) → repos + mappers →
pure derivation helpers → createPlan → getTodayQuotas → recordQuotaProgress → recalculate → getProjection →
interface/barrel wiring → tsc → Verification Gate → code-review → currency.

## §6 g1 resolution (interpretations pre-grounded in the corpus)

- **R1 — NO measurement axis is written (C-M1).** The reading-plan goal is "a pursuable target" _conceptually_
  (quantitative/derived-pull), but `reading_plans` has no `measurement_kind`/`binding_mode` column and Books is
  absent from the L240 pursuable set — the pursuit is Purpose-owned (and Purpose is unbuilt). S7 stores
  `arrangement`/`goal_type`/`target_date` only; it takes no measurement/Purpose dep. Inventing an axis column or a
  Purpose-target write would violate C-M1. `[FACT: rerun C-M1 books.md:71,87; seam-contract.md:110]`
- **R2 — `quota_distribution`/`recalculation_state` ARE written (not dormant like S6 `statistics`).** They hold the
  plan's computed state (set at create/recalc; progress credited at `recordQuotaProgress`) — so the service
  `JSON.stringify`s on write + parses on read, the real json<T> boundary (the knowledge precedent). `getTodayQuotas`/
  `getProjection` DERIVE on read from these stored blobs (no third stored "status" column). `[FACT: schema/books.ts:171-172;
structure-data.md:38-41]`
- **R3 — Calendar reconciliation is a stamped stub, not omitted.** `quota_distribution.calendarReconciled=false` is
  written so the forward-dep is _visible_ (BOO-28 "renders visibly stubbed"), not silently absent. The M1 arithmetic
  is days-until-target. `[FACT: parts/books.md:38; structure-data.md:48-49]`
- **R4 — `TargetUnreachableProposal` is a thrown typed error carrying options, not a return variant.** The frozen
  seam-contract lists it among the errors (`seam-contract.md:59`) and `recalculate` returns `ReadingPlan` on the
  happy path; BOO-32 "never a silent rewrite" ⇒ the unreachable case must interrupt (throw), carrying the
  extend-date / raise-quota options. `[FACT: seam-contract.md:59; parts/books.md:42; conventions.md:28-29]`
- **R5 — `recordQuotaProgress` idempotency keys by `sessionRef`.** The running state stores
  `progressBySession[sessionId] = pages`, so a replay overwrites (not adds) — no double-count (the append-only/
  derive-on-read discipline). `[FACT: parts/books.md:41; the flashcards review_events idempotency precedent]`
- **R6 (preflight — `createPlan` is ATOMIC).** Unlike S6's forced non-atomic cross-service compose, both
  `reading_plans` and `reading_plan_books` are Books-local tables, so the plan row + its N junction rows write in ONE
  `db.transaction` via `createInTx` (`repository.ts:195`) — no orphan-plan window. `[FACT: repository.ts:195,326; ADR-004 §3.4]`
- **"today" source (preflight — resolved, no clock dep).** `calendarDate` is plain `YYYY-MM-DD` TEXT with no
  now-helper (`_shared.ts:17`); the service already uses `Date.now()` for timestamps (`service.ts:659`). The
  derivations compute `todayISO()` from `Date.now()` and diff dates by parsing both `YYYY-MM-DD` as `Date.UTC`
  (TZ-consistent — both sides same basis). An optional `asOf?: string` on the derived reads is the determinism seam
  for tests; NO clock dep is injected. `[FACT: _shared.ts:17; service.ts:659]`
