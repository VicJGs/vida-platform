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
The first real `services/*` build: `createSessionsService({ db, deviceId, registry })` (factory-object, mirrors
`foundation/spaces/service.ts`). `[FACT: services/sessions/service.ts; 10 tests green on a live unlocked vault]`
- **Session CRUD** — `createSession` (spine + optional 1:1 `focus`/`study` extension, written **atomically** via
  `Repository.createInTx` in one `db.transaction`) · `getSession` (spine + mapped extension, null if
  soft-deleted) · `updateSession` (spine + extension; `sub_type` immutable) · `softDeleteSession` (**spine only**
  — extensions carry no `deleted_at`, base owns lifecycle) · `restoreSession` (spine update-by-PK; extension
  reappears intact).
- **`attach`/`detach`** — idempotent structural attach over `session_attachments` (findWhere-key → no-op-or-
  create, **no revive** — no `deleted_at`); `detach` = **hard delete**; `resolveTargets` re-exports the #32 reader.
- **Repos:** `sessions` `softDelete:true`; `focus_sessions`/`study_sessions`/`session_attachments`
  `softDelete:false` (no `deleted_at`). All `encryptedFields:[]` (M1.0 pass-through). Structural validation
  (`CreateSessionSchema`, fail-loud `InvalidSessionInput`). NOT yet: semantic `sub_type`/`entity_type` **registry**
  validation, completion/lifecycle wiring → **S2**.

## What is DEFERRED (NOT built — the rest of MOD-sessions ①'s scope)
Effect-firing rail primitive built by AR-7; **lifecycle engine + fire step BUILT (#32); DB-4 schema substrate
BUILT; S1 session CRUD + attach BUILT (above).** Still deferred:
per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + consent-threading → #46/MOD-* ·
non-completion firing + heterogeneous-attachment target disambiguation → with handlers · **runtime
`sub_type`/`entity_type` registry-validation + completion→`transition()` wiring** → **S2** · **Pomodoro focus
runtime** (start/pause/resume/complete/cancel/nextInterval over `focus_sessions`) → **S3** · **availability** →
**S4** · **plan-batch endpoints** (`approve`/`activate`/`recalc`; no G5 algorithm) → **S5** · **`session_templates`
CRUD** → **S6** · **`dueIn` aggregator + analytics** → **S7** · view layer → G9 · shipped-type editing → later ·
`key_learnings` encryption (M1.0 pass-through seam, `encryptedFields:[]`).

## Verification (2026-07-28)
typecheck 10/10 · @vida/core 110/110 · @vida/web 6/6 · deferral grep clean. Spec:
`docs/specs/foundation/ar-5-sessions-base/`.
