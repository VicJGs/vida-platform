<!-- current-spec — features/sessions-and-scheduling · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Spec — Sessions & Scheduling (built slice)

**Status:** AR-5 shipped the Pillar-1 STRUCTURAL foundation. Everything else in the 5-aspect design docs
remains INTENDED (not yet built). `[FACT: this branch — commit pending]`

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
  throws in M1.1 (`log_time`/`attach_pomodoro` handlers deferred #46); a no-effect type completes `fired:0`.
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
- **Config (PD-3):** the runtime **obeys `user_preferences.pomodoro_*`** → PD-3 defaults (25/5/15/4), read via
  a repo. Templates are UI-applied presets (S6), **NOT** threaded into the runtime cadence (PD-3: "runtime only
  obeys [preferences]"; no per-run config storage / `template_id` link). Corrected in S6 (was over-stated as a
  template→prefs→defaults precedence). `[FACT: pomodoro/business-rules.md:22-25]`
- **S2-flag RESOLVED (intake:166,179 "stub the contract, wire later"):** `completeFocus` finalizes the
  **focus_sessions run only** (status + duration + `completed_count`); it does **NOT** auto-fire session effects
  in M1.1 — the session stays `in_progress`, and session-completion-with-effects remains S2's single
  `completeSession` path (fired when #46 wires handlers). The shipped `focus` def is untouched (registry.test-pinned).

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
  `session_templates` (focus presets, PD-3). Hard-delete (no `deleted_at`). `name`/`description` `[E]` seam.
- **`is_default` single-winner** — `setDefaultTemplate`/create/update with `is_default:true` unset every other
  (sequential best-effort). Validation (IR-5): `name` non-empty, minutes/intervals ≥ 1 (DDL has no CHECK →
  app-layer is the guard). `createTemplate` re-reads post-insert so DDL-defaulted fields are complete.
- Templates are **presets** — applying one to a run is a UI concern (fe-sessions); the S3 runtime obeys
  `user_preferences` (PD-3), not a template. `usage_count`/`last_used_at` bump-on-use → fe-sessions.

## What is DEFERRED (NOT built — the rest of MOD-sessions ①'s scope)
Effect-firing rail primitive built by AR-7; **lifecycle engine + fire step BUILT (#32); DB-4 schema substrate
BUILT; S1 CRUD + attach + S2 registry-validation + completion-wiring + S3 focus runtime + S4 availability + S6 templates BUILT (above).** Still deferred:
per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + consent-threading → #46/MOD-* ·
non-completion firing + heterogeneous-attachment target disambiguation → with handlers · **plan-batch endpoints**
(`approve`/`activate`/`recalc`; no G5 algorithm) → **S5** · **`dueIn` aggregator + analytics** → **S7** ·
view layer → G9 · shipped-type editing → later · `key_learnings` encryption (M1.0 pass-through seam,
`encryptedFields:[]`).

## Verification (2026-07-28)
typecheck 10/10 · @vida/core 110/110 · @vida/web 6/6 · deferral grep clean. Spec:
`docs/specs/foundation/ar-5-sessions-base/`.
