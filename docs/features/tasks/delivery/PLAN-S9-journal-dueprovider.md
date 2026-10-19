<!-- Forward spec — Tasks ① S9 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Rev 3 (2026-10-18, after Victor's "nothing is open — check the documentation"): the summary content, the day
     convention, the lane predicate and the agenda semantics are ALL doc-fixed (cross-module-integration.md §2 ·
     the shipped UTC-day convention (6 modules, 7 sites) · sessions intake G2-shape + tasks intake G6 + IA:103 · JR-5). Rev 1–2's
     four "interpretations" were drift from precedent-reading; they are retired below with their doc source. -->

# PLAN S9 — Journal summary + DueProvider (the ① closer)

> Slice-map S9 (`slice-map.md:33`): `summary(date)` ("completed today" via `completed_at` + due via `due_date`/
> `scheduled_date`) + `getDueReminders(range)` + `registerTasksJournal` + `registerTasksDueProvider`; TAS-29 (config
> schema, RATIFY), TAS-32 + TAS-36 (the ① typed-error halves, RATIFY). Closes with the live-store Verification Gate;
> then PR → LIF-142 Done.

## Grounding (what the docs FIX — No-Guessing; every rule below is FACT-sourced)

**Pattern in use (§XXIV, 3+ implementations read):** `projects/journal.ts` · `purposes/journal.ts` + `service.ts:
878-911` · `relationships/journal.ts` + `service.ts:139-145,502-562,700-715` — a module's journal presence = ONE
file `journal.ts` with a summary-only `JournalContribution` wrapping a service day-read + a `register<X>DueProvider
(sessions, svc)` lane wrapping a service range-read; registry handles are PARAMS to the helpers, never service deps;
`state = any data ? 'success' : 'empty'`; the journal names no module (JR-3). Followed.

- **The governing doc for the summary's CONTENT.** `[FACT: docs/core/architecture/cross-module-integration.md:7-8
  "Governs: All integration features — the daily-summary aggregation"; §2:61-72]` "The journal daily summary block
  (`/summary`) aggregates data from exactly six modules … **Tasks | Tasks completed or due on the date: title,
  status, priority | `tasks` WHERE `due_date = ?` OR completed on date | `tasks`**". `[FACT: docs/features/tasks/
  contract.md:32]` refines "due" to BOTH date columns: "'completed today' reads `completed_at` (TK-6) + due-today via
  `due_date`/`scheduled_date`". `[FACT: intake G5:60]` `completed_at` exists "for journal `/summary` 'completed
  today'". ⇒ the summary is the **set of tasks** `{ due_date = date ∨ scheduled_date = date ∨ dayOf(completed_at) =
  date }`, each carrying `title · status · priority`. A LIST with fields — not counts (the 10 shipped count-shaped
  contributions follow their own module docs; tasks' doc names the fields). No parent filter in the predicate ⇒ every
  task row (sub-tasks included). No exclusion clause ⇒ a task completed today that was also due today is ONE member
  of the set (a set union), with `status` carried so the ② renders it as done. (Caveat `[FACT: :10-14]`: the doc is
  the TARGET integration model, "not a snapshot of shipped code … code/directory homes are decided in a later
  structural phase" — S9 takes its §2 CONTENT, which `:7-8` governs; its `:84-86` code homes
  (`journal-service.ts`, `daily-summary.ts`) are not files to create.)
- **"The date" of a timestamp = the UTC calendar day — the shipped platform convention.** `[FACT: 7 sites across 6 modules derive
  a day from now/ms as `new Date(ms).toISOString().slice(0,10)`: habits/service.ts:129 (`clock`), finance:134,
  books:230-231, checkins:441, purposes:969-974, relationships:141 (`msToISO`), 240]`; the governing doc writes the
  same for the one other ms-stamped provider `[FACT: cross-module-integration.md:70 Learning "`study_sessions`
  WHERE date(`started_at`) = ?"]`; `[FACT: ADR-002:62]` timestamps are Unix ms "to avoid timezone ambiguity";
  `[FACT: ADR-002:3381]` the designed user `timezone` defaults to `'UTC'`. ⇒ `dayOf(completed_at)` is the UTC day.
  **Pre-existing divergence, NOT touched by S9 (flagged):** tasks' own `todayYmd()` (`service.ts:175-178`, the S5
  regen anchor fallback when `due_date` is null) is LOCAL by the S5 g2 N4 decision — the one non-UTC day helper in
  `@vida/core`. Aligning it is a §XXVIII change to a shipped BR (BR-TK-S5), out of S9's slice; recorded in the
  task file for Victor's call.
- **Journal = PULL, not push (ADR-004 §3.2.5).** `[FACT: ADR-004:84]` `surface_journal · surface_calendar` are
  PROJECTION effects: "writes no row — Journal/Calendar are pull-aggregated at render"; `[FACT: service.ts:214]` S3
  does not push them. ⇒ S9 adds NO rail emission; it registers the pull reader.
- **The contribution shape.** `[FACT: journals/types.ts:58-64]` `JournalContribution { module; sectionKey;
  dataPoints; summary(date): SectionData; dueIn?(range) }`; `[FACT: :43-49]` `SectionData.items` = "the app-shaped
  payload, opaque at the seam". `[FACT: journals BR-S1-3]` register overwrites by `module`. `[FACT: journals
  BR-S2-2/S2-5]` a throwing `summary` degrades its section only. `[FACT: JR-4]` a contribution advertises
  user-selectable data points. `[FACT: journals/contract.md:27-28; parts/journals.md JOU-28]` Tasks is a named
  present-day provider.
- **Where the agenda lane registers — doc-derived.** `[FACT: journals/contract.md:27-28,32]` "`dueIn(range)` for the
  agenda … Sessions & Scheduling: the `dueIn()` primitive (agenda)"; `[FACT: JR-3, JR-5]` a module "reuses
  `dueIn(range)`", "Agenda reads the shared `dueIn()` primitive (also feeding Sessions + the Global Calendar)";
  `[FACT: sessions BR SS-7]` "Aggregator, never duplicator". ⇒ ONE registration, on Sessions' SS-7 seam
  (`registerDueProvider`); a second registration as `JournalContribution.dueIn` would double-list tasks once the
  journals agenda reads Sessions. The two shipped two-lane modules did exactly this `[FACT: purposes/journal.ts:
  27-28; relationships/journal.ts:8-9]`. Consequence: in M1 `buildDashboard().agenda` carries no tasks section (the
  built engine reads only `JournalContribution.dueIn`, `dashboard.ts:51-54`); the journals→Sessions bridge is
  journals' contract (`contract.md:32`), not S9's.
- **What the lane carries — doc-derived.** `[FACT: docs/intake/sessions-and-scheduling.md:102-107 G2-shape, Victor
  07-10]` "a module-owned **due-bucket** resolved LIVE by its owner … `dueIn(range) → DueItem[]` ({ref_id, label,
  est_minutes, urgency, hard_deadline?})"; `[FACT: :113-117]` "Global Calendar = READER … tasks, reminders, habits
  … SHARE the `dueIn()` provider primitive. Without the Planner the Calendar shows only deadlines"; `[FACT:
  information-architecture.md:103]` "Calendar (dueIn aggregator)" — the Calendar sees tasks ONLY through this lane;
  `[FACT: TAS-19; rerun G-S4:60]` `surface_calendar (due/scheduled)` — the calendar surfaces BOTH dates; `[FACT:
  interpretation.md:88 D1]` calendar = read-seam over `due_date`/`scheduled_date` + `dueIn`; `[FACT: intake G6:62]`
  `scheduled_date` = "plan to work on it (drives Today/Calendar)", `due_date` = deadline. ⇒ a task is due work in
  `range` when its `due_date` OR its `scheduled_date` falls in it; its `hard_deadline` is the `due_date` (the
  deadline; absent when the task has none). `DueItem` has no position field — the consumer positions by its own
  range query (Journals: one day) or by `hard_deadline` (Calendar) — so no "placement" notion exists to define.
  `[FACT: JR-5; journals/identity.md:8-9]` the agenda is the FORWARD half, "what's due" (the summary is "what
  happened") ⇒ a completed task is not due work: the lane reads OPEN tasks (the shipped lane encodes the same:
  `relationships/service.ts:521` `if (r.is_completed) continue`).
- **Shapes + window math.** `[FACT: sessions/types.ts:218-238]` `TimeRange` ms inclusive; `DueItem`; `DueProvider`.
  `[FACT: sessions/service.ts:729]` `urgency: 0 // the deferred algorithm (M1.2)`. `[FACT: sessions BR-34]` a
  throwing lane is skipped. `[FACT: relationships/__tests__ :56; purposes/__tests__ :894,:910-912]` CALLERS build
  `TimeRange` bounds as UTC-midnight ms (`Date.parse(ymd+'T00:00:00Z')`) and both shipped providers convert their
  calendar dates the same way `[FACT: purposes/service.ts:891; relationships/service.ts:143]` — the same UTC-day
  convention as above, so a calendar date and a UTC-bucketed timestamp agree on "the date".
- **TAS-29 "the one config schema the 12 renderers consume."** `[FACT: TAS-29 col 5; conventions.md:14]` = a `views`
  row config. `[FACT: types.ts:137-151,159-163; validators SaveTaskViewSchema]` S8 ships it. ⇒ RATIFY + NAME both
  halves (type + Zod validator) so the ② imports the schema by its TAS-29 name. The 12→7 mapping is owed to the 007
  pass `[FACT: schema-audit-deferred-homes.md:281-282; rerun G-V1:49, C8:75]`.
- **TAS-32 / TAS-36 "errors".** `[FACT: TAS-32]` service half = "per-group typed error" → resolved at S7 as the
  group's `state:'degraded'` (BR-TK-S7-5; PLAN-S7 "no new typed error"). `[FACT: TAS-36]` service half = "typed
  errors" → the 10 shipped `Error` subclasses with stable `.name` `[FACT: types.ts:256-339]`. ⇒ both RATIFY; a
  surface-guard test (the xs-backlinks precedent), no new error.
- **Deps.** `[FACT: types.ts:35-64]` `sessions?` exists (S4); the register helper takes `sessions` as a PARAM (both
  precedents). `[FACT: grep services/sessions — no import of services/tasks]` a type-only `../sessions` import in
  `service.ts` adds no cycle; the structural gates forbid `services/(projects|relationships|learning|languages)` +
  the `db/schema` barrel only `[FACT: __tests__ :1116-1126, :1400-1409]` — unaffected.

## What is already built (the grounding floor)
`createJournalRegistry` + `buildDashboard` (journals S1/S2) · `SessionsService.dueIn`/`registerDueProvider` (sessions
S7) · three two-lane precedents · tasks S1–S8 (`listTasks` soft-delete-filtered; `completeTask` the sole
`completed_at` writer `[FACT: service.ts:415]`, `reopenTask` clears it `[:470]`; `due_date`/`scheduled_date`
`calendarDate`, `completed_at` `timestampMs` `[FACT: schema/tasks.ts:60-64]`; the S5 `process.env.TZ` runtime
test pattern `:768-786`). Zero tasks registrations anywhere (first-consumer-pull).

## Scope
**In (net-new, all on the built floor):**
1. **`getDayTasksSummary(date): TasksDaySummaryItem[]`** — service method: the §2 set, projected to the §2 fields.
2. **`getDueReminders(range: TimeRange): DueItem[]`** — service method (seam-contract name), the SS-7 lane producer.
3. **`services/tasks/journal.ts`** — `createTasksJournalContribution(svc)` · `registerTasksJournal(registry, svc)` ·
   `registerTasksDueProvider(sessions, svc)`; barrel `index.ts += export * from './journal'`.
4. **`utcDay(ms): string`** — exported pure helper (the platform convention, `toISOString().slice(0,10)`), next to
   `resolveBindingMode`/`deriveTaskLeaf` (the "exported for direct unit test" precedent). `todayYmd()` is NOT
   touched (flagged divergence, above).
5. **TAS-29 RATIFY + name:** `export type TaskViewConfig = TaskViewPreset['view']` (types.ts) + `export const
   TaskViewConfigSchema = SaveTaskViewSchema.omit({ id: true, space_id: true })` (validators/task.ts).
6. **TAS-32/36 RATIFY:** a surface-guard test over the 10 exported errors (`instanceof Error`, `.name` = class name).

**Deferred — each traced to its DOC home:**
- **Urgency ranking** (`urgency:0`) → ADR-004 §3.3 L139 "does NOT specify the scheduling/placement algorithm
  (urgency scoring, …)"; `parts/xcut-sessions.md:45,83` UNKNOWN-1 → G5 design-pass. Every shipped lane emits 0.
- **A user-timezone day bucket** → the designed `user_profile.timezone` (`ADR-002:3370-3381`, not built — `grep
  db/schema/` none); journals BR-S3-4 "strict tz-aware today = design-pass". Until then the UTC convention applies;
  `utcDay` is the one seam to re-point.
- **Composition-root CALLS** of the two helpers → `docs/roadmap/MVP-PATH.md:108-111` ("composition root … homed
  UI-3 / M1.1+"); `projects/types.ts:31`. S9 ships the helpers, not the call.
- **The 12→7 layout mapping** → `schema-audit-deferred-homes.md:281-282` (ADR-007 anatomy design-pass).

**Retired (rev 1–2 items the docs close — not deferrals, not interpretations):**
- "Overdue carry-forward" — zero doc hits; the lane's contract IS the window (SS-7 "read live via `dueIn(range)`");
  the overdue read ships as `listTasks({ completed:false, due_before })` `[FACT: types.ts:122-123]`.
- "Counts only" / "completed ∉ due" / "grain" / "local day" / "placement" — each fixed by the Grounding above.
- `JournalContribution.dueIn` — excluded by SS-7 (one registration, on Sessions).

## Operations
```ts
// The §2 journal set (cross-module-integration.md:68 ∘ contract.md:32) — a LIST with the §2 fields; never throws for data
getDayTasksSummary(date: string): Promise<TasksDaySummaryItem[]>
// The SS-7 due-bucket (G2-shape) — OPEN tasks due OR scheduled in the ms window; hard_deadline = due_date
getDueReminders(range: TimeRange): Promise<DueItem[]>
// journal.ts — exported helpers (the precedent file), NOT service methods
createTasksJournalContribution(svc: TasksService): JournalContribution   // module:'tasks', sectionKey:'summary', summary-only
registerTasksJournal(registry: JournalRegistry, svc: TasksService): void
registerTasksDueProvider(sessions: SessionsService, svc: TasksService): void  // sessions.registerDueProvider({ module:'tasks', fetch: svc.getDueReminders })
```

## Types (net-new)
```ts
/** One member of the day's journal set (cross-module-integration.md §2: "title, status, priority"; `id` = the ADR-002
 *  universal key; the two membership flags let the ② honour the JR-4 selection without re-deriving the day). */
export interface TasksDaySummaryItem {
  id: string; title: string; status: Status; priority: Priority
  completedToday: boolean   // utcDay(completed_at) === date
  dueToday: boolean         // due_date === date || scheduled_date === date
}
/** TAS-29 — the ONE saved-view config schema the 12 renderers consume (RATIFY of S8). */
export type TaskViewConfig = TaskViewPreset['view']
export const TaskViewConfigSchema = SaveTaskViewSchema.omit({ id: true, space_id: true })   // validators/task.ts
/** service.ts — Unix ms → the UTC calendar day YYYY-MM-DD (the platform's shipped convention (6 modules, 7 sites)). */
export function utcDay(ms: number): string
```
No new typed error. `DueItem`/`TimeRange` imported (type-only) from `../sessions` — not redeclared.

## Operation flow + invariants
- **`getDayTasksSummary(date)`** — one `listTasks()` read (soft-delete filtered, every row — the §2 predicate has
  no parent filter); for each task `completedToday = t.completed_at != null && utcDay(t.completed_at) === date`
  (a `createTask({ status:'completed' })` row has `completed_at = null` — create/update never write it, BR-TK-S1-5 —
  and is NOT "completed on date": the §2 predicate is on the completion, which TK-6 defines as status + timestamp);
  `dueToday = t.due_date === date || t.scheduled_date === date` (calendar-string equality); keep `completedToday ||
  dueToday`; project to `{ id, title, status, priority, completedToday, dueToday }`. Order: `sort_order`, then
  `created_at`, then `id` codepoint (deterministic, platform-independent — the S7 lesson). Never throws for data; an
  idle or malformed `date` ⇒ `[]` (the three precedents validate nothing either; a malformed date matches nothing).
- **`createTasksJournalContribution(svc).summary(date)`** — `items = await svc.getDayTasksSummary(date)`;
  `state = items.length > 0 ? 'success' : 'empty'`; returns `{ sectionKey:'summary', module:'tasks', dataPoints:
  DATA_POINTS, state, items }`. `DATA_POINTS` = `completed_today 'Completed'` · `due_today 'Due today'` (JR-4 — the
  two §2 memberships; snake_case ids = the 10/10 shipped convention; the UX-6 `selection.test.ts:10` `'due-today'`
  is resolver test data, not a contract). Summary-only: no `dueIn` on the contribution (SS-7, see Grounding).
- **`getDueReminders(range)`** — over `listTasks()` (every row), keep OPEN tasks (`status !== 'completed'` — the
  agenda is "what's due", JR-5); `dueMs = utcMidnightMs(due_date)`, `schedMs = utcMidnightMs(scheduled_date)` with
  `utcMidnightMs(ymd) = ymd == null ? undefined : Date.parse(ymd+'T00:00:00Z')` (the purposes/relationships
  convention = the callers' bound convention); `inWindow(x) = x !== undefined && !Number.isNaN(x) && x >= start &&
  x <= end` (purposes `:900`); **keep when `inWindow(dueMs) || inWindow(schedMs)`** (G2-shape due-bucket ∪ G6
  "drives Today/Calendar"); a task with neither date is never due work. Item: `{ source_module:'tasks', ref_id:id,
  label:title, est_minutes: estimated_minutes ?? 0, urgency:0, hard_deadline: inWindow-or-not dueMs when defined
  and not NaN, else the key is OMITTED (absent — never `undefined`-valued, never `NaN`; g2 N9 wording) }`. **Order
  (deterministic, a total order — nothing fixes
  one: `sessions.dueIn` concatenates lanes unsorted `[FACT: service.ts:734-741]`):** `hard_deadline` ascending with
  undefined LAST so dated work leads (relationships `:561` coerces an absent deadline to `0` = first; tasks places
  it last), then `sort_order`, `created_at`, `id` codepoint. Never throws for data; soft-deleted excluded.
- **`registerTasksJournal(registry, svc)`** ⇒ `registry.register(createTasksJournalContribution(svc))` (overwrite-dedup
  by `'tasks'`, BR-S1-3). **`registerTasksDueProvider(sessions, svc)`** ⇒ `sessions.registerDueProvider({ module:'tasks',
  fetch: (range) => svc.getDueReminders(range) })`. Composition wiring, not service methods (SS-5).
- **No rail emission, no schema, no `@vida/types` change, no new dep, no new error.** `service.ts` gains ONE type-only
  import (`DueItem`, `TimeRange` from `../sessions`) + the `utcDay` helper; `journal.ts` imports `../journals` +
  `../sessions` types + `./types` only; `validators/task.ts` gains `TaskViewConfigSchema`.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, REAL JournalRegistry + buildDashboard + SessionsService)
Harness: the existing `setup()` + `createJournalRegistry()`/`buildDashboard` (pure) + the S4 `setupWithTimer`
sessions wiring (REAL `createSessionsService`) for the lane. Clock discipline (the S8 `:1282-1291` precedent): pin
the clock AFTER `setup()` and only around the writes; `vi.useFakeTimers({ toFake: ['Date'] })` leaves `Date.parse`/
`Date.UTC` native; `vi.useRealTimers()` + `TZ` restore in `finally`. The runtime `process.env.TZ` pattern is valid
in this suite (S5 test 11 `:768-786`, green).
1. **summary set — exact membership + fields, one date D (clock pinned at `Date.UTC(D, 12:00)`):** seed: completed-on-D
   top-level · completed-on-D **sub-task** · completed-on-D task ALSO `due_date=D` · open `due_date=D` · open
   `scheduled_date=D` · open due AND scheduled D · open `due_date=D+1` · open `due_date=D-1` · a completed-on-D task
   then `softDeleteTask`'d · a completed-on-D task then `reopenTask`'d · `createTask({ status:'completed', due_date:D })`
   (status label, `completed_at` null) · a task completed on D-1 (clock pinned at D-1 first) with `due_date=D` ⇒
   `getDayTasksSummary(D)` has exactly **8** members (**9** after the g2 N3 fold added an `open due D, sort_order:1`
   seed to pin the `sort_order` tier — it sorts LAST): the 3 completed-on-D (`completedToday:true`; the due-one also
   `dueToday:true`) · the 3 open due/scheduled-on-D (`dueToday:true`, `completedToday:false`) · the status-label row
   (`dueToday:true` via `due_date`, `completedToday:false` — no timestamp) · the completed-D-1/due-D row
   (`dueToday:true`, `completedToday:false`, `status:'completed'`); EXCLUDED: due D+1 · due D-1 · the soft-deleted ·
   the reopened (no timestamp, no date). Each item carries `id · title · status · priority`; `D+1` ⇒ exactly the
   due-D+1 task; an idle date ⇒ `[]`; `'not-a-date'` ⇒ `[]` (no throw); order by `sort_order` then `created_at`
   then `id`.
2. **`utcDay` + the day bucket are TIMEZONE-INDEPENDENT (the platform convention; the S5 TZ pattern):** the instant
   `Date.UTC(2026,9,17,20,0,0)` is 2026-10-17 20:00Z (Tokyo 10-18 05:00; São Paulo 10-17 17:00). (a) direct unit:
   `utcDay(instant) === '2026-10-17'` under BOTH `TZ=Asia/Tokyo` and `TZ=America/Sao_Paulo`; (b) live: with the
   clock pinned there, `completeTask` ⇒ `getDayTasksSummary('2026-10-17')` contains it and `'2026-10-18'` does not —
   under both TZs (a local bucket would differ between them). Matches `habits/service.ts:129`'s `clock` by construction.
3. **contribution + the REAL engine:** `module:'tasks'`, `sectionKey:'summary'`, 2 dataPoints, NO `dueIn`;
   `summary(idle)` ⇒ `state:'empty'`, `items:[]`; after one completion ⇒ `'success'` with the item;
   `registerTasksJournal(registry, svc)` then `buildDashboard(registry, D)` ⇒ `summary` contains exactly one
   `module:'tasks'` section with the items, `agenda` contains NO tasks section (the SS-7 one-registration consequence,
   not a defect); re-register ⇒ still one (overwrite-dedup); a contribution over a svc whose `getDayTasksSummary`
   rejects ⇒ `buildDashboard` yields that section `state:'error'` and still resolves (BR-S2-2 integration check).
4. **getDueReminders — the G2-shape ∪ G6 predicate + window:** window `[ms('2026-10-10'), ms('2026-10-20')]`
   (`ms` = UTC-midnight): open `due_date=10-15` ⇒ IN, `hard_deadline=ms(10-15)`; open `scheduled_date=10-12,
   due_date=10-30` ⇒ IN (scheduled in window), `hard_deadline=ms(10-30)`; open `scheduled_date=10-05, due_date=10-15`
   ⇒ IN (due in window), `hard_deadline=ms(10-15)`; open `scheduled_date=10-05, due_date=10-08` ⇒ OUT (neither in
   window); open `scheduled_date=10-12` only ⇒ IN, `hard_deadline` **absent** (`undefined`, not `NaN`); open with
   neither date ⇒ OUT; **completed** `due_date=10-15` ⇒ OUT (not due work); soft-deleted dated ⇒ OUT; a dated
   **sub-task** ⇒ IN; bounds inclusive (`due_date=10-10` and `=10-20` IN, `10-21` OUT); `est_minutes` =
   `estimated_minutes` (null ⇒ 0); `label`=title, `ref_id`=id, `source_module:'tasks'`, `urgency:0`.
5. **getDueReminders — deterministic order:** deadlines ascending; an item with NO deadline sorts LAST; equal
   deadlines ⇒ `sort_order` (2/0/1 seeded) ⇒ then, under one pinned ms with equal `sort_order`, `id` codepoint (the
   S8 `:1281-1294` precedent); stable across two calls.
6. **the REAL SS-7 lane:** `registerTasksDueProvider(sessions, svc)` ⇒ `sessions.dueIn(range)` returns the tasks
   items (`source_module:'tasks'`); a lane whose `getDueReminders` rejects is skipped by `dueIn` (BR-34, one assertion).
7. **TAS-36 surface guard:** each of the 10 exported error classes, constructed with representative args, is
   `instanceof Error` with `.name === <ClassName>`.
8. **TAS-29 RATIFY (both halves):** a literal view-builder draft `satisfies TaskViewConfig` and
   `TaskViewConfigSchema.safeParse(draft).success`; the schema REJECTS `id`, `space_id`, `entity_types` (strict —
   verified on zod 4.4.3: `strictObject().omit` keeps `catchall: never`) and a bad `layout`; every
   `TASK_VIEW_PRESETS[i].view` parses.
9. **Structural:** gates 9/10 pass unchanged; a NEW assertion reads `../journal.ts` and checks its import lines
   reference only `../journals`, `../sessions`, `./types` (no `db/schema`, no other module service).
10. Full tasks suite green (87 + S9) · tsc 0 · eslint 0 · full `@vida/core` ALONE at the end.

## Currency (§XXIX — same commit)
`docs/modules/tasks/current-spec.md` (S9 row ✅ + "S9 surface" + Verification + Deferred; the `todayYmd` divergence
flag) · `current-business-rules.md` (BR-TK-S9-1..n + "Not yet enforced" trimmed) · `services/tasks/CLAUDE.md` (S1–S9,
① COMPLETE) · `docs/modules/journals/current-spec.md` + `docs/features/sessions-and-scheduling/current-spec.md`
(registrant notes: tasks lane) · `delivery/slice-map.md` S9 ✅ · `delivery/seam-contract.md` (line 77 rewritten to the
BUILT shape: `getDayTasksSummary(date): Promise<TasksDaySummaryItem[]>` + `getDueReminders(range: TimeRange):
Promise<DueItem[]>` on the SERVICE, `summary(date)` on the `JournalContribution` in `journal.ts`; `TaskViewConfig`/
`TaskViewConfigSchema` + `utcDay` added to the S8/S9 block; the stale `measurementSources?` dep line dropped — never
wired, S6) · `delivery/interpretation.md` (NO new interpretation — one FACT line: the lane assumes the platform's
UTC-day convention for `TimeRange` bounds, as every shipped caller builds them) · the task file (the `todayYmd`
local-day divergence flagged for Victor; not changed in S9).

## Preflight addendum (gate 2 — `/preflight` PASSED, 0 gaps; independent, re-derived from disk; binding on the build)
- **A1 — Node 24 only.** `.nvmrc`=22 but `better-sqlite3@12.8.0` is compiled for ABI 137 (Node 24); the shell default
  is v20. Run every command with `PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"`. Never `pnpm rebuild
  better-sqlite3` ([[review-agent-native-rebuild-breaks-worktree-abi]]). Baseline under Node 24: tasks 87/87, tsc 0.
  (A smoke check must OPEN a DB — `new Database(':memory:')` — a bare `require` passes under v20; the binary loads lazily.)
- **A2 — eslint has no `lint` script in `packages/core`.** Run from the root: `pnpm exec eslint packages/core/src/
  services/tasks packages/core/src/validators/task.ts` (+ `journal.ts` is inside the tasks dir). Exit 0 today.
- **A3 (binding) — do NOT copy purposes' `TerminalState` import into `journal.ts`.** `purposes/journal.ts:16` imports
  it from `../../foundation/capability/types`; gate 9 admits only `../journals`, `../sessions`, `./types` in
  `journal.ts`, and the journals barrel does not re-export `TerminalState`. Write `const state: SectionData['state']
  = items.length > 0 ? 'success' : 'empty'` (or let it infer — the literal union is assignable).
- **A4 (binding) — gate 1's sub-task seed** must be parented under a task that is NOT the soft-deleted seed
  (`softDeleteTask` cascades direct sub-tasks, `service.ts:327-338`; `addSubtask` guards only parent-exists +
  single-level, not a completed parent); parent it under the completed-on-D top-level.
- **A5 — pinned clock + ids:** `uuidv7()` takes its ms prefix from `Date.now()` and `ts()` is `Date.now()`
  (`repository.ts:67-80,256-258`); under a faked Date, rows share `created_at` + an id prefix, the random suffix
  keeps the codepoint tiebreak total + call-stable (the S8 precedent relies on this). No HLC guard in `sync/` —
  pinning D-1 → D → release is safe.
- **A6 — two currency targets have NO registrant section yet** (`docs/modules/journals/current-spec.md` names no
  module; `sessions current-spec.md:164` says only "owning modules register lanes later"); neither prior two-lane
  module appended there. S9 writes the FIRST "registered lanes" note in each (net-new section, not an append).
- Facts the build relies on (verified): `TasksService` last member `listViews` (`types.ts:252`; factory `:729`) —
  the two methods slot after it; `Status`/`Priority` already imported (`types.ts:25-26`); `journals/index.ts:5-9`
  exports types/registry/dashboard; `sessions/index.ts:2-3` re-exports types; `tsconfig.base.json` has
  `isolatedModules` + `noUnusedLocals`/`Parameters`, NO `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  off (so `hard_deadline: undefined` is legal); `ViewGrouping = { field?: string }` (`foundation/views/types.ts:
  18-20`, imported at `tasks/types.ts:21`) matches the zod `grouping` shape so every preset parses; `TaskRow.status`/
  `priority` are `enumText` unions from the same `@vida/types` tuples (`_shared.ts:20-21`) so the projection into
  `TasksDaySummaryItem.status: Status` type-checks without a cast (don't widen with a cast); `getDueReminders` exists elsewhere only as a METHOD (`relationships`), no barrel collision;
  `seam-contract.md:77` is the line to rewrite and `:21` the `measurementSources?` line to drop; BR-TK-S7-8's grain
  is scoped to `getAggregatedTasks` + the ReadProvider default, so the §2 no-parent-filter summary/lane does not
  contradict it. ADR-004 §3.2.5 / ADR-007 / ADR-002 → CONFORMS (table in the preflight record).

## Gate record
- **Gate 1 round 1** (independent critic): REVISE — 3 blocking (B1 placement-only surfacing hid the deadline day;
  B2 seam-contract:77 not amended; B3 the day helper had no home) + 8 NITs; all folded. **Round 2:** SHIP.
- **Victor, pre-Approval 1 (×2):** "ground the deferrals and the interpretations in the documentation" → then
  "there is nothing open in the documentation … this is clearly a drift, check the documentation." Grounding found
  the governing doc I had not weighted — `docs/core/architecture/cross-module-integration.md` §2 (the daily-summary
  aggregation's own spec, with the tasks row verbatim) — plus the shipped UTC-day convention (6 modules, 7 sites), the sessions
  intake G2-shape resolution, and JR-5. Rev 3 retires all four "interpretations" (local day · placement/surfacing ·
  grain · completed ∉ due) and the "counts only" convention as drift; the summary is now the §2 LIST with the §2
  fields and the §2 ∪ contract.md:32 predicate; the lane predicate is G2-shape ∪ G6 with no placement notion; the
  day is the UTC day. B3's helper becomes `utcDay`; `todayYmd` (local, S5) is flagged, not changed. Memory:
  `ground-every-deferral-and-interpretation-before-presenting`. **Round 3 (rev 3 re-derived from disk): SHIP**, 0
  blocking; 3 NITs folded (lane order cited as a total order, not as `:561`'s; the OPEN-only lane corroborated by
  `relationships:521`; the §2 doc's target-model caveat acknowledged). **Approval 1 — GRANTED (Victor, 2026-10-18).**
- **Gate 2:** independent `/preflight` **PASSED** (0 gaps; 6 assumptions resolved, A3/A4 binding) → addendum folded →
  critic on preflight + refined spec: **SHIP**, 0 blocking, 3 citation NITs folded. **Approval 2 — GRANTED (Victor,
  2026-10-18).**
- **Build (2026-10-19):** types → validator → service → `journal.ts` → barrel → 9 gate tests. tsc 0 · eslint 0 · tasks
  **96/96** · full `@vida/core` alone 2004/2006 (the 2 reds = `encryption/vault.test.ts` — the documented F003
  marginal-perf env flake: a parallel session was running the ui/web suites, load avg ~395, Argon2id tests at 6–143 s;
  S9 touches no encryption file; re-verified in isolation at commit time).
- **g2 code review (independent): SHIP**, 0 blocking, 9 NITs — folded: N2 (gate 2 now proves the TZ switch took:
  `getDate()` 18 vs 17), N3 (summary `sort_order` tier seeded — 9 members), N4 (a real completion in gate 3), N5
  (`journal.ts` present-tense overclaim reworded), N6 (`utcDay` finite-ms precondition documented), N8 (EVERY
  `../sessions` import in service.ts asserted type-only), N9 (this wording). **Flagged, not changed — Victor's call:**
  **N1** the lane's OPEN = the S1 `completed:false` definition (`status !== 'completed'`), so a `cancelled`/`on_hold`
  task with a date IS listed as due work (by the inherited S1 definition — the S8 `Today` preset uses the same); no doc
  defines those statuses as open or not anywhere (BR-TK-S3-7 likewise leaves `cancelled` unguarded) — a platform-wide
  UNKNOWN flagged in BR-TK-S9-4 / current-spec / interpretation §6, not special-cased in S9. **N7** V8 rolls an impossible-but-well-formed calendar date
  over (`2026-02-30` → Mar 2) because `CalendarDateSchema` is regex-only — pre-existing validator looseness shared with
  projects, recorded, not S9's.
- **`/critique` pre-ship (independent): REVISE docs-only → folded → SHIP.** Code SHIP, 0 blocking. B1 the N1 flag now
  carried in BR-TK-S9-4 / current-spec / interpretation §6 as an INHERITED platform-wide UNKNOWN (S1 filter · S8 preset
  · S9 lane) · B2 verification count 8→9 · B3 "7-module" → 6 modules / 7 sites (4 sites) · B4 the ② caller warning's
  failure mode = a one-day SHIFT, not "misses every" · N-a the ∞−∞ comparator commented · N-c/N-e wording. Verified
  gates 1–10 ↔ tests 1:1, every invariant in code, doc citations spot-checked accurate. → commit.

## Out of scope
Urgency ranking (ADR-004 §3.3 / G5 design-pass) · a user-timezone bucket (`user_profile.timezone`, journals
design-pass) · composition-root calls (UI-3 / M1.1+) · the 12→7 mapping (007 pass) · `JournalContribution.dueIn`
(SS-7: one registration, on Sessions) · any rail emission for `surface_journal`/`surface_calendar` (projections,
ADR-004:84) · aligning `todayYmd` to UTC (a shipped S5 BR — Victor's call, separate) · the ② `/summary` block, Today
renderer (reads `due_before` for overdue) and Calendar render.
