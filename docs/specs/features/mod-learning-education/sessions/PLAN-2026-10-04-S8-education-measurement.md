# PLAN — mod-learning-education · S8 — Education measurement (setMeasurement / getProgress)

> **Slice:** S8 of 10 [FACT: slice-map.md:25]. **Unit:** `createLearningEducationService` (append). **Context:**
> `@vida/core` → `packages/core/src/services/learning-education/{service,types}.ts`; `@vida/core/validators` →
> `validators/learning.ts`; `@vida/types` → `packages/types/src/learning.ts` (net-new `EducationMeasurement`);
> composes `foundation/measurement/engine` (normalize/rollup/resolveProgress-semantics) + S7 `computeGrade`.
> **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2 → build) then the per-slice
> **live-store Verification Gate** (blocking) → independent code-review → /critique → §XXIX currency.
> **Baseline:** S1–S7 shipped [FACT: task Slice log; @vida/core 1636/1636]. **No-Guessing:** every claim
> `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S8 only)

Make a Subject's / Program's **progress measurable** on the **Education-forged** measure entity, derive-on-read:

1. **`setMeasurement(ref, {measurement_kind, binding_mode?}) → EducationMeasurement`** — configure the measure for a
   subject/program (one per ref, upsert); `measurement_kind` REQUIRED (R3), `binding_mode` nullable ⇒ derive
   [FACT: seam-contract.md:60; schema learning.ts:324-339].
2. **`getProgress(ref) → number | null`** — derive-on-read via the measurement engine; a stored `progress` override
   wins; `derived-pull` on a subject pulls S7 `computeGrade`; a program rolls up its subjects; `null` = unmeasured
   [FACT: seam-contract.md:61; slice-map.md:25; business-rules.md:46-51].

**S8 does NOT:** touch `subjects.progress` (a different column, S2's "never settable"); write the `progress` override
(no setter in the seam — the override is a forward seam, M-later); use **Projects'** storage (C-M5 — Education-forged,
separate entity); `advertise()` a measurement source (C-M5 — Education is a query-only measure, no global scalar); emit
effects (S10); build UI (② P6) [FACT: slice-map.md:25 "never Projects' storage, C-M5"; seam-contract.md:13 "no sourceRegistry advertise — C-M5"].

## 2. Business Rules (BR-LE-S8-\*)

- **BR-LE-S8-1 — The measure is Education-forged, one per ref, upsert (fail-loud on the ref).** `setMeasurement(ref,
input)` where `ref={type:'subject'|'program', id}` guards the ref exists (`SubjectNotFoundError` /
  `ProgramNotFoundError`), then upserts the single `education_measurements` row for `(ref_type, ref_id)` — if a live
  row exists, update `measurement_kind`/`binding_mode`; else create (the `setSchedule` one-per-ref precedent,
  BR-LE-S4-3; the index is non-unique so the service enforces one-per-ref) [FACT: schema learning.ts:329-338 non-unique
  `idx_education_measurements_ref`; MEASUREMENT_REF_TYPE = subject|program measurement.ts]. Separate storage, never
  Projects' (C-M5) [FACT: slice-map.md:25].
- **BR-LE-S8-2 — `measurement_kind` is REQUIRED; `binding_mode` is nullable ⇒ derive.** `measurement_kind ∈
MEASUREMENT_KIND` (`quantitative|milestone|rate|qualitative`) is caller-supplied, NO default — a dedicated measure
  entity (diverges from deliverables' `'milestone'` default by design) [FACT: schema learning.ts:331-333 "notNull
  no-default … caller always supplies"; R3]. `binding_mode ∈ BINDING_MODE` (`manual|derived-pull|event-trigger`)
  nullable; `NULL ⇒ derive` (M2) [FACT: schema learning.ts:334; BINDING_MODE measurement.ts:9].
  **`measurement_kind` is declared METADATA at M1 — the derivation does NOT branch on it (B1).** Education's M1
  progress IS the grade (subject) or the rollup (program) — both kind-agnostic (BR-LE-S8-5/6); there is no subject-level
  milestone/quantitative source in Education yet (no deliverables), so a direct per-kind `normalize` (a subject measured
  by a milestone/quantitative target _not_ via grade) is M-later. The kind is persisted for the record + that future
  path, not consulted by `getProgress` at M1 — stated, not a silent gap [FACT: no Education deliverable source; ED-10
  "same axes as Projects" = the declared axis, not an M1 derivation input].
- **BR-LE-S8-3 — `getProgress` returns an INTEGER 0–100 (or null); the engine works in [0,1].** The stored `progress`
  override column is `integer` — it cannot meaningfully hold a `[0,1]` float, so the unit is **0–100** (matching
  `books.progress`, the one progress precedent) [FACT: schema learning.ts:335 `integer('progress')`; books.progress
  0–100 clamp books/service.ts:1093]. getProgress derives in `[0,1]` (the engine's native unit) and scales to a rounded
  0–100 at the return boundary; `null` = unmeasured (BR-2), never coerced to 0 [FACT: engine.ts:11,44]. `[INTERPRETATION
— the 0–100 unit; see §6]`
- **BR-LE-S8-4 — `getProgress` inlines `resolveProgress` §3.2 (stored-override wins, else derive).** No measurement row
  for the ref ⇒ `null` (unmeasured — nothing configured). Else: a non-null stored `progress` override wins (clamped
  0–100); else derive. The inline mirrors `getUnifiedProgress` (books/service.ts:1091) — the generic `resolveProgress`
  can't bridge the 0–100-stored ↔ [0,1]-derive unit gap, so the semantics are inlined [FACT: engine.ts:55-61
  resolveProgress; books/service.ts:1091-1096]. **At M1 the override is NEVER written** (no setter in the seam) → the
  derive branch always runs; the override column is a forward seam (M-later manual set) [FACT: seam-contract.md:60-61 —
  setMeasurement takes only kind/mode].
- **BR-LE-S8-5 — Subject derivation: `derived-pull` (and derive-by-default) pull S7 `computeGrade`; `manual` /
  `event-trigger` do not auto-derive.** For `ref.type==='subject'` the derive branch: `binding_mode==='derived-pull'`
  **or `null`** (derive-by-default) ⇒ `computeGrade(subjectId).grade` ([0,1]|null — Education's natural progress signal)
  [FACT: seam-contract.md:61 "grade-derived mode pulls computeGrade"; slice-map.md:25; business-rules.md:49
  "grade-derived→derived-pull"]; `binding_mode==='manual'` ⇒ `null` (manual has no auto-derivation — the override is
  its only source, ED-10 "manual→manual") [FACT: business-rules.md:49]; `binding_mode==='event-trigger'` ⇒ `null`
  (no event source until M2) [FACT: BINDING_MODE measurement.ts:9; M2 defer]. `[INTERPRETATION — null-mode⇒grade +
event-trigger⇒null-at-M1; see §6]`
- **BR-LE-S8-6 — Program derivation: the engine's fractal `rollup` over its subjects.** For `ref.type==='program'` the
  derive branch rolls up the program's subjects' `[0,1]` progress via `rollup` (equal-weight; null-progress subjects
  excluded — an un-measured subject cannot drag the program down) [FACT: engine.ts:38-53; seam-contract.md:61 "derives
  via resolveProgress/rollup"]. The program's subject set = the union over the program's live curricula of
  (`curriculum_id === c.id` OR `term_id ∈ c's live terms`) — the S7 `computeGPA`/S3-fork union, iterated per curriculum
  [FACT: S7 computeGPA union; listCurriculaFor service.ts:421]. Each subject contributes `getProgress(subject)/100`
  (honoring its own override/derivation) [INTERPRETATION — the per-subject recursion; see §6]. `rollup` clamps to [0,1];
  feeding it 0–100 would wrongly clamp all to 1 — so children MUST be [0,1].
- **BR-LE-S8-7 — `@vida/types` gains `EducationMeasurement` (net-new).** `extends SyncableEntity`, mirrors
  `EducationMeasurementRow` exactly (`ref_type: MeasurementRefType`, `ref_id`, `measurement_kind: MeasurementKind`,
  `binding_mode: BindingMode | null`, `progress: number | null`, `deleted_at: number | null`) [FACT:
  EducationMeasurementRow learning.ts:370; grep clean — no `EducationMeasurement` interface today]. `softDelete:true`
  (`deleted_at` present).
- **BR-LE-S8-8 — No `advertise()`, no Projects storage (C-M5 honored).** Education exposes progress ONLY via the
  `getProgress` method (the KN-10 "per-subject/async measure = a method, not advertise" pattern); it never calls the
  measurement source-registry `advertise()` (that carries only global scalars) and never writes Projects' measure
  tables [FACT: seam-contract.md:13; [[measurement-source-registry-is-sync-scalar-per-subject-uses-a-method]]].

## 3. Architecture / grounding

**No deps growth.** `normalize`/`rollup` are already direct-imported (S7, B1); `resolveProgress` semantics are inlined
(BR-LE-S8-4). `computeGrade` is an intra-service closure (hoisted, no `this.`) — called directly. `setMeasurement`/
`getProgress` need no new injected dep [FACT: service.ts S7 import; the factory-object convention].

**Repo:** `educationMeasurements` → `createRepository(..., {softDelete:true, encryptedFields:[]})` (`deleted_at`
present; no `[E]` fields) [FACT: schema learning.ts:336]. `findWhere` for the per-ref lookup carries explicit
`isNull(deleted_at)` [FACT: [[repository-findwhere-skips-softdelete-filter]]].

**Mapper:** `toEducationMeasurement(row)` casts the plain-text `ref_type`/`measurement_kind`/`binding_mode`/
`_sync_status` unions (the S6/S7 mapper pattern); `progress` is a plain integer (no cast).

**Upsert shape (setMeasurement):** find the live row by `(ref_type, ref_id)`; if present `update` kind/mode; else
`create` with `progress:null`, `binding_mode: input.binding_mode ?? null`. `create()` echoes input → the returned row
is faithful (progress null, no DB-default read needed here) [FACT: the setSchedule upsert service.ts:684].

**Derivation helper (`deriveProgress01(ref, bindingMode) → number | null`, [0,1]):** pure branch on `ref.type` +
`bindingMode` per BR-LE-S8-5/6. The program branch recurses through `getProgress(subject)/100` so a subject's own
override/mode is honored before the rollup (one bounded level — program → its subjects; no deeper nesting exists in the
Education hierarchy, so no cycle risk) [INTERPRETATION: the recursion depth is 1; grounded in the 2-level
subject⊂program model].

**N+1 (deliberate M1 shape):** a program's `getProgress` reads its curricula → subjects → each subject's progress. N
bounded (one user's program). A batched read is S-later. Stated, not silently chosen (the S4/S7 precedent).

## 4. Acceptance (§4 — the per-slice Verification Gate, blocking)

Done = **all** of:

- `setMeasurement({type:'subject',id}, {measurement_kind:'quantitative'})` creates one row (progress null, binding_mode
  null); a 2nd `setMeasurement` for the same ref UPDATES (still one row); unknown subject/program → typed NotFound;
  omitting `measurement_kind` → a Zod parse error (required).
- `getProgress` with no measurement row → `null`.
- `getProgress` subject `derived-pull` (and `binding_mode:null`) → `Math.round(computeGrade.grade*100)`; a graded
  subject (grade 0.87) → `87`; an ungraded subject → `null`.
- `getProgress` subject `manual` with no stored override → `null`; `event-trigger` → `null`.
- `getProgress` program → rollup of its subjects' progress (equal-weight, null-excluded); a program with two subjects
  at 80 and 100 → `90`; a program with no measured subjects → `null`.
- a stored `progress` override (set via a raw store UPDATE in the test, since no M1 setter) wins over derivation (0–100,
  clamped).
- `@vida/types` `EducationMeasurement` compiles; `tsc` 0; `eslint` 0; **enum-parity** green.
- **Live-store Verification Gate** (real store, Node 24): the above end-to-end incl. the subject→program rollup +
  grade-pull compose; full `@vida/core` suite green (≥ 1636 + new).
- §XXIX currency: `current-*` refreshed (BR-LE-S8-1..8), committed with the code.

## 5. Implementation Prompt (§5 — strict order)

1. **`@vida/types/learning.ts`** — add `export interface EducationMeasurement extends SyncableEntity { ref_type:
MeasurementRefType; ref_id: string; measurement_kind: MeasurementKind; binding_mode: BindingMode | null; progress:
number | null; deleted_at: number | null }` (import `MeasurementKind`/`BindingMode`/`MeasurementRefType`). Barrel
   re-exports learning.
2. **`validators/learning.ts`** — `SetMeasurementSchema` (`measurement_kind: MeasurementKindSchema` **required**;
   `binding_mode: BindingModeSchema.nullish()` — N1: `.nullish()` (omittable ⇒ `?? null`) is a deliberate divergence
   from habit.ts:44's `.nullable()`, since setMeasurement lets the caller omit the mode). `MeasurementKindSchema`/
   `BindingModeSchema` are canonical in `validators/measurement.ts:4-5` (import them); `MeasurementRefTypeSchema` is in
   `validators/learning.ts:69` (reuse for `ref.type`).
3. **`service/types.ts`** — add `MeasurementRef = { type: MeasurementRefType; id: string }`, `SetMeasurementInput =
z.input<typeof SetMeasurementSchema>`, the two method sigs (`setMeasurement`, `getProgress`) on
   `LearningEducationService`; import `EducationMeasurement`. No new error type beyond the reused `SubjectNotFoundError`/
   `ProgramNotFoundError`.
4. **`service/service.ts`** — add `educationMeasurementsRepo` (softDelete:true); `toEducationMeasurement` mapper;
   private `findMeasurement(ref)` + `deriveProgress01(ref, mode)` + `programSubjects(programId)`; implement
   `setMeasurement` (guard ref, upsert) + `getProgress` (inline resolveProgress §3.2, 0–100 scale); add both to the
   returned object.
5. **`__tests__`** — a live-store suite: setMeasurement create+upsert+typed errors+required-kind; getProgress
   none/derived-pull/null-mode-default/manual/event-trigger/program-rollup/stored-override-wins/ungraded-null/empty-program-null.
6. **tsc 0 · eslint 0 · enum-parity green · full suite green** → Verification Gate → code-review → /critique → §XXIX
   currency (promote BR-LE-S8-\* into `current-business-rules.md`; update `current-spec.md` surface) in the build commit.

## 6. Risks / open items (the INTERPRETATION calls for Victor's eye)

- **getProgress unit = integer 0–100** (BR-LE-S8-3) — grounded in the `integer` column type (can't hold a [0,1] float)
  - `books.progress` 0–100. The alternative ([0,1] float) contradicts the column type. `[INTERPRETATION — strong lean]`
- **`binding_mode === null` ⇒ derive-by-default = grade** for a subject (BR-LE-S8-5) — grounded in derive-by-default
  (M3) + 'derived-pull→grade' being Education's natural signal; the specific null→grade mapping is my call (the
  alternative: null ⇒ null/unmeasured until a mode is set). `[INTERPRETATION]`
- **`event-trigger` ⇒ null at M1** (BR-LE-S8-5) — no event source until M2; grounded as an M2 defer. `[INTERPRETATION]`
- **program rollup recurses through each subject's `getProgress`** (BR-LE-S8-6) — honors per-subject overrides; depth 1
  (subject⊂program), no cycle. The alternative (rollup raw `computeGrade` ignoring subject-level config) is simpler but
  ignores a subject's own measurement. `[INTERPRETATION]`
- Verify at /preflight: `MeasurementKindSchema`/`BindingModeSchema` canonical validators exist; the `@vida/types` barrel
  re-exports `EducationMeasurement`; `MeasurementRefType` is exported from `@vida/types`; `listCurriculaFor` returns the
  program's live curricula for the program-subjects union.
