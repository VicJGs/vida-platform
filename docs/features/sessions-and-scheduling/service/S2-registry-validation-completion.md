<!-- S2 forward spec — MOD-sessions ① · slice S2. The §XXVI g1 gate object.
     Scope is doc-GIVEN, not decided. REFERENCES the aspects + S1 + interpretation.
     No-Guessing: every claim FACT / INTERPRETATION / UNKNOWN. -->

# S2 — createSession registry validation + completion wiring (forward spec · g1)

**Home:** extends `packages/core/src/services/sessions/service.ts` (the S1 factory). No new files except test
additions. Adds two deps to the factory: `rail: EffectRail` + `entityRegistry: TaggableTypeRegistry`.

**Scope is doc-given, NOT a decision (delivery-plan:239).** ① is "AR-5 shipped types only" — S2 validates
against the registry _as AR-5 shipped it_ (`focus`) plus the `register()` seam; it does **NOT** seed the other
8 shipped sub-types (owning modules register their own — SS-5 extension model, `contract.md:12`,
`identity.md:22`). No `foundation/sessions/registry.ts` roster edit. `[FACT: memory sparse-foundation-seed-is-extension-seam-not-a-gap]`

## §1 Operations (delta over S1)

- `createSession(input)` — **now also** asserts `input.sub_type` is registered (via `registry.get`) before the
  write. Unregistered → typed rejection, no write. (S1's structural validation + atomicity unchanged.)
- `attach(sessionId, entityType, entityId, level)` — **now also** asserts `entityType` is a registered
  entity-type (`entityRegistry.isRegistered`), mirroring the spaces `assertRegistered`. Unregistered →
  `UnknownEntityType`. (S1's idempotent structural attach unchanged.)
- `completeSession(id): Promise<{status, fired}>` — wraps `transition(deps, id, 'complete')` (the built #32
  engine).
- `transitionSession(id, event): Promise<{status, fired}>` — wraps `transition(deps, id, event)` for any
  declared lifecycle event.

## §2 Operation-flow & invariants

- **createSession sub_type gate (SS-3).** After `CreateSessionSchema` passes, `await registry.get(input.sub_type)`;
  a `SessionTypeNotFound` propagates as the typed rejection (fail-loud, no write). Rationale: every session must
  have a registered 4-dimension def (SS-3); an unregistered sub_type has none. The extension-mapping check
  (B1, S1) still runs. `[FACT: business-rules.md SS-3; registry.ts get() throws SessionTypeNotFound]`
- **attach entity_type gate (BR-6).** `if (!entityRegistry.isRegistered(entityType)) throw new
UnknownEntityType(entityType)` before the idempotent create. Mirrors `foundation/spaces/service.ts`
  `assertRegistered`. `[FACT: sessions.ts:74 "validated against _registry.ts"; spaces/service.ts:76-78]`
- **completion wiring — route through the existing engine (IR-1, resolves the delivery-plan:249 ⚠ boundary).**
  `completeSession`/`transitionSession` build `TransitionDeps = { db, registry, rail, deviceId }` and call the
  #32 `transition()`. NO second firing path is built (that would break BR-10 fire-first/commit-last + the R1
  single-ledger). `[FACT: lifecycle.ts transition()]`
- **The rail is FAIL-LOUD on missing handlers — this bounds what completion can do in M1.1 (B1).** On
  completion `fireCompletionEffects` calls `rail.applyEffect` per declared effect. `applyEffect`
  (`effects/service.ts:31-40`): a `projection` effect (`surface_journal`/`surface_calendar`) no-ops
  `{applied:true}` needing no handler; a `keyed`/`additive`/`intra_realm` effect with **no registered handler
  throws `NoEffectHandler` BEFORE any write**. The shipped `focus` type declares `attach_pomodoro` (intra_realm)
  - `log_time` (additive) — **neither has an M1.1 handler (deferred #46)** → `completeSession('focus')` **throws
    `NoEffectHandler`** until handlers land. So in M1.1 the wiring is real but a _shipped-effect_ completion is
    handler-gated; a type with no non-projection effects completes cleanly (`fired:0`). `[FACT: effects/service.ts:31-40;
EFFECT_CLASS_OF types.ts:24,32; SHIPPED_SESSION_TYPES focus effects registry.ts:31]`
- **`InvalidTransition`** (from lifecycle.ts) surfaces for an illegal `(status, event)` — no write (BR-8).
- **`createSession` gate adds one async `registry.get`** before the tx — shipped types resolve in-memory (`focus`
  free), user types cost one `findWhere`.
- S1 behavior (CRUD, atomicity, spine-only soft-delete, hard-detach) is unchanged.

## §3 Contract (delta)

Factory becomes `createSessionsService({ db, deviceId, registry, rail, entityRegistry })`. `registry` (injected
unused in S1) is now consumed. Error taxonomy gains: `SessionTypeNotFound` (createSession), `UnknownEntityType`
(attach), `InvalidTransition` (completion) — all existing typed errors, re-surfaced, not re-declared.
`completeSession`/`transitionSession` return the lifecycle `TransitionResult` (`{ status: SessionStatus; fired:
number }` — `fired` = count of applied effects; align the seam-contract note, which sketched `FiredEffect[]`).

## §4 Acceptance criteria (Verification Gate)

1. `createSession({sub_type:'focus', …})` succeeds (registered); `createSession({sub_type:'class', …})` →
   rejects with `SessionTypeNotFound`, **zero** rows written. (`class` is a valid enum member but unregistered
   in the AR-5-shipped roster — proves the extension-model gate.)
2. A **user-registered** no-extension type (`registry.register(def)` with a fresh `sub_type`) → `createSession`
   with it succeeds spine-only (re-points the S1 `class` spine-only test onto a registered type).
3. `attach` with a registered `entityType` (`'task'`) succeeds; with an unregistered one → `UnknownEntityType`,
   no row.
4. **Completion wiring (grounded in the fail-loud rail, B1):**
   - **4a — clean completion:** a user-registered type with `effects:[]`, created `in_progress`, completes →
     status `completed`, `ended_at` stamped, `fired:0`. Re-issue `complete` → `InvalidTransition` (BR-8, not
     idempotent).
   - **4b — fire + dedupe:** register a STUB handler on the rail for one effect; a session of a type declaring
     that effect completes → `fired:1` + one `applied_effects` row; a direct `fireCompletionEffects` replay →
     `applied:false` (R1 dedupe).
   - **4c — honest deferred boundary:** `completeSession` on a `focus` session with NO handlers → throws
     `NoEffectHandler` (proves the #46 gate is fail-loud, not silently swallowed).
5. `transitionSession(id,'start')` on a `scheduled` session → `in_progress`, `started_at` stamped.
6. Live-store smoke on an unlocked vault (N1); `tsc` clean; full `@vida/core` suite green (S1 tests updated for
   the new factory deps + the validation gate).

## §5 Implementation prompt (order)

1. Extend `SessionsServiceDeps` — add `rail: EffectRail`, `entityRegistry: TaggableTypeRegistry`.
2. `createSession` — insert the `await registry.get(input.sub_type)` gate before the tx (after structural + B1 checks).
3. `attach` — add the `entityRegistry.isRegistered` gate (import `UnknownEntityType` from `foundation/spaces`).
4. Add `completeSession`/`transitionSession` — assemble `TransitionDeps`, call `transition` (import from
   `foundation/sessions/lifecycle`). Re-export `InvalidTransition`.
5. Update `types.ts` — export the completion return type; note the taxonomy additions.
6. `__tests__/sessions-service.test.ts` — inject `rail` (a `createEffectRail(db, createEffectRegistry())`) +
   `entityRegistry` (`createTaggableTypeRegistry()`) in `setup`; re-point the `class` spine-only test onto a
   user-registered no-extension type; add AC1/AC3/AC4/AC5 cases.

## §6 Out of scope (homed) + a flag for S3

Per-module effect **handlers** + fire-time consent → #46 · roster seeding of the other 8 shipped types → their
owning modules (SS-5) · focus timer mechanics → S3 · availability/plan/templates/dueIn → S4–S7 · richer
per-type lifecycle (miss/skip/reschedule) → owning modules / later.

**⚠ Flag for S3 (focus runtime):** because the rail is fail-loud (B1), `completeFocus` → completeSession on a
`focus` session will throw `NoEffectHandler` in M1.1 (its `log_time`/`attach_pomodoro` handlers are deferred
#46). S3 must decide M1.1 focus-completion behavior — e.g. register no-op stub handlers for `focus`'s effects,
complete without routing through the effect fire, or narrow `focus`'s declared effects. NOT resolved here (S2
builds the plumbing + proves it fail-loud); S3 owns the focus-completion UX decision.
