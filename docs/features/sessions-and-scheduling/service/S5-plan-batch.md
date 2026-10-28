<!-- S5 forward spec — MOD-sessions ① · slice S5 (plan-batch endpoints). The §XXVI g1 gate object.
     The batch state machine over study_plan_batches (NO G5 placement algorithm). REFERENCES aspects + S1/_index. -->

# S5 — Plan-batch endpoints (forward spec · g1)

**Home:** extends `services/sessions/service.ts`. One new repo over `study_plan_batches`. Depends on S1
(the batch→session bridge would call `createSession`). New typed error `InvalidBatchTransition`.

**Scope (delivery-plan:249 + contract.md:37-38): the state machine + endpoints, NOT the algorithm.** M1.1
ships the wizard's backing endpoints; the **placement algorithm** (urgency/conflict, `planned_blocks`
population, `recalc`-on-miss internals — G5) is deferred to **M1.2 study-planner design-pass**. So the batch
carries `total_sessions:0` and writes no `planned_blocks` in M1.1.

**The detailed batch lifecycle is a DEFERRED mini-intake (intake:169-170).** The intake explicitly flags
"batch lifecycle + recalc on miss/skip ... **own mini-intake before speccing**" → the authoritative
status-transition semantics are re-specced at the M1.2 study-planner pass. So S5 is deliberately a **minimal
traversable shell**: `generatePlan → pending_approval` (not the DDL-default `draft`, whose `draft →
pending_approval` hop is the deferred algorithm's output) so the endpoint set is exercisable + testable now.
`draft` = the ②/wizard pre-generate state. `[FACT: intake:169-170; business-rules.md:88; DB-4 widened
course_id → scope_type/scope_id per G5 — scheduling.ts:74]`

## §1 Operations (return the row; signatures → `delivery/seam-contract.md`)

- `generatePlan(input): PlanBatch` — create a batch (the "generate" action). Status → `pending_approval`,
  `generated_at:now`, `total_sessions:0`. `input` = `{ scope_type?, scope_id?, name? }`. `name` `[E]`. The
  placement **`window`** (seam-contract) is NOT accepted here — it is algorithm-only input, added in M1.2 with
  the placement pass; S5 accepts no param it does not use (avoids the S3 `templateId` dead-surface class).
- `approvePlan(id): PlanBatch` — `pending_approval` → `approved`, `approved_at:now`.
- `activatePlan(id): PlanBatch` — `approved` → `active`.
- `recalcPlan(id): PlanBatch` — `active` → `active` (a recompute trigger; bumps `generated_at`). The real
  recompute (re-placement on miss) is the deferred algorithm (M1.2) — M1.1 is the endpoint shell.

## §2 Operation-flow & invariants

- **State machine (business-rules:88), fail-loud (IR-5).** `pending_approval → approved → active`, with
  `recalc` self-looping on `active`. Any endpoint invoked from a non-matching status → `InvalidBatchTransition
(id, from, event)`, **no write**. `draft` (wizard-in-progress) is the DDL default for a batch created outside
  `generatePlan` (a ② concern); `completed`/`failed` are terminal outcomes of the deferred algorithm +
  session-completion (M1.2) — **S5 does not transition into them** (no `completePlan`/`failPlan` endpoint;
  they're not in the contract's `approve`/`activate`/`recalc` set). `[FACT: business-rules.md:88-89; contract.md:37-38]`
- **Repo (nuance-1):** `study_plan_batches` → `{deviceId, encryptedFields:[], softDelete:false}` — **no
  `deleted_at`** (bare `...baseColumns`); a future delete would be hard. `name` `[E]` via the M1.0 seam.
  `[FACT: scheduling.ts:74; migration 014:148-168]`
- **SS-8 activate→createSession bridge — DEFERRED with the algorithm.** SS-8 (completing a `planned_block`
  calls `createSession` carrying `planned_block_id`) needs `planned_blocks`, which the deferred algorithm
  produces. M1.1 `activatePlan` flips status only; the block→session instantiation is M1.2. `[FACT: business-rules.md:46-49 SS-8; delivery-plan:249]`
- **No silent empty plan (business-rules:89) — DEFERRED.** `NoAvailability`/`NothingToSchedule` → `failed` is
  the algorithm's explicit-failure contract (M1.2 when it runs). M1.1 `generatePlan` is the shell (creates the
  batch row); it does not run placement, so it neither schedules nor fails on emptiness. Noted, not built.

## §3 Contract (delta)

Adds the 4 endpoints to `SessionsService`. `GeneratePlanInput` (`{ scope_type?, scope_id?, name? }`),
`PlanBatch` = the row type, `InvalidBatchTransition`. `scope_type`/`scope_id` are OPEN (no CHECK, G5-widened).

## §4 Acceptance criteria (Verification Gate — live unlocked vault)

1. `generatePlan({scope_type:'course', scope_id:'c1', name:'Wk1'})` → a row `status:'pending_approval'`,
   `generated_at` set, `total_sessions:0`; `sync_queue` enqueued.
2. `approvePlan` → `approved` + `approved_at` set; `activatePlan` → `active`; `recalcPlan` → stays `active`,
   `generated_at` re-bumped.
3. Illegal transitions → `InvalidBatchTransition`, no write: `approvePlan` on an `active` batch; `activatePlan`
   on a `pending_approval` batch; `recalcPlan` on a `pending_approval` batch.
4. `activatePlan` writes **no** `planned_blocks` and creates **no** sessions (SS-8 bridge deferred — assert the
   `planned_blocks` table is empty after activate).
5. `tsc` clean; full `@vida/core` suite green.

## §5 Implementation prompt (order)

1. `types.ts` — `GeneratePlanInput`, `PlanBatch` (= `StudyPlanBatchRow`), `InvalidBatchTransition(id, from, event)`.
2. `service.ts` — `batchRepo` (`softDelete:false`); the 4 endpoints; a hoisted `assertBatchStatus(row, expected,
event)` guard.
3. Wire into the `SessionsService` interface; re-export `InvalidBatchTransition`.
4. `__tests__` — AC1–AC4 on a live vault.

## §6 Out of scope (homed)

The **placement algorithm** (urgency/conflict scoring, `planned_blocks` population, `recalc` re-placement, G5) →
M1.2 study-planner design-pass · SS-8 block→session instantiation → with the algorithm · `completed`/`failed`
transitions → algorithm + session-completion (M1.2) · `dueIn` consuming the plan → S7 · `name` encryption → M3/DB-5.
