# PLAN — mod-learning-education · S10 — Cross-module fan-out + Journal (closes ①)

> **Slice:** S10 of 10, the FINAL slice [FACT: slice-map.md:27]. **Unit:** `createLearningEducationService` (append)
>
> - a new `journal.ts`. **Context:** `@vida/core` → `packages/core/src/services/learning-education/{service,types,journal}.ts`.
>   Composes `foundation/effects` (emit-only, dormant), the Journals registry (PULL), and three deny-safe consumer ports
>   (`tasks?`/`books?`/`knowledge?`). **No `@vida/types` change, no schema, no DDL.**
>   **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2 → build) then the per-slice
>   **live-store Verification Gate** (blocking) → independent code-review → /critique → §XXIX currency.
>   **Baseline:** S1–S9 shipped [FACT: task Slice log; @vida/core 1666/1666]. **No-Guessing:** every claim
>   `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S10 only)

Compose everything Education consumes from other modules (deny-safe), and let the daily Journal pull an Education recap:

1. **`listEducationTasks(subjectRef) → Task[]`** — homework via the Tasks→Education port; **deny-safe** `tasks?` absent ⇒
   `[]` (Tasks not built, C-HW) [FACT: seam-contract.md:68; contract.md:28-29; slice-map.md:27].
2. **`getBookPlansForSubject(subjectId) → ReadingPlan[]`** — passthrough to Books `getPlansForConsumer` (BK-12);
   **deny-safe** `books?` absent ⇒ `[]` [FACT: seam-contract.md:69; slice-map.md:27].
3. **`getMasteryForSubject(subjectId) → SubjectMastery`** — consume Knowledge's KN-10 `getMasterySource`; **deny-safe**
   `knowledge?` absent ⇒ an all-null `SubjectMastery` (unmeasured) [FACT: seam-contract.md:70; slice-map.md:27].
4. **`getDayEducationDigest(date) → EducationDayDigest`** + **`registerLearningEducationJournal(registry, svc)`** — the
   Journal `/summary` PULL (class sessions + assessments for the day) [FACT: seam-contract.md:71; slice-map.md:27].
5. **`effects?` emit-only measurement signal on `recordResult`** — **dormant at M1** (`{rail, registry}` injected; no
   handler/named consumer; occurrence-grain = assessment id; post-commit, failure-isolated; **C-E2 never an economy
   grant**) [FACT: slice-map.md:27 "BLOCKER-1 the books/knowledge S-final precedent"; effects/types.ts:22].

**S10 does NOT:** build the Tasks/AI real backends (M2 deny-safe seams); add an `ai?` port (no S10 consumer —
No-Guessing; document extraction = M2); filter book plans by subject (BK-12 `getPlansForConsumer` has no subject arg →
passthrough; the book↔subject filter is M2, §6); feed `assessmentResults` back INTO Knowledge (the reverse-wire stays
Knowledge-owned, §6 UNKNOWN); add a `dueIn`/agenda contribution (the seam lists only `/summary`, No-Guessing — the books
summary-only precedent); change `@vida/types` or the schema; build UI (② P6).

## 2. Business Rules (BR-LE-S10-\*)

- **BR-LE-S10-1 — `listEducationTasks` is a deny-safe Tasks→Education read ⇒ `[]` when absent (C-HW).** `tasks?:
TasksEducationPort` (`{ listForEducation(subjectRef: string): Promise<Task[]> }`); absent ⇒ `return []` (no throw —
  Tasks owns the entity and `services/tasks` is not built, R9/C-HW). `subjectRef` is a subject id or the sentinel
  `'all'`. The real homework read lands when Tasks is built (zero-signature swap) [FACT: contract.md:28-29 "Tasks owns
  the entity"; seam-contract.md:68; `Task` @vida/types task.ts:26]. The return type reuses `@vida/types` `Task` (the
  Tasks-owned entity — no Education-invented shape).
- **BR-LE-S10-2 — `getBookPlansForSubject` is a deny-safe passthrough to Books `getPlansForConsumer` ⇒ `[]` when
  absent.** `books?: BookPlansPort` (`{ getPlansForConsumer(): Promise<ReadingPlan[]> }`); absent ⇒ `[]`. BK-12
  `getPlansForConsumer` returns active plans with NO subject argument, so M1 is a passthrough — `subjectId` is accepted
  but reserved (the book↔subject filter needs the book-subject mapping consumable, = M2) [FACT: seam-contract.md:69;
  getPlansForConsumer books/service.ts; `ReadingPlan` @vida/types learning.ts:515]. `[INTERPRETATION — passthrough, the
subjectId reserved; §6]`
- **BR-LE-S10-3 — `getMasteryForSubject` consumes Knowledge's leaf; absent ⇒ all-null (unmeasured).** `knowledge?:
KnowledgeMasteryPort` (`{ getMasterySource(subjectId: string): Promise<SubjectMastery> }`); absent ⇒ `{objectMastery:
null, assessmentResults: null, paceVsSyllabus: null}` (a valid unmeasured reading — the deny-safe local fallback, no
  throw) [FACT: seam-contract.md:70; MasterySource knowledge/types.ts:161]. `SubjectMastery` is an Education-local
  structural copy of the 3-field shape (NOT imported from knowledge — avoids a service→service type coupling + the
  `MasterySource` barrel collision; the `EducationFileBlob` rename-on-collision precedent). "Education owns rollup" is a
  forward note: at M1 this is a clean passthrough; enriching `assessmentResults` from Education's own `computeGrade`
  (reverse-wire) stays Knowledge-owned and deferred [FACT: slice-map.md:27 "reverse-wire stays Knowledge-owned per §6
  UNKNOWN"].
- **BR-LE-S10-4 — The Journal contribution is a PULL `/summary` (today's class sessions + due assessments).** The two
  recap data points are fixed by the aspect doc: `contract.md:57` — "Journal `/summary` + global Calendar → today's
  class sessions + due assessments" → `DATA_POINTS = [{id:'class_sessions', label:'Class sessions'}, {id:
'due_assessments', label:'Due assessments'}]` [FACT: contract.md:57]. `getDayEducationDigest(date: string) →
EducationDayDigest` (`{classSessions: number; dueAssessments: number}`): `classSessions` = class meetings whose
  `started_at` falls on `date` (via `getWeeklySchedule` over the single-day ms-range); `dueAssessments` = assessments
  whose calendar `date` equals `date` ("due" = dated that day, contract.md:57; via `listAssessments({range:{start:date,
end:date}})`) [FACT: getWeeklySchedule S4; listAssessments S7 range filter; assessments.date calendarDate]. A new
  `journal.ts` exports `createLearningEducationJournalContribution(svc)` (`module:'learning-education'`,
  `sectionKey:'summary'`) whose `summary(date)` builds `SectionData` — `state:'success'` iff `classSessions +
dueAssessments > 0` else `'empty'`, reusing the `TerminalState` canon BY TYPE (never `deriveTerminalState`) — and
  `registerLearningEducationJournal(registry, svc)` registers it. This is the PULL path (ADR-004 §3.2.5 — Journal is
  pull-aggregated at render; NOT a rail push) — the books `registerBooksJournal` precedent [FACT: books/journal.ts;
  journals/types.ts:43-66; ADR-004 §3.2.5]. The registry dedups by `module`, so `learning-education` coexists with
  `books`/`knowledge` under `sectionKey:'summary'`. No `journalRegistry` dep (registered externally, the books pattern).
- **BR-LE-S10-5 — The `effects?` fan-out is emit-only, dormant, failure-isolated, C-E2 (never economy).** On
  `recordResult` (the measurable assessment event), AFTER the score write, fire for each of
  `ASSESSMENT_RECORDED_EFFECTS = ['emit_measurement_signal']`: `effects.rail.applyEffect({subjectNaturalKey:
assessmentId, transition:'assessment.recorded', effectType, targetRef: subjectId})`. Dormant: `if (!effects) return`
  (M1 default — no rail); `if (!effects.registry.resolve(effectType)) continue` (no handler → skip, avoids
  `NoEffectHandler`); wrapped in `try/catch` (post-commit, failure-isolated — the recorded result stands). Occurrence
  grain = the assessment id (exactly-once per ADR-004 §3.2.5, NOT the bare transition). **C-E2: measurement signals ONLY
  — NEVER `award_xp`/`grant_currency`** [FACT: books fanOutReadingCompletion service.ts:318-334; effects/types.ts:22;
  [[event-fanout-pull-push-split-and-occurrence-grain]]]. `EffectRail`/`EffectRegistry` injected inline as `{rail,
registry}` — do NOT import an `EffectsPort` symbol (barrel collision, the books/knowledge note).
  **`subjectId` capture (grounded, g1 NOTE 2):** `recordResult` currently calls `assessmentsRepo.findById` for the guard
  but DISCARDS it, and `update` echoes only `{score}` — so `subject_id` is NOT in scope today [FACT: service.ts:1088-1090].
  Capture the `findById` row (`subject_id` is unchanged by a score update) and read `row.subject_id` for `targetRef`.
  **Grain-dedup consequence (grounded, g1 NOTE 1):** `deriveEffectEventId = \`${subjectNaturalKey}|${transition}|${effectType}\``[FACT: effects/event-id.ts], so a RE-recorded score on the same assessment derives the SAME id →`applyEffect`no-ops`{applied:false}` [FACT: effects/service.ts:42-50]. This is correct for a derive-on-read measure (S8): one nudge is
  sufficient — the re-derive reads the current score; a per-correction signal would need a finer grain, an M2 concern.
  Harmless at M1 (dormant, no handler). Doc-fixed grain (slice-map.md:27), not re-chosen.
- **BR-LE-S10-6 — Deps grow by `tasks?`/`books?`/`knowledge?`/`effects?`, all deny-safe/optional; NO `ai?`.** The `?`
  optionality is doc-specified in the seam-contract deps block — `knowledge?`/`books?`/`tasks?`/`effects?` all carry the
  `?` (even `books?: { getPlansForConsumer } // BK-12 passthrough (Books DONE)` is optional _despite_ Books being merged)
  [FACT: seam-contract.md:16-24]. The WHY: M1 has no composition root wiring services together — every cross-module dep
  is injected absent at M1, wired at M2/P6 (the S9 preflight finding — only the test harness instantiates the service).
  No S10 method consumes AI (document extraction is an M2 defer with no M1 consumer) → `ai?` is NOT added (No-Guessing — a
  port with no consumer is not a seam to pre-wire) [FACT: slice-map.md Deferred-to-M2; the books `ai?` had real
  consumers, Education has none].

## 3. Architecture / grounding

**New file `journal.ts`** mirrors `books/journal.ts` exactly: `createLearningEducationJournalContribution(svc:
LearningEducationService): JournalContribution` + `registerLearningEducationJournal(registry: JournalRegistry, svc):
void`. Imports `JournalContribution`/`SectionData`/`DataPoint`/`JournalRegistry` from `../journals`, `TerminalState`
from `../../foundation/capability/types`.

**New service-layer types** (`types.ts`, NOT `@vida/types` — the `MasterySource` precedent): `SubjectMastery`
(`{objectMastery, assessmentResults, paceVsSyllabus: number | null}`), `EducationDayDigest` (`{classSessions,
dueAssessments: number}`), `TasksEducationPort`, `BookPlansPort`, `KnowledgeMasteryPort`. Deps grow by the four optional
ports. Return types `Task`/`ReadingPlan` imported from `@vida/types` (add `Task` + `ReadingPlan`).

**Digest reads** reuse built methods: `getWeeklySchedule(range)` (S4 — ms TimeRange; convert `date` → `[00:00, +24h)`
ms via `Date.parse(`${date}T00:00:00Z`)` in service code, which may use `Date`) + `listAssessments({range})` (S7 —
calendar-date range). `[INTERPRETATION — the date→ms-range conversion for class sessions; §6]`

**Fan-out placement:** in `recordResult` (service.ts:1086), CAPTURE the `findById` guard row (currently discarded,
service.ts:1088) so `subject_id` is in scope, then after the score `update` returns call
`fanOutAssessmentRecorded(assessmentId, existing.subject_id)` (a hoisted closure, the books `fanOutReadingCompletion`
shape). `subject_id` is unchanged by a score update, so the pre-update row is correct. Factory-object: all new methods
are hoisted closures (no `this.`).

**No `@vida/types` change** → no `pnpm --filter @vida/types build` needed; no enum change → enum-parity unaffected.

## 4. Acceptance (§4 — the per-slice Verification Gate, blocking)

Done = **all** of:

- `listEducationTasks('all')` / `listEducationTasks(subjectId)` with NO `tasks?` port ⇒ `[]`; with a stub port ⇒ the
  port's rows (a mock returning 2 Tasks ⇒ length 2).
- `getBookPlansForSubject(subjectId)` with NO `books?` port ⇒ `[]`; with a stub ⇒ the port's plans.
- `getMasteryForSubject(subjectId)` with NO `knowledge?` port ⇒ `{objectMastery:null, assessmentResults:null,
paceVsSyllabus:null}`; with a stub ⇒ the port's `SubjectMastery`.
- `getDayEducationDigest(date)`: a day with 1 class session + 1 dated assessment ⇒ `{classSessions:1, dueAssessments:1}`;
  an idle day ⇒ `{0,0}`.
- `registerLearningEducationJournal(registry, svc)` registers one contribution; its `summary(date)` ⇒
  `state:'success'` on an active day, `'empty'` on an idle day; coexists with a `books` contribution (dedup by module).
- `recordResult` with NO `effects` ⇒ no throw, result recorded (dormant); with `effects` injected but NO handler ⇒ no
  throw (skip); with a registered handler ⇒ the handler fires once per assessment id (occurrence grain), targetRef =
  subject id; a THROWING handler ⇒ `recordResult` still succeeds (failure-isolated).
- `tsc` 0 · `eslint` 0 · **enum-parity** green (unchanged).
- **Live-store Verification Gate** (real store, Node 24): the above end-to-end; full `@vida/core` suite green (≥ 1666 + new).
- §XXIX currency: `current-*` refreshed (BR-LE-S10-1..6), ① marked COMPLETE, committed with the code.

## 5. Implementation Prompt (§5 — strict order)

1. **`service/types.ts`** — add `SubjectMastery`, `EducationDayDigest`, `TasksEducationPort`, `BookPlansPort`,
   `KnowledgeMasteryPort`; grow `LearningEducationServiceDeps` with `tasks?`/`books?`/`knowledge?`/`effects?` (import
   `EffectRail`/`EffectRegistry` from `../../foundation/effects`); add the 4 method sigs
   (`listEducationTasks`/`getBookPlansForSubject`/`getMasteryForSubject`/`getDayEducationDigest`) to
   `LearningEducationService`; import `Task`/`ReadingPlan` from `@vida/types`.
2. **`service/service.ts`** — destructure `tasks, books, knowledge, effects` from deps; add
   `ASSESSMENT_RECORDED_TRANSITION`/`ASSESSMENT_RECORDED_EFFECTS` consts + `fanOutAssessmentRecorded` closure (the books
   precedent); wire it into `recordResult` post-write; implement the 4 read methods (deny-safe `?? []` / all-null);
   implement `getDayEducationDigest`; add all to the returned object.
3. **`service/journal.ts`** (new) — `createLearningEducationJournalContribution(svc)` +
   `registerLearningEducationJournal(registry, svc)` (the books/journal.ts mirror).
4. **`service/index.ts`** — `export * from './journal'` (the books barrel precedent).
5. **`__tests__`** — a live-store suite: the deny-safe `[]`/all-null paths + stub-port paths; digest active/idle;
   journal contribution success/empty + dedup; effects dormant/no-handler/handler-fires-once/throwing-handler-isolated.
6. **tsc 0 · eslint 0 · full suite green** → Verification Gate → code-review → /critique → §XXIX currency (promote
   BR-LE-S10-\*; mark ① COMPLETE in `current-spec.md`) in the build commit. ① done → the PR for the whole backend.

## 6. Risks / doc-resolved calls (grounded — for Victor's eye)

- **`getBookPlansForSubject` is a passthrough; `subjectId` reserved (BR-LE-S10-2).** `getPlansForConsumer()` has no
  subject arg; filtering per subject needs the book↔subject mapping consumable (M2). The alternative (filter now) would
  require inventing a link that isn't exposed. `[INTERPRETATION — grounded in the BK-12 signature]`
- **`getMasteryForSubject` is an M1 passthrough; the reverse-wire is deferred (BR-LE-S10-3).** "Education owns rollup"
  is honored as a forward seam — M1 returns Knowledge's reading as-is; enriching `assessmentResults` from Education's
  `computeGrade` and feeding it back stays Knowledge-owned (slice-map §6 UNKNOWN). `[doc-deferred, not invented]`
- **No `ai?` port (BR-LE-S10-6).** No S10 method consumes AI; adding a dormant port with no consumer violates
  No-Guessing. Document extraction is an M2 defer. `[FACT: slice-map Deferred-to-M2]`
- **`dueIn`/agenda NOT added.** The seam lists only the `/summary` digest; the books summary-only precedent applies.
  Education's class schedule IS agenda-shaped, but adding a `dueIn` without a doc mandate is guessing. `[No-Guessing]`
- **`SubjectMastery` Education-local (not imported from knowledge)** — avoids a service→service type coupling + the
  `MasterySource` flat-barrel collision (the `EducationFileBlob` precedent). `[INTERPRETATION]`
- Verify at /preflight: `JournalContribution`/`SectionData`/`JournalRegistry` import path (`../journals`);
  `getWeeklySchedule` range unit (ms) + the date→ms-range conversion; `listAssessments` accepts a bare `{range}` with no
  `subjectId`; `effects.registry.resolve` + `effects.rail.applyEffect` signatures (the books call site); the full set of
  `createLearningEducationService` call sites (the S9 test harness — the new ports are optional, so NO new compile break);
  `Task`/`ReadingPlan` are exported from `@vida/types`.
