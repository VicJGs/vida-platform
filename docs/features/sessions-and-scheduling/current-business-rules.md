<!-- current-business-rules — features/sessions-and-scheduling · the ENFORCED rules (durable, §XXIX).
     business-rules.md (SS-1…SS-12) is the INTENDED authority; THIS records which invariants are actually
     ENFORCED in shipped code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Business Rules — Sessions & Scheduling (enforced slice)

AR-5 enforces the STRUCTURAL half of the Integration Contract. XS-effect-rail **#32** added the runtime lifecycle
engine + fire step (lifecycle legality + effect firing + no-double-count). Sensitive-consent stays handler-side
(deferred with per-module handlers, #46).

## ENFORCED now (AR-5)
- **BR-1 (SS-1) — one spine, unique sub_type.** `session_type_registry.sub_type` UNIQUE; `SessionRegistry.register`
  rejects a collision against BOTH the shipped map and persisted user rows with a typed `DuplicateSubType`
  BEFORE insert (never a raw SQLite UNIQUE error). `[FACT: registry.ts]`
- **BR-2 (SS-2) — `sub_type` ⟂ `purpose`.** Separate columns + separate enums; the legacy conflated
  `SCHEDULED_SESSION_TYPE` is NOT reused. `[FACT: sessions.ts, session.ts]`
- **BR-3 (SS-3) — 4 dimensions required.** `register` rejects a `SessionTypeDef` missing attachment_defaults /
  effects / lifecycle / permissions → `InvalidSessionTypeDef`. `[FACT: registry.ts]`
- **BR-4 (SS-6, static half) — capability containment.** `effects[] ⊆ permissions.allowed_effects ⊆ shipped
  envelope`; a violation → `CapabilityEnvelopeExceeded`. (sensitive_optins CONSENT is fire-time → deferred.)
  `[FACT: registry.ts]`
- **BR-5a — FIXED enums = hard SQL CHECK.** `scheduling_mode`, `status`, `level` carry SQL CHECKs; parity test
  asserts CHECK-set ≡ tuple. `[FACT: 002_sessions.ts, enum-parity.test.ts]`
- **BR-5b — EFFECT_TYPE = Zod-validated (no SQL CHECK).** Stored as JSON; covered by the enum validator test.
- **BR-5c (DB-4 #3) — sub-type/scheduler FIXED enums = hard SQL CHECK.** `focus_sessions.type`/`.status`
  (`POMODORO_TYPE`/`POMODORO_STATUS`), `study_sessions.resource_type` (`STUDY_SESSION_RESOURCE_TYPE`),
  `planned_blocks.status` (`PLANNED_BLOCK_STATUS`), `study_plan_batches.status` (`STUDY_PLAN_BATCH_STATUS`),
  `study_availability.preset_block` (`PRESET_BLOCK`) + range CHECKs (`day_of_week` 0..6, `preference_score` 1..5)
  are DDL-enforced; `sub_type` on `planned_blocks` stays OPEN (no CHECK, SS-5/BR-6). App-layer/runtime validation
  of these on the WRITE path is still deferred to MOD-sessions ①. `[FACT: 014_sessions_scheduling.ts, scheduling.ts]`
- **BR-6 — OPEN vocab.** `sub_type`/`purpose`/`entity_type` are free-TEXT (no CHECK) so SS-5 user-extensibility
  holds. (Their runtime registry-validation binds with the write path — deferred.)
- **BR-7 — spine is syncable.** `sessions` + registry + attachments carry `...baseColumns` (`_sync_*`);
  `key_learnings` `[E]`. User type-defs sync via the Repository; shipped defs are in-memory (SS-4, not synced).

## ENFORCED now (XS-effect-rail #32 · XCU-09/10 — `foundation/sessions/{attachments,lifecycle}.ts`)
- **BR-8 (SS-1/SS-8) — lifecycle legality.** `transition(sessionId, event)` fires only a `(status,event)` declared
  in the type's `lifecycle.transitions`; an illegal move → `InvalidTransition`, **no write**. Not target-state
  idempotent (a re-acked move throws). `[FACT: lifecycle.ts]`
- **BR-9 (SS-6 runtime) — no-double-count.** On completion each declared effect fires per resolved target via
  `applyEffect`, keyed `derive(target.entityId ‖ started_at-UTC-date ‖ effectType)` → the `applied_effects` ledger
  dedupes replays + cross-device re-origination (SS-6). Fallback subject = the session when unattached.
  `[FACT: lifecycle.ts fireCompletionEffects; effects/service.ts]`
- **BR-10 — fire-first, commit-status-last.** Effects fire before the status write (the commit point); a mid-fire
  crash self-heals on replay. `[FACT: lifecycle.ts; ADR-004 §3.2.5-B.4]`
- **BR-11 (XCU-10) — attachment resolution.** `resolveTargets` returns a session's attachments (both levels), the
  scope effects fire into. `[FACT: attachments.ts]`
- **BR-12 — structural canTouch only; consent handler-side.** The engine fires structurally-scoped effects (effect
  ∈ allowed_effects at registration; target ∈ attachments by construction); sensitive-consent is enforced by the
  consuming handler via the `assertEffectPermitted` seam (`foundation/effects/gate.ts`), NOT the engine
  (ADR-004 §3.2.5-A3 / BR-17 / IR-5 — no engine-side `moduleClass` inference). `[FACT: lifecycle.ts, effects/gate.ts]`

## ENFORCED now (MOD-sessions ① · S1 — `services/sessions/service.ts`)
- **BR-13 (IR-5) — structural create validation, fail-loud.** `createSession` runs `CreateSessionSchema`
  (enum membership for `scheduling_mode`/`status`; `focus_rating`/`energy_level` 1..5; `ended_at ≥ started_at`);
  a failure → `InvalidSessionInput(field)`, no write. `status` is caller-supplied (spine has no default).
  `[FACT: service.ts createSession; validators/session.ts CreateSessionSchema]`
- **BR-14 (nuance-2) — spine+extension atomicity.** The `sessions` row + its 1:1 `focus`/`study` extension are
  written in ONE `db.transaction` via `createInTx`; a failed extension insert rolls back the spine (proven: an
  invalid `focus_sessions.type` leaves zero `sessions` rows). `[FACT: service.ts; sessions-service.test.ts AC2]`
- **BR-15 (B1) — `sub_type`→extension routing.** Only `focus`→`focus_sessions`, `study`→`study_sessions`; every
  other sub_type is spine-only. An `extension` on an unmapped/mismatched sub_type → `InvalidSessionInput
  ('extension')`. `[FACT: service.ts extKindFor]`
- **BR-16 (B2′) — soft-delete is spine-only.** Extensions carry no `deleted_at` (base owns lifecycle) →
  `softDeleteSession` flips the spine's `deleted_at`; the extension is unreachable via `getSession` and reappears
  on `restoreSession` (update-by-PK). `[FACT: service.ts; session-extensions.ts; memory session-extensions-carry-no-deleted-at]`
- **BR-17 (IR-7) — attach is idempotent + hard-detach.** `attach` no-ops on a duplicate `(session_id,
  entity_type, entity_id, level)` key (no revive path — no `deleted_at`); `detach` hard-deletes. `sub_type`
  immutable on `updateSession` (B3). `[FACT: service.ts attach/detach/updateSession]`
- **NOTE — S1 is STRUCTURAL only.** Semantic `sub_type`/`entity_type` **registry** validation and completion→
  `transition()` wiring are S2.

## ENFORCED now (MOD-sessions ① · S2 — `services/sessions/service.ts`)
- **BR-18 (SS-3) — createSession sub_type registry gate.** `createSession` runs `await registry.get(sub_type)`
  before the tx; an unregistered sub_type → `SessionTypeNotFound`, no write. The roster is AR-5-shipped (`focus`)
  + the `register()` seam (delivery-plan:239); owning modules register their own sub-types (SS-5). `[FACT: service.ts]`
- **BR-19 (BR-6) — attach entity_type registry gate.** `attach` rejects an entity_type not in the
  `TaggableTypeRegistry` (ENTITY_TYPES) → `UnknownEntityType`; mirrors the spaces `assertRegistered`. `[FACT: service.ts; spaces]`
- **BR-20 (IR-1, SS-1/SS-8) — completion routes through the #32 engine, fail-loud.** `completeSession`/
  `transitionSession` delegate to `transition({db, registry, rail, deviceId}, id, event)` — no second firing
  path (preserves BR-8..BR-12). Completion fires declared effects via the rail; a non-`projection` effect with no
  handler → `NoEffectHandler` (fail-loud). `completeSession('focus')` throws in M1.1 (its handlers deferred #46);
  a no-effect type completes `fired:0`; an illegal `(status,event)` → `InvalidTransition`. Focus-completion M1.1
  behavior → S3. `[FACT: service.ts; lifecycle.ts; effects/service.ts:38-40]`

## ENFORCED now (MOD-sessions ① · S3 — focus runtime, `services/sessions/service.ts`)
- **BR-21 (PD-4, IR-5) — timer state machine, fail-loud.** `focus_sessions.status` moves `running ⇄ paused →
  completed | cancelled`; an illegal move (`pause` a non-running, `resume`/`start` a non-paused, `complete`/`next`
  a terminal) → `InvalidFocusTransition`, no write; a missing/non-focus session → `SessionMissing`. `[FACT: service.ts]`
- **BR-22 (PD-5) — real focus excludes pauses.** `pauseFocus` stamps `paused_at`; `resumeFocus` folds the span
  into `total_pause_seconds`; `completeFocus` sets `duration_seconds = run wall-time − total_pause_seconds` (≥ 0).
  `[FACT: service.ts]`
- **BR-23 (PD-6) — interruption capture.** `cancelFocus` sets `was_interrupted=true` + `interruption_reason`.
- **BR-24 (PD-4/PD-7) — cadence.** `nextInterval` advances focus→break→focus; long-break every
  `sessions_before_long` focus intervals; `completed_count` increments on each finished focus interval (incl.
  `completeFocus` on a focus interval). Config precedence template → `user_preferences.pomodoro_*` → PD-3
  defaults (IR-3). `[FACT: service.ts; preferences.ts]`
- **BR-25 (§0, intake:166,179) — run-complete ≠ session-complete in M1.1.** `completeFocus` finalizes the
  focus_sessions run only; the session stays `in_progress` and effect-firing stays S2's `completeSession` path
  (deferred handlers #46). No second firing path (IR-1). `[FACT: service.ts; intake/pomodoro.md:166,179]`

## ENFORCED now (MOD-sessions ① · S4 — availability, `services/sessions/service.ts`)
- **BR-26 (SS-9) — availability CRUD, Planner-owned.** `study_availability` + `availability_exceptions` CRUD;
  hard-delete (no `deleted_at`, syncs `operation:'delete'`). `reason` `[E]` via the M1.0 seam. `[FACT: service.ts]`
- **BR-27 (IR-5) — fail-loud range/format validation.** `day_of_week` 0..6, `preference_score` 1..5,
  `preset_block` ∈ `PRESET_BLOCK`, `start/end_time` HH:MM with `end > start`, `exception_date` YYYY-MM-DD →
  typed `InvalidSessionInput(field)` before the write (DDL CHECK is the backstop). `[FACT: service.ts; validators/session.ts]`
- **BR-28 (doc-resolved) — `is_available` orthogonal + no uniqueness.** A `false`+times window is a valid
  recurring blackout (never rejected); overlapping/multiple windows persist as-is — availability is the input
  the G5 placement algorithm (deferred) resolves, so S4 imposes no uniqueness/overlap rule. `[FACT: SS-9;
  intake:31-33; scheduling.ts no UNIQUE]`

## NOT YET enforced (deferred — do not claim)
- Per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + fire-time sensitive-consent
  enforcement + consent-threading → #46 / MOD-*. The gate utility (`assertEffectPermitted`) ships; its callers do not.
- Non-completion firing + heterogeneous-attachment (habit+task) per-effect target disambiguation → with handlers.
- SS-7/SS-9/SS-10/SS-12 (aggregator, availability, signal-emit, read-time analytics) → scheduler pass (G5).
- Session/attachment WRITE paths (`attach()`, session CRUD) + their runtime `sub_type`/`entity_type` validation →
  with those write paths. `key_learnings` encryption (M1.0 `encryptedFields:[]` pass-through seam).

## Failure behaviour (fail loud) — enforced
Registry validation failures are typed hard rejections with no partial write (BR-3/BR-4/BR-1). DB CHECK/UNIQUE
violations surface, never swallowed.
