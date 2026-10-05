# PLAN — mod-learning-education · S4 — Schedule + class sessions (register `class` sub-type)

> **Slice:** S4 of 10 [FACT: slice-map.md:21]. **Unit:** `createLearningEducationService` (append). **Context:**
> `@vida/core` → `packages/core/src/services/learning-education/{service,types}.ts`; `@vida/core/validators` →
> `validators/learning.ts`; `@vida/types` → `packages/types/src/learning.ts` (DB-11 net-new interfaces).
> **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2 → build) then the per-slice
> **live-store Verification Gate** (Step 9, blocking) → independent code-review → /critique → §XXIX currency.
> **Baseline:** S1–S3 shipped [FACT: task file Slice log; @vida/core 1572/1572]; front matter + Approval 1 ratified
> [FACT: slice-map.md; seam-contract.md]. **No-Guessing:** every claim `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S4 only)

Make a Subject's **schedule + class meetings** real, built on the `sessions` substrate:
1. **Register the `class` session sub-type** (`registerLearningEducation()`, idempotent) so `createSession('class')`
   resolves [FACT: seam-contract.md:41; slice-map.md:21].
2. **`subject_schedules`** — one row per subject (UNIQUE), recording the schedule's *source* (`ics`/`document`/`manual`)
   [FACT: seam-contract.md:42; schema learning.ts:26-27,242-247].
3. **`class_sessions`** — the individual meetings = base `sessions` (`sub_type='class'`) + a 1:1 extension keyed
   `session_id`; the SUBJECT is attached as the ADR-004 §3.2.1 target [FACT: schema learning.ts:23-25,226-239; ED-4].
4. **Derived reads** — `listSessions(subjectId)` and the cross-subject `getWeeklySchedule(range)`, both deriving time
   from the **base** session [FACT: ED-4 "the weekly schedule renders from sessions"; seam-contract.md:44].

**S4 does NOT:** fetch/sync ICS (S5, deny-safe `ics?`), create sessions FROM ICS events (`source_event_id` is a
nullable forward-link to S5), compute grades (S6/S7), or build any UI (② `fe-learning-education`, P6)
[FACT: slice-map.md:22,29-32].

## 2. Business Rules (BR-LE-S4-*)

- **BR-LE-S4-1 — The `class` sub-type is registered, never re-defined.** `registerLearningEducation()` registers
  `CLASS_SESSION_TYPE_DEF` via the injected `SessionRegistry`; a 2nd call throws `DuplicateSubType` → caught → no-op
  (idempotent, call-once) [FACT: R1; seam-contract.md:41; books `registerBooks` service.ts:748-754].
- **BR-LE-S4-2 — `CLASS_SESSION_TYPE_DEF` is an ADR-004 §3.2 transcription.** `sub_type:'class'`
  [FACT: SESSION_SUB_TYPE session.ts:21]; `owner_module:'learning-education'`; `attachment_defaults:{}` (§3.2.1 — the
  subject is attached per-session, not a type default); **`effects:[]`** (§3.2.2 + **C-E2** — Education class sessions
  are non-feeders; any completion grant rides the base sub-type, not this one); `lifecycle` = the shared
  `scheduled→in_progress→completed` (§3.2.3); **`permissions.allowed_effects:[]`** (§3.2.4 — a module envelope ⊆ shipped;
  `∅` is subset-legal) [FACT: slice-map.md:21 "allowed_effects:[] — R1/C-E2"; books `READING_SESSION_TYPE_DEF`
  service.ts:205-218; registry BR-4 check registry.ts:94-100]. **`default_purpose` is OMITTED** (B2 resolved): no
  Education doc fixes a class purpose [FACT: grep docs/features/learning/education/*.md — only unrelated
  "separate storage/purpose" + prose] and `default_purpose` is optional (not in `REQUIRED_DIMENSIONS`
  [FACT: registry.ts:53-58]) → No-Guessing omits it rather than inventing one (books' free `'reading'` is not a
  precedent to copy here; there is no `'class'` in `SESSION_PURPOSE` session.ts:33-40).
- **BR-LE-S4-3 — One schedule per subject.** `setSchedule(subjectId,{source})` upserts: if a `subject_schedules` row
  exists for the subject, update its `source`; else create one. The UNIQUE(subject_id) constraint is honored by the
  service (no-FK; the DB UNIQUE is the backstop) [FACT: schema learning.ts:26,244; seam-contract.md:42]. Guards the
  subject exists → `SubjectNotFoundError` (the BookNotFound precedent) [FACT: service.ts:14 no-FK service integrity].
- **BR-LE-S4-4 — A class session is a base session + a 1:1 extension; `started_at` carries the MEETING TIME.**
  `createClassSession(subjectId,input)` guards the subject exists, then `sessions.createSession({sub_type:'class',
  scheduling_mode, status, started_at, ended_at?})` and writes its OWN `class_sessions` row keyed `session_id` (a
  separate write; an orphan base session is harmless + re-drivable, no-FK) [FACT: books `startSession` service.ts:777-793].
  **B1 resolved — the meeting time lives in the spine `started_at`.** The `sessions` spine has NO dedicated
  scheduled-time column — only `started_at`/`ended_at` + a deferred `planned_block_id` [FACT: sessions.ts:32-34] — so a
  class meeting's time IS `started_at`, **set at create regardless of `status`** (the #32 engine only auto-stamps
  `started_at` on a transition into `in_progress`, so a `status:'scheduled'` class would otherwise have none — the exact
  reason books stamps it explicitly at create, service.ts:774-782). `startedAt` is therefore a **required** meeting-time
  input (Unix ms); `endedAt?` optional. `class_sessions` has **NO `deleted_at`** → `softDelete:false`; the base
  `sessions` owns lifecycle [FACT: schema learning.ts:40,236; BR-ED-7].
- **BR-LE-S4-5 — The subject is the §3.2.1 target.** After creating the session, attach the subject:
  `sessions.attach(sessionId,'subject',subjectId,'instance')` [FACT: `'subject'` is a registered ENTITY_TYPE
  _registry.ts:100; books attaches the book service.ts:796; ED-4 "assessments/grades/documents/notes attach to the
  Subject"].
- **BR-LE-S4-6 — Derived reads go through the base session.** `listSessions(subjectId)` reads its own
  `class_sessions` (by `subject_id`), then resolves each base session via `sessions.getSession`; a session that no
  longer resolves (soft-deleted base) is skipped [INTERPRETATION: base owns lifecycle/soft-delete, F1; R4-adjacent].
  `getWeeklySchedule(range)` is cross-subject: all `class_sessions`, base `started_at` ∈ `[range.start, range.end]`
  **INCLUSIVE both ends** — matching the reused `TimeRange` contract (sessions/types.ts:219 "both ends inclusive";
  `dueIn`/`getSessionAnalytics` use gte/lte) rather than silently diverging [g2 SHOULD-FIX folded]
  [FACT: ED-4 "renders from sessions"; seam-contract.md:44]. Because `started_at` is set at create (BR-LE-S4-4),
  **scheduled/upcoming meetings DO render** on the weekly grid (B1); a session whose `started_at` is `null` (an ad-hoc
  class logged without a time) is excluded from the time window — the one documented non-render case.
- **BR-LE-S4-7 — Schedule source is FIXED vocab.** `source ∈ SCHEDULE_SOURCE` (`ics`/`document`/`manual`), validated
  by the Zod schema (the column is a CHECK) [FACT: SCHEDULE_SOURCE learning.ts:153; schema `enumText('source',…).notNull()`
  learning.ts:245].
- **BR-LE-S4-8 — `@vida/types` gains `ClassSession` + `SubjectSchedule` (net-new).** Neither interface exists today
  [FACT: grep packages/types/src/learning.ts — only `Subject`]; S4 adds both `extends SyncableEntity`, mirroring the
  schema rows (DB-11 is additive here, not a rename) [FACT: ClassSessionRow learning.ts:358, SubjectScheduleRow:360].

## 3. Architecture / grounding

**Deps growth (types.ts `LearningEducationServiceDeps`):** add `sessions: SessionsService` + `sessionRegistry:
SessionRegistry` [FACT: seam-contract.md:12; books types.ts:83-87]. Both are BUILT and injected (not reconstructed) —
the learning service never holds the sessions substrate's own deps (registry/rail/entityRegistry)
[FACT: sessions service.ts:177-178]. No deny-safe port is added in S4 (`ics?` is S5).

**Repos:** `subjectSchedules` → `createRepository(..., {softDelete:true, encryptedFields:[]})` (has `deleted_at`);
`classSessions` → `{softDelete:false, encryptedFields:[]}` (no `deleted_at`; `location` is `[E]` but M1.0 set is `[]`)
[FACT: schema learning.ts:234-236,246; [[m10-repos-use-empty-encryptedfields-seam]]].

**Session shape:** `sessions.createSession(input)` returns `Session` with `.session: SessionRow` → the base id is
`created.session.id` [FACT: sessions types.ts:85-86; books service.ts:786]. `CreateSessionInput` requires `sub_type` +
`scheduling_mode` + `status` (spine has no default start state) [FACT: sessions types.ts:52-56].

**N+1 read (deliberate M1 shape):** `listSessions`/`getWeeklySchedule` resolve base times via per-row
`sessions.getSession` rather than a second read path into the `sessions` table — respecting the substrate boundary
("never a second path", service.ts:179). N is bounded (one user's class meetings); a range-indexed base query is an
S-later sessions-substrate addition, OUT of S4 scope. Stated, not silently chosen.

**`getWeeklySchedule` time source:** the base session `started_at`, which carries the meeting time (BR-LE-S4-4 / B1);
only an ad-hoc class logged with `started_at == null` is excluded from a weekly *time* window [FACT: ED-4]. `TimeRange`
= `{ start: number; end: number }` (Unix ms) is **reused from `../sessions`** [FACT: sessions types.ts:219-222 — the
`dueIn`/`DueProvider` platform primitive; import, do not redefine] (fall back to a local alias only if the barrel does
not re-export it).

**`scheduling_mode` / `status` defaults (createClassSession input):** both caller-suppliable; defaults
`scheduling_mode:'attended'` (ED-4 "individual meetings") and `status:'scheduled'` [FACT: `'scheduled'`/`'in_progress'`/
`'completed'` ∈ SESSION_STATUS session.ts:58-66 — the lifecycle transitions resolve] [INTERPRETATION: the *default*
mode/status choice itself].

## 4. Acceptance (§4 — the per-slice Verification Gate, blocking)

Done = **all** of:
- `registerLearningEducation()` registers `class`; a 2nd call is a no-op (no throw); `createClassSession` before
  registration surfaces `SessionTypeNotFound` from the registry (documented ordering) [FACT: registry.ts:123].
- `setSchedule` creates one row; a 2nd `setSchedule` for the same subject UPDATES (still one row, UNIQUE honored);
  unknown subject → `SubjectNotFoundError`.
- `createClassSession` creates a base `class` session + a `class_sessions` extension keyed `session_id`, attaches the
  subject target; unknown subject → `SubjectNotFoundError`; returns `ClassSessionView {session, classSession}`.
- `listSessions(subjectId)` returns that subject's sessions; a soft-deleted base session is excluded.
- `getWeeklySchedule(range)` returns cross-subject sessions whose base `started_at` ∈ range; excludes out-of-range +
  untimed.
- `@vida/types` `ClassSession` + `SubjectSchedule` compile; `tsc --noEmit` 0; `eslint` 0; **enum-parity** green.
- **Live-store Verification Gate** (real store, Node 24, not fixtures): the above exercised end-to-end incl. the
  base-session compose + the attach write (the seam a mocked test bypasses) [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]; full `@vida/core` suite green (≥ 1572 + new).
- §XXIX currency: `docs/modules/learning-education/current-*` refreshed (BR-LE-S4-1..8), committed with the code.

## 5. Implementation Prompt (§5 — the build steps, strict order)

1. **`@vida/types/learning.ts`** — add `export interface SubjectSchedule extends SyncableEntity { subject_id: string;
   source: ScheduleSource; deleted_at: number | null }` and `export interface ClassSession extends SyncableEntity {
   session_id: string; subject_id: string; schedule_id: string | null; source_event_id: string | null; location:
   string | null }` (mirror the rows exactly; no `deleted_at` on `ClassSession`). Barrel already re-exports learning.
2. **`validators/learning.ts`** — `SetScheduleSchema` (`source: z.enum(SCHEDULE_SOURCE)`); `CreateClassSessionSchema`
   (`startedAt` **required** Unix ms = the meeting time, B1; `scheduleId?`, `sourceEventId?`, `location?`,
   `schedulingMode?` default `'attended'`, `status?` default `'scheduled'`, `endedAt?`). Reuse the canonical `z.enum` wrappers.
3. **`service/types.ts`** — grow `LearningEducationServiceDeps` (+`sessions`, +`sessionRegistry`); add input types
   (`SetScheduleInput`, `CreateClassSessionInput`), views (`ClassSessionView = { session: Session; classSession:
   ClassSession }`), `TimeRange`, and the method signatures on `LearningEducationService`
   (`registerLearningEducation`, `setSchedule`, `createClassSession`, `listSessions`, `getWeeklySchedule`); add
   `ClassSessionNotFoundError`.
4. **`service/service.ts`** — `CLASS_SESSION_TYPE_DEF` const (BR-LE-S4-2 transcription); destructure `sessions`,
   `sessionRegistry`; add `subjectSchedulesRepo` (softDelete:true) + `classSessionsRepo` (softDelete:false); row→interface
   mappers (`toSubjectSchedule`, `toClassSession`, `_sync_status` cast); implement the 5 methods (hoisted closures, no
   `this.`); add all to the returned object.
5. **`__tests__`** — a live-store suite: registration idempotency + ordering, schedule upsert + UNIQUE, class-session
   create+attach, list (soft-delete exclusion), weekly range (in/out/untimed), typed errors.
6. **tsc 0 · eslint 0 · enum-parity green · full suite green** → Verification Gate → code-review → /critique → §XXIX
   currency (promote BR-LE-S4-* into `current-business-rules.md`; update `current-spec.md` surface) in the build commit.

## 6. Risks / open items
- ~~`TimeRange` import source~~ — RESOLVED: reuse `../sessions` `TimeRange` [FACT: sessions types.ts:219-222].
- ~~`SESSION_STATUS` tuple~~ — RESOLVED: `scheduled`/`in_progress`/`completed` present [FACT: session.ts:58-66].
- ~~`default_purpose`~~ — RESOLVED (B2): no Education doc fixes a class purpose [FACT: grep clean] → OMITTED (optional
  dim, No-Guessing).
- ~~weekly-schedule time semantics~~ — RESOLVED (B1): `started_at` is the meeting time, set at create regardless of
  status [FACT: sessions.ts:32-34 — no other spine time field]; scheduled meetings render.
- `ClassSession` carries no `deleted_at` → the `@vida/types` interface must omit it (asymmetry vs `SubjectSchedule`);
  a `satisfies`/compile check guards the mirror.
- Verify the sessions barrel re-exports `TimeRange`, `Session`, `SessionsService`, `SessionRegistry`, `DuplicateSubType`
  (all imported from `../sessions` / `../../foundation/sessions`) at /preflight.
