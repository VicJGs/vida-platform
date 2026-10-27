<!-- current-spec — features/sessions-and-scheduling · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Spec — Sessions & Scheduling (built slice)

**Status:** ① service tier BUILT (AR-5 spine · #32 rail · DB-4 schema · MOD-sessions S1–S7 · routines-S6 planned blocks);
② fe-session-runtime #23 + fe-session-hud #16 BUILT with M1 stub data legs (debt → `sessions-rescope`). What remains
INTENDED is listed under "What is DEFERRED". `[FACT: sections below; baseline 2026-10-27]`

## What is BUILT (AR-5 · ADR-004 §3.1/§3.2)

### Enums (`packages/types/src/session.ts`)

- `SESSION_SUB_TYPE` (9, OPEN), `SESSION_PURPOSE` (6, OPEN), `SCHEDULING_MODE` (3, FIXED), `SESSION_STATUS`
  (7, FIXED — the S5 lifecycle), `EFFECT_TYPE` (12 — ADR-004 §3.2.2 base 8 + ADR-012 amendment 4). C2
  tuple-as-source; validators `z.enum(...)` in `validators/session.ts`.

### Tables (`db/schema/foundation/sessions.ts` + migration `002_sessions.ts`)

- **`sessions`** — the base spine (syncable). `sub_type`/`purpose` OPEN free-TEXT; `scheduling_mode`/`status`
  FIXED SQL-CHECK; `focus_rating`/`energy_level` CHECK 1..5; `key_learnings` `[E]`; `...baseColumns` + soft delete.
  Indexes: status, sub_type.
- **`session_type_registry`** — `id` PK + `sub_type` UNIQUE; persists user `SessionTypeDef`s (dims 2-4 as JSON).
- **`session_attachments`** — dim1 polymorphic (session_id + entity_type/entity_id + level CHECK). Index on session_id.
- NO cross-table FK (ADR-004 §3.4 — sync applies rows out of order; integrity is app/sync-layer).

### Contract types + thin registry (`foundation/sessions/{types,registry}.ts`)

- `SessionTypeDef` + `CapabilityEnvelope` + `SessionTransition` + 4 typed errors.
- `createSessionRegistry(db, deviceId)` → `register/get/list`. Shipped types in-memory (`SHIPPED_SESSION_TYPES`,
  seeded `focus`); user types persist via the db-6 `Repository` (co-transactional `sync_queue` enqueue) + sync.

## Contract (delivered surface)

- `register(def)`: validates BR-3 (4 dims), BR-4 (effects ⊆ allowed_effects ⊆ shipped envelope), BR-1
  (unique across shipped + persisted); persists user types. `get(sub_type)` / `list()` merge shipped ∪ user.
- Typed errors, fail-loud, no partial writes.

## What is BUILT (XS-effect-rail #32 · XCU-09/10 — `foundation/sessions/{attachments,lifecycle}.ts`)

- **`resolveTargets(db, sessionId): ResolvedTarget[]`** (`attachments.ts`, XCU-10) — the read-side of dim1: all
  `session_attachments` rows for a session (`{entityType, entityId, level}`), `[]` when none. Direct select, no
  soft-delete filter (`session_attachments` has no `deleted_at`).
- **`transition(deps, sessionId, event): {status, fired}`** (`lifecycle.ts`, XCU-09) — the lifecycle state machine:
  validate the declared `(status,event)` transition (else `InvalidTransition`, no write); stamp `started_at` at
  `in_progress`; **on completion** fire the type's declared effects; commit status **last** (fire-first, replay-safe).
- **`fireCompletionEffects(deps, session, def): {fired}`** (exported) — per (effect × resolved target) the
  replay-safe `applyEffect` fan-out (no outer tx); occurrence key = target entity + **stable `started_at` UTC date**
  (SS-6 no-double-count); no-attachment fallback = the session is the subject. Structural `canTouch` only —
  **sensitive-consent is handler-side** (ADR-004 §3.2.5-A3/BR-17), the S2 gate is the handler seam.

## What is BUILT (DB-4 #3 · schema substrate — migration `014_sessions_scheduling.ts` + `010_scheduling.ts`)

DB-4 landed the full table substrate the service tier (MOD-sessions ①) will drive. All tables carry
`...baseColumns` (syncable); DDL is hand-written SQL in the migrations, mirrored by the Drizzle schema. NO FK
(ADR-004 §3.4). `[FACT: ALL_MIGRATIONS registers 010+014 — runner.ts:21,24,60]`

- **1:1 sub-type extensions** (`schema/foundation/session-extensions.ts`) — own `id` UUIDv7 PK + `session_id`
  UNIQUE → `sessions.id` (the 1:1 key, plain TEXT no FK); spine fields never re-stored (BR-S1); zero-`[E]`:
  - **`study_sessions`** — `resource_type` (`STUDY_SESSION_RESOURCE_TYPE`, FIXED CHECK) · `resource_id` ·
    `pages_read` · `lessons_completed`. Index `(resource_type, resource_id)`.
  - **`focus_sessions`** — the Pomodoro timer runtime (supersedes retired v2 `pomodoro_sessions`, PD-1/2):
    `duration_seconds` · `type` (`POMODORO_TYPE`, FIXED) · `status` (`POMODORO_STATUS`, FIXED, default `running`)
    · `completed_count` · `paused_at` · `total_pause_seconds` · `was_interrupted` · `interruption_reason`.
    Index `(status)`. `[FACT: session-extensions.ts:35-51]`
- **Scheduler/planner tables** (`schema/foundation/scheduling.ts`) — §5.11 "redefined, not dropped":
  - **`planned_blocks`** (DB-3) — aggregator output; `scheduled_start/_end` · `sub_type` (OPEN, no CHECK) ·
    `target_type`/`target_id` (polymorphic) · `status` (`PLANNED_BLOCK_STATUS`, FIXED) · `source` · own `deleted_at`.
  - **`study_availability`** — recurring windows: `day_of_week` (CHECK 0..6) · `start/end_time` (HH:MM) ·
    `is_available` · `preference_score` (CHECK 1..5) · `preset_block` (`PRESET_BLOCK`, FIXED) · `max_session_minutes`.
  - **`availability_exceptions`** — date overrides: `exception_date` · `is_available` · `reason` `[E]` · `start/end_time`.
  - **`study_plan_batches`** — `name` `[E]` · `scope_type`/`scope_id` (OPEN, G5-widened) · `status`
    (`STUDY_PLAN_BATCH_STATUS`, FIXED, +`failed`) · `total_sessions` · `generated_at` · `approved_at`.
  - **`session_templates`** — focus presets: `name` `[E]` · work/break minutes · `intervals_before_long_break` ·
    auto-start flags · `is_default` · `focus_technique` · `description` `[E]` · `notifications`/`sounds` · usage stats.
    `[FACT: scheduling.ts:19-113]`
- **Validators** (`validators/session.ts`) — `PlannedBlockStatusSchema` present; the DB-4 enums
  (`POMODORO_*`, `STUDY_*`, `PRESET_BLOCK`) live in `@vida/types` (`session.ts`, `knowledge.ts`, `learning.ts`).

## What is BUILT (MOD-sessions ① · S1 — `services/sessions/`)

The first real `services/*` build: `createSessionsService({ db, deviceId, registry, rail, entityRegistry })`
(factory-object, mirrors `foundation/spaces/service.ts`). `[FACT: services/sessions/service.ts]`

- **Session CRUD** — `createSession` (spine + optional 1:1 `focus`/`study` extension, written **atomically** via
  `Repository.createInTx` in one `db.transaction`) · `getSession` (spine + mapped extension, null if
  soft-deleted) · `updateSession` (spine + extension; `sub_type` immutable) · `softDeleteSession` (**spine only**
  — extensions carry no `deleted_at`, base owns lifecycle) · `restoreSession` (spine update-by-PK; extension
  reappears intact).
- **`attach`/`detach`** — idempotent structural attach over `session_attachments` (findWhere-key → no-op-or-
  create, **no revive** — no `deleted_at`); `detach` = **hard delete**; `resolveTargets` re-exports the #32 reader.
- **`findOpenSessionForEntity(subType, entityType, entityId): SessionRow | null`** (added by mod-tasks #65 S4,
  2026-10-15) — the REVERSE of `resolveTargets`: the in_progress session of `subType` attached to `(entityType,
entityId)`, or null. Read-only (attachment read + spine `status`/`sub_type` filter, soft-delete-filtered via
  `findById`); the running-timer guard a consuming module needs when it can't read `session_attachments` directly (§6).
- **Repos:** `sessions` `softDelete:true`; `focus_sessions`/`study_sessions`/`session_attachments`
  `softDelete:false` (no `deleted_at`). All `encryptedFields:[]` (M1.0 pass-through). Structural validation
  (`CreateSessionSchema`, fail-loud `InvalidSessionInput`).

### S2 — registry validation + completion wiring (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 16 tests green on a live unlocked vault]`

- **`createSession` sub_type gate** — `await registry.get(sub_type)` before the tx; unregistered → `SessionTypeNotFound`,
  no write (SS-3). Roster stays **AR-5-shipped (`focus`) + the `register()` seam** (delivery-plan:239); owning
  modules register their own sub-types (SS-5) — S2 seeds nothing.
- **`attach` entity_type gate** — `entityRegistry.isRegistered(entityType)` → `UnknownEntityType` (BR-6); mirrors
  the spaces `assertRegistered`. Factory gained `rail: EffectRail` + `entityRegistry: TaggableTypeRegistry` deps.
- **`completeSession`/`transitionSession`** — delegate to the built #32 `transition({db, registry, rail, deviceId},
id, event)` (IR-1 — no second firing path). Completion fires declared effects through the rail, which is
  **fail-loud**: a non-`projection` effect with no handler throws `NoEffectHandler`. So `completeSession('focus')`
  throws in M1.1 (`log_time`/`attach_pomodoro` handlers deferred — focus handlers → sessions-rescope); a no-effect type completes `fired:0`.
  **⚠ focus-completion behavior in M1.1 → resolved in S3 (below).**

### S3 — Pomodoro focus runtime (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 23 sessions tests green on a live unlocked vault]`

- **`startFocus`/`pauseFocus`/`resumeFocus`/`nextInterval`/`completeFocus`/`cancelFocus`** over the
  `focus_sessions` row (the timer id = `focus_sessions.id`). `startFocus({})` creates a fresh `focus` session
  (`in_progress`) + timer; `startFocus({sessionId})` resumes (paused→running / running→no-op / terminal→error).
- **Timer state machine** `running ⇄ paused → completed | cancelled`; illegal moves → `InvalidFocusTransition`;
  absent/non-focus → `SessionMissing`. Pause-exclusion (PD-5): `total_pause_seconds` accrues, real focus =
  run wall-time − pauses (per-interval cut derived in S7). Interruption capture (PD-6). Cadence (PD-4):
  `nextInterval` advances focus→break→focus, long-break every `sessions_before_long`, `completed_count` tracks.
- **Config (PD-3):** the runtime resolves cadence from `user_preferences.pomodoro_*` → PD-3 defaults
  (25/5/15/4), read via a repo. PD-3 = "config is Preferences-owned; the runtime only obeys it." Named
  templates are **②-applied presets** (fe-sessions) — the M1.1 backend persists **no** timer↔template binding
  (no `template_id` on `focus_sessions`), so `nextInterval` does not resolve from a template. `startFocus.templateId`
  is a ②-seam the backend does not consume. _(Reconciled in S6 — §XXVIII — from the S3 spec's original
  "template → prefs → defaults" precedence, which contradicted PD-3 + the schema.)_
- **S2-flag RESOLVED (intake:166,179 "stub the contract, wire later"):** `completeFocus` finalizes the
  **focus_sessions run only** (status + duration + `completed_count`); it does **NOT** auto-fire session effects
  in M1.1 — the session stays `in_progress`, and session-completion-with-effects remains S2's single
  `completeSession` path (fired once the focus handlers register — sessions-rescope, which also closes the spine). The shipped `focus` def is untouched (registry.test-pinned).

### S4 — Availability (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 28 sessions tests green on a live unlocked vault]`

- **`setAvailability`/`updateAvailability`/`removeAvailability`/`listAvailability`** over `study_availability` +
  **`addAvailabilityException`/`removeAvailabilityException`/`listAvailabilityExceptions`** over
  `availability_exceptions` (SS-9 — Planner-owned scheduling input).
- **Hard-delete** (`hardDelete`, no `deleted_at`; syncs `operation:'delete'`). Fail-loud validation (IR-5):
  `day_of_week` 0..6, `preference_score` 1..5, `preset_block` ∈ 7 `PRESET_BLOCK` values, HH:MM times +
  `end > start`, `YYYY-MM-DD` date → typed `InvalidSessionInput` before the write.
- **Doc-resolved semantics:** `is_available:false`+times is a valid recurring **blackout** window (orthogonal,
  never rejected); **no uniqueness/overlap check** — overlapping/multiple windows are valid Planner input the
  (deferred, G5) placement algorithm resolves. `[FACT: SS-9; intake:31-33; scheduling.ts no UNIQUE]`

### S6 — session_templates CRUD (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 32 sessions tests green on a live unlocked vault]`

- **`createTemplate`/`updateTemplate`/`deleteTemplate`/`listTemplates`/`setDefaultTemplate`** over
  `session_templates` (focus presets, PD-3). Hard-delete (no `deleted_at`; syncs `operation:'delete'`).
  `name`/`description` `[E]` via the M1.0 seam.
- **`is_default` single-winner (PD-3):** a hoisted `unsetOtherDefaults(exceptId)` clears every other default;
  `setDefaultTemplate` + `create`/`update` with `is_default:true` enforce at-most-one. Sequential best-effort.
- **Fail-loud validation (IR-5):** `name` non-empty, minutes/intervals ≥ 1 (no DDL CHECK → app-layer is the
  guard). `create` sets all fields explicitly (defaults mirror the DDL) so the returned row == the DB row.
- **`usage_count`/`last_used_at` bump-on-use → homed to ② (fe-sessions)** — S6 exposes the fields via CRUD;
  the backend does not auto-increment (doc-checked: no doc specifies backend bump timing).

### S5 — Plan-batch endpoints (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 36 sessions tests green on a live unlocked vault]`

- **`generatePlan`/`approvePlan`/`activatePlan`/`recalcPlan`** — the `study_plan_batches` state machine
  (`pending_approval → approved → active`, `recalc` self-loops on `active`); illegal moves →
  `InvalidBatchTransition`, no write. `softDelete:false`; `name` `[E]`; `create` sets all fields explicitly
  (returned row == DB row). `generatePlan → pending_approval` = a minimal traversable shell (`total_sessions:0`).
- **Deferred (grounded — intake:169-170 batch-lifecycle mini-intake + G5):** the placement **algorithm**
  (`planned_blocks` population, urgency/conflict, recalc re-placement), the **SS-8** block→session bridge
  (`activatePlan` writes no `planned_blocks` in M1.1 — proven by AC4), and the `completed`/`failed` terminal
  transitions → **M1.2 study-planner design-pass**.

### Routines S6 (R1 first-consumer-pull) — owner-written planned blocks (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; validators/session.ts PlanBlockSchema/PlannedBlockPatchSchema; 4 tests]`

- **`planBlock(input)`** — one block for a caller-given slot (`scheduled_end > scheduled_start` when given); `sub_type`
  registry-validated (`SessionTypeNotFound`), `target_type` a registered target (`UnknownEntityType`, BR-6), status `planned`.
  Malformed → `InvalidSessionInput`. No placement logic: the G5 algorithm stays M1.2.
- **`updatePlannedBlock(id, {scheduled_start?, scheduled_end?, status?})`** — slot move / status flip; missing id →
  `InvalidSessionInput('id')`. · **`softDeletePlannedBlock(id)`** · **`listPlannedBlocksForTarget(type, id)`** — live blocks
  pointing at the owner's item (SS-7), by `scheduled_start`.
- First consumer: routines `rescheduleStep` (an SS-8 intent block; the make-good links the session via `planned_block_id`).

### S7 — dueIn aggregator + analytics (`services/sessions/service.ts`)

`[FACT: services/sessions/service.ts; 40 sessions tests green on a live unlocked vault]`

- **`dueIn(range): DueItem[]`** — the shared platform primitive (IR-2; Journals + future Calendar consume it):
  own `planned_blocks` in range (`deleted_at`-filtered; **routines S6: only `planned|scheduled`**, fulfilled/skipped intent isn't due, SS-8) ∪ live provider reads. **SS-7 degrade:** a throwing
  provider lane is caught + skipped; `dueIn` never throws. Empty registry + no blocks (M1.1) → `[]`.
- **`registerDueProvider(provider)`** — the empty provider seam (N5); owning modules register lanes at their build.
  **Registered lanes (first-consumer-pull — registered in the apps/web composition root `db/composition-root.ts` by fe-calendar #19 S7, 2026-10-22; the Calendar is the dueIn consumer):** purposes (`registerPurposesDueProvider`,
  target reviews) · relationships (`registerRelationshipsDueProvider`, reminders/nudges/groups) · **tasks
  (`registerTasksDueProvider`, S9 2026-10-19 — OPEN tasks whose `due_date` OR `scheduled_date` ∈ window, `hard_deadline`
  = due date; the Calendar sees tasks only through this lane)**. All three convert calendar dates at UTC midnight —
  callers build `TimeRange` bounds the same way.
- **`getSessionAnalytics(range): SessionAnalytics`** — derived-on-read (SS-12/IR-6, no stored aggregate):
  `{total, completed, completionRate, avgFocusRating, totalFocusSeconds}`, `deleted_at`-filtered. Richer cuts
  (per-module time, planned-vs-actual, streaks) → later getters.
- `DueItem`/`DueProvider`/`SessionAnalytics`/`TimeRange` in `services/sessions/types.ts` (barrel-exported;
  `@vida/types` promotion deferred until a non-core consumer needs it).

## ① BACKEND COMPLETE — all 7 slices built (S1–S7)

`services/sessions/` is the full MOD-sessions ① service tier over the AR-5 spine + #32 rail + DB-4 schema:
session CRUD+attach · registry-validation+completion-wiring · Pomodoro focus runtime · availability · plan-batch
endpoints · templates · dueIn+analytics. `@vida/core` 879/879. Next: ② UI = `fe-sessions`.

## ② FRONTEND — Session runtime page (fe-session-runtime #23, LIF-218 · built 2026-10-15)

The first frontend consumer of the Flow/Session codec seam — the `/sessions/$id` runtime page (deliverable-per-stage).

- **S1 — data leg** (`apps/web/src/flow/`): `toFlowSource(session, deliverable?, attachments?, effects?)` assembles a
  single-stage `FlowSource` (EC-9; total `SESSION_STATUS→StageStatus` map; proof from `session_attachments`; effects via
  `mapEffectLog`); `useFlowSession(sessionId)` is the data hook. **The data leg is still a stub** — empty default + `?sample`
  DEV seed, **zero-signature live swap** documented (`useQuery → sessions.getSession + resolveTargets + applied_effects`).
  `state: TerminalState`. Its original blockers (S1-D2: no composition root · worker `values` seam) are **GONE** since
  `data-plane-wiring` (PR #148, 2026-10-20): `apps/web/src/db/composition-root.ts:100` constructs `sessions` (+ the tasks/
  purposes/relationships due lanes, :111-113) and `values` is live (`db/worker.ts:122`). The hook flip itself is unbuilt →
  `sessions-rescope` (LIF-248). `[FACT: baseline 2026-10-27]`
- **S2 — surface** (`apps/web/src/session-runtime/`): `session-runtime-surface.tsx` (router-free: hook → terminal-state
  ladder → `FlowSessionView` via `toFlowProps` + `bindFlowIntents`; effect rail always renders, EC-4) + the thin routed
  `session-runtime-page.tsx` (`/sessions/$id`, lazy) in `routes.tsx`.
- **Verification:** tsc 0 · eslint 0 · apps/web flow+surface tests green · **Visual Gate PASS** (standalone entry, Brave,
  3 presets × light/dark × 375/768/1440: AA 4.94–6.03 incl. warm-dark · no 375 overflow · axe clean). EC-2/4/5/7/8/9/11
  confirmed live; EC-1/3 shell-inherited (single-stage per O7); EC-10 (advance feel) live-deferred (M1 no-op port).
- **M1 stubs (surface):** `session-runtime-surface.tsx:78-79` passes `attachTarget: () => undefined` + `onProof: () => {}`
  into `bindFlowIntents` (`flow/adapter.ts:113-122`) — so Attach renders but drops the intent (X12) and Require-proof is a no-op.
- **Deferred (not #23):** multi-stage per-module assembly (O7) · effect WRITES/lifecycle consumption handlers (per receiving module, SES-13; focus's → sessions-rescope).
  Spec: `docs/specs/foundation/fe-session-runtime/`.

## ② FRONTEND — Session HUD (fe-session-hud #16, LIF-217 · merged 2026-10-18, PR #144 `33278c1`)

The persistent shell-strip indicator (region 6) for an active session (no single-active invariant exists on disk). `[FACT: apps/web/src/session-hud/*; its CLAUDE.md]`

- **S1 — seam** (`types.ts`, `use-hud-clock.ts`, `use-active-session.ts`): tri-state `HudRead` (`hidden`/`idle`/`active`);
  `HudSource` derives paused from `timing.pausedAt`; `HudTiming` = `countdown` (phase · `endAt` · `durationSeconds` ·
  `pausedAt?`) | `elapsed` (`startedAt`); `HudSessionsPort` = `pauseFocus`/`resumeFocus`. `deriveHudClock(timing, now)` is a
  pure projection (paused ⇒ frozen at `endAt − pausedAt`, PD-5 · zero-cross ⇒ hold `0:00` + complete, never overtime).
- **S2 — pill** (`session-hud.tsx`): ring + tabular time + phase eyebrow (≥tablet) + title; body = one SPA link →
  `/sessions/$id`; pause/resume ghost is a DOM sibling, only when `canPause && !complete && ≥tablet`.
- **S3 — mount** (`session-hud-surface.tsx` + the `routes.tsx` hudSlot): router-subscribed search → `useActiveSession`.
- **M1 stubs:** `useActiveSession` defaults to `{kind:'hidden'}` (renders nothing in prod) with DEV `?sample=` forms; the
  port is a logging no-op (`use-active-session.ts`). Live swap = the two-source model: ① `findActiveSession()` (**does not
  exist** — the service has `getSession(id)` + entity-scoped `findOpenSessionForEntity`, S1 section above) + ② the shared focus-runtime
  client store (ships with the first live timer driver). Debt → `sessions-rescope`; findings `docs/specs/foundation/
fe-session-hud/delivery/findings.md` F-HUD-1.

## What is DEFERRED (NOT built — homed beyond MOD-sessions ①)

Effect-firing rail primitive built by AR-7; **lifecycle engine + fire step BUILT (#32); DB-4 schema substrate
BUILT; S1–S7 the full ① service tier BUILT (above).** Still deferred (NOT ①'s scope):
per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + consent-threading → the receiving MOD-\* tracks (SES-13) ·
non-completion firing + heterogeneous-attachment target disambiguation → with handlers · the plan **placement
algorithm** + SS-8 bridge + `completed`/`failed` → M1.2 · live **`dueIn` provider lanes** (Books/Flashcards/
Knowledge/Education/Language) → owning modules (the S7 registry is the seam) · richer analytics (per-module time,
planned-vs-actual, streaks) → later getters · **② UI** (session/planner hub, `/pomodoro` widget) → `fe-sessions`; the shipped ② stubs (HUD · runtime intents ·
`useFlowSession`) + the 2 missing reads → `sessions-rescope` ·
view layer → G9 · shipped-type editing → later · `key_learnings` encryption (M1.0 pass-through seam, `encryptedFields:[]`).

## Verification (2026-07-28)

typecheck 10/10 · @vida/core 110/110 · @vida/web 6/6 · deferral grep clean. Spec:
`docs/specs/foundation/ar-5-sessions-base/`.
