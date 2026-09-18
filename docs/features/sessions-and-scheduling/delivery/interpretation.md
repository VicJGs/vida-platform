<!-- Interpretation Layer — features/sessions-and-scheduling · MOD-sessions ① (LIF-139) · Entity Delivery Flow §3.
     Makes the implicit explicit before decomposition. Every claim FACT / INTERPRETATION / UNKNOWN.
     Sources: the 5 aspect docs + current-* + pomodoro/* sub-docs + m1.1-delivery-plan.md §MOD-sessions + built code. -->

# Interpretation — Sessions & Scheduling · MOD-sessions ① (backend service)

**Scope of this issue (① backend only).** Create `packages/core/src/services/sessions` (NEW) — the service
tier over the AR-5 `foundation/sessions` spine + the DB-4 schema substrate. The ② UI (session/planner hub,
`/pomodoro` widget-lens) is the separate `fe-sessions` issue. `[FACT: m1.1-delivery-plan.md:238-249]`

**Decomposition mode: RATIFY + detail** (EDF §8). The ① service surface + the homed deferrals are already
doc-fixed by `m1.1-delivery-plan.md:238-249`; Step 2 records/validates that split and adds what's open (the
seam contract + the per-slice Verification-Gate ledger). It does not fork against the fixed structure.

**Envision Gate (§3.75): N/A.** This is a pure-backend entity — it renders no surface a user forms a mental
model of. The one-question test ("a user affordance whose UI answer isn't obvious?") is answered by
`fe-sessions`, not here. Stated, not silently skipped. `[FACT: default.md Step 1.5; EDF §3.75]`

---

## DEPENDENCIES (every upstream — cited)

| # | Dependency | What ① uses from it | Cite |
|---|------------|---------------------|------|
| D1 | AR-5 `foundation/sessions/{types,registry}.ts` | `SessionRegistry` (`register`/`get`/`list`), `SessionTypeDef`, `CapabilityEnvelope`, 4 typed errors; shipped `focus` type seeded | `[FACT: current-spec.md:25-28]` |
| D2 | #32 `foundation/sessions/{lifecycle,attachments}.ts` | `transition(deps, sessionId, event)` (state machine + fire-on-complete), `resolveTargets(db, sessionId)`, `fireCompletionEffects` — **already built** | `[FACT: current-spec.md:35-45]` |
| D3 | #32 `foundation/effects/{service,gate}.ts` | `applyEffect` (replay-safe fan-out over `applied_effects`), `assertEffectPermitted` seam (handler-side consent) | `[FACT: current-business-rules.md:30-45]` |
| D4 | DB-4 schema `db/schema/foundation/{sessions,session-extensions,scheduling}.ts` | tables: `sessions`, `session_attachments`, `session_type_registry`, `focus_sessions`, `study_sessions`, `planned_blocks`, `study_availability`, `availability_exceptions`, `study_plan_batches`, `session_templates` | `[FACT: session-extensions.ts, scheduling.ts]` |
| D5 | db-6 `db/repository.ts` `Repository` | table-agnostic encrypt-on-write / decrypt-on-read CRUD + **co-transactional `sync_queue` enqueue** + UUIDv7 PK gen (BR-DB-1) | `[FACT: db/CLAUDE.md]` |
| D6 | `@vida/types` enums + `validators/session.ts` | `SESSION_SUB_TYPE`, `SESSION_PURPOSE`, `SCHEDULING_MODE`, `SESSION_STATUS`, `EFFECT_TYPE`, `POMODORO_TYPE`, `POMODORO_STATUS`, `STUDY_SESSION_RESOURCE_TYPE`, `PLANNED_BLOCK_STATUS`, `STUDY_PLAN_BATCH_STATUS`, `PRESET_BLOCK` + Zod schemas | `[FACT: session.ts, knowledge.ts, learning.ts, validators/session.ts]` |
| D7 | AR-6 `foundation/spaces/service.ts` | **the pattern to mirror** — the one built service-over-a-spine analog (`createXService` factory) | `[FACT: foundation/spaces/service.ts exists; all services/* are empty scaffolds]` |
| D8 | Preferences `user_preferences.pomodoro_*` | interval config the focus runtime OBEYS (`pomodoro_work_minutes`/`_break_minutes`/`_long_break_minutes`/`_sessions_before_long`) — PD-3 | `[FACT: pomodoro/business-rules.md:22-25; ADR-002 L3497-3500]` **⚠ mod-preferences is a peer READY head, likely NOT built — see NEEDS N4** |

## NEEDS (preconditions to function — the implicit half)

- **N1 — Vault initialized before ANY write.** Every `Repository` write computes a keyless content-hash that
  needs libsodium loaded; a write on a locked vault throws `Vault not initialized` even for a zero-`[E]` table.
  This is the exact bug class the interpretation layer exists to catch. All ① write paths (session CRUD,
  `attach()`, focus runtime, availability, templates) inherit it → the Verification Gate's **live-store smoke on
  an unlocked vault** is mandatory, not optional. `[FACT: EDF §3 teeth example (MOD-notes); memory [[m10-repos-use-empty-encryptedfields-seam]]]`
- **N2 — DatabaseAdapter open + migrations `010`+`014` applied** before touching any scheduler/extension table.
  `[FACT: runner.ts ALL_MIGRATIONS registers 010,014]`
- **N3 — `deviceId` injected** (HLC tie-break / `_sync_device_id` stamping) into the service factory — the
  registry factory already takes it (`createSessionRegistry(db, deviceId)`). `[FACT: current-spec.md:28]`
- **N4 — Shipped `focus` `SessionTypeDef` must be registered** before `startFocus`/`createSession('focus')`
  can run (they read the def for effects/lifecycle/permissions). The registry seeds `focus` in-memory (SS-4),
  so this holds without a mod-preferences dependency. **Interval config (D8) fallback:** if
  `services/preferences` is not built, the focus runtime needs a config source. `[UNKNOWN → decision at
  Decomposition Gate]` — the two candidates: (a) read `user_preferences` rows directly via `Repository`
  (Preferences owns the table, the schema exists from DB-4 even if its service doesn't); (b) accept an injected
  config with the PD-3 defaults as fallback. Recommendation: **(a)** — the table is the contract, not the service.
- **N5 — `dueIn()` provider seam tolerates absent providers.** Books/Flashcards/Knowledge/Education/Language
  are not built; per SS-7 a missing provider lane degrades to empty (`ProviderUnavailable`), never a throw.
  ① ships the aggregator + an **empty provider registry** (the seam), not the providers. `[FACT: contract.md:33,61; business-rules.md:42-45]`

## ORGANIZATION (owns / consumes / delegates)

**OWNS (① builds the write + read paths):**
- Session CRUD over `sessions` + the 1:1 extension write (`study_sessions`/`focus_sessions`) via `session_id`.
- `attach()` write path over `session_attachments` (polymorphic; AR-5 shipped types only — `[FACT: delivery-plan:239]`).
- `createSession(block?)` with **runtime `sub_type`/`entity_type` registry validation** (the binding deferred
  by AR-5, now due — `[FACT: current-business-rules.md:52]`).
- The **Pomodoro focus runtime** — `startFocus`/`pause`/`resume`/`complete`/`cancel`/`nextInterval` over
  `focus_sessions` (PD-4…PD-7 pause/interruption/cadence). Lives IN `services/sessions`, not a separate service.
- **Availability** — `setAvailability`/`addException` over `study_availability` + `availability_exceptions`.
- **Plan batch lifecycle ENDPOINTS** — `approve`/`activate`/`recalc` over `study_plan_batches` (the state
  machine draft→pending_approval→approved→active→completed→failed), NOT the placement algorithm.
- `session_templates` CRUD (focus presets).
- **`dueIn(range)`** aggregator primitive + session analytics (derived-on-read, SS-12 — no stored aggregates).

**CONSUMES (live-read / config, never mirror):**
- `dueIn` providers — live-read, empty-seam fallback (N5).
- Preferences `pomodoro_*` config (D8/N4) — read the table.

**DELEGATES (does NOT build here):**
- Effect FIRING → the #32 rail (`transition` → `fireCompletionEffects` → `applyEffect`). ① **wires** completion
  to it; it does not re-implement firing.
- Effect HANDLERS (review→SM-2, class→attendance, workout→volume) + fire-time consent → #46 / MOD-* (deferred).
- `generatePlan()` placement ALGORITHM (urgency/conflict, recalc-on-miss, G5) → M1.2 study-planner design-pass.
- Domain mastery/pace measurement → Knowledge (KN-10) / Education (SS-10). ① emits session signals only.
- Global Calendar render → M2. `/pomodoro` widget + Focus Mode UI → `fe-sessions` / design-pass.

## IMPLICIT RULES (hidden invariants surfaced)

- **IR-1 — Completion routes through the existing `transition()`, resolving the delivery-plan:249 ⚠ boundary.**
  #32 already built the completion state machine + fire step. So ①'s "complete a session" is `transition(deps,
  id, 'complete')`, not a new completion path. Effects fire into `applyEffect`/`applied_effects` NOW (the
  ledger dedupes); per-module handlers stay deferred (#46). Building a second completion/firing path would
  violate BR-10 (fire-first, commit-last) and the R1 single-ledger guarantee. `[INTERPRETATION from
  current-spec.md:39-45 + delivery-plan:247-249]`
- **IR-2 — `dueIn()` is a shared PLATFORM primitive, not a sessions-internal helper.** Journals consumes
  `dueIn(today)`, the future Calendar consumes the full range → its `DueItem` shape must be general + stable,
  and it belongs at a shared surface, not buried in a session-list method. `[FACT: delivery-plan:241; contract.md:33]`
- **IR-3 — Two config sources for the focus runtime, non-conflicting.** `user_preferences.pomodoro_*` = global
  interval defaults (Preferences-owned, PD-3); `session_templates` = named per-preset overrides (Sessions-owned,
  PD-3). The runtime obeys the template if one is chosen, else the global prefs, else PD-3 hard defaults. Config
  changed mid-run applies to the NEXT interval, never retro-edits the running one. `[FACT: pomodoro/business-rules.md:22-25,66]`
- **IR-4 — Real focus = elapsed − paused; a cut-short run captures its interruption.** `focus_sessions`
  carries `total_pause_seconds` + `was_interrupted`/`interruption_reason`; the runtime must maintain them, not
  just flip `status` (the v2 bug PD-5/PD-6 restore fixes). `[FACT: session-extensions.ts:44-48; pomodoro/business-rules.md:33-36]`
- **IR-5 — Validation is fail-loud + typed, never a silent store.** `ended_at < started_at`, negative/overrun
  `duration_seconds`, resume on a `completed`/`cancelled` interval, illegal lifecycle move → typed error, no
  write. Registry-validation of `sub_type`/`entity_type` on the write path is a hard rejection. `[FACT:
  business-rules.md:75-76; pomodoro/business-rules.md:60-64; contract.md:60-65]`
- **IR-6 — No stored analytics.** Completion rate / avg focus / planned-vs-actual / streaks are computed
  on-read from the session log (SS-12/PD-11). ① exposes derived getters; it never writes an aggregate table.
  `[FACT: business-rules.md:67-69; pomodoro/business-rules.md:51-53]`
- **IR-7 — `session_attachments` has no `deleted_at`; `resolveTargets` skips the soft-delete filter.** A
  `findWhere` over attachments returns all rows by construction. `[FACT: current-spec.md:38; memory
  [[repository-findwhere-skips-softdelete-filter]] + [[session-extensions-carry-no-deleted-at]]]`
- **IR-8 — Factory-object service, no `this.` for intra-calls.** `createSessionsService(...)` returns an object
  literal; intra-service calls hoist to closures (the ② consumption shape destructures). Validating methods are
  async (rejection, not sync throw). `[FACT: memory [[factory-service-no-this-for-intra-calls]]; mirror foundation/spaces/service.ts]`

---

## Open decisions for the Decomposition Gate (surfaced, not guessed)
1. **N4 — focus interval config source** when `services/preferences` is unbuilt → recommend (a) read
   `user_preferences` via `Repository`.
2. **Slice count/order** — the ① surface is ~7 capability groups (see slice-map). Confirm the slice boundaries +
   the order (dependency: session CRUD + attach must precede focus runtime + createSession).
3. **`dueIn()` home** (IR-2) — a shared surface (e.g. `services/sessions/due.ts` exported for Journals) vs a
   later platform-primitive extraction. Recommend: build in `services/sessions` now with a general `DueItem`
   shape + empty provider registry; Journals imports it.
