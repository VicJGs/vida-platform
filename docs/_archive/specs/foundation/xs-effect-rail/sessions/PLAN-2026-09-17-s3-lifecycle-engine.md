# PLAN — S3 Lifecycle engine + fire step (XS-effect-rail #32 · XCU-09)

> §XXVI gate-1 SPEC for slice S3 (composes S1 + S2). Home: `packages/core/src/foundation/sessions/lifecycle.ts`.
> Plane: backend. No-Guessing: every claim `[FACT: path:line]` / `[INTERPRETATION]`. Firing semantics are
> DOC-GROUNDED (SS-10, contract.md, ADR-004 §3.2.3/§3.2.5) — not the thin `lifecycle.hooks` placeholder.

## §1 — Context

AR-5 shipped the session _contracts_ (transitions declared, effects declared, permission envelope) but no
runtime; #32's rail + S1 (targets) + S2 (gate) are the pieces. S3 is the **lifecycle state machine** that, on a
legal transition, applies the status and — on **completion** — fires the type's declared effects, scoped +
gated, through the AR-7 rail. `[FACT: sessions/registry.ts:8 (engine deferred); slice-map S3]`.

## §2 — Business rules (doc-grounded)

- **BR-S3-1 — Legal-transition machine.** `transition(sessionId, event)` loads the session + its `SessionTypeDef`,
  finds the declared `SessionTransition` matching `(current status, event)`; none → `InvalidTransition` (typed,
  **no write**). `[FACT: sessions/types.ts:18-22; contract.md:65; business-rules.md:84]`.
- **BR-S3-2 — Effects fire ON COMPLETION only.** The declared `effects[]` fire on the transition **into
  `completed`**; `skipped`/`missed`/`rescheduled`/`in_progress` are state-change-only (no fire). `[FACT:
business-rules.md:54 (SS-10 "On completion the engine emits an event"); ADR-004 §3.2.3 examples all completion]`.
- **BR-S3-3 — Fire = per (effect × resolved target); structural scope only; consent is HANDLER-side.** For each
  declared effect, resolve targets (S1); for each target, `rail.applyEffect`. Projection effects are rail no-ops
  (IR-6). The engine's guardrail is the STRUCTURAL `canTouch` — effect ∈ `allowed_effects` (enforced at
  registration) + target ∈ attachments (holds by construction: only declared effects fire, only at resolved
  attachments). `[FACT: contract.md:30 (canTouch before every effect); sessions/registry.ts:89-100; attachments.ts]`.
  > **The engine does NOT invoke the sensitive-consent gate (§XXVIII correction, doc-forced).** ADR-004
  > §3.2.5-A(3):93-94 + BR-17 (`current-business-rules.md:49-51`) put sensitive-consent enforcement in the
  > **handler** ("the consuming sensitive module MUST guard its reads with the `sensitive` action"); IR-5
  > (`capability/types.ts:101-103`) forbids the engine inferring `moduleClass`, and no effect→moduleClass map
  > exists. So S2's `assertEffectPermitted` is the **handler-side seam** the deferred handlers (#46 / MOD-finance
  > /health) invoke — like the rail's empty registry. `[FACT: ADR-004 §3.2.5-A(3):93-94; current-business-rules.md:49-51; capability/types.ts:101-103]`.
  > **Target-TYPE appropriateness** is likewise handler-validated — a mismatched target no-ops loudly
  > (`AttachmentTargetMissing`, `[FACT: contract.md:63]`); heterogeneous-attachment disambiguation rides with
  > handlers (#46). #32 tests the single-attachment common case + the no-attachment fallback.
  > **Consent-threading** (how the caller's consent context reaches a handler — possibly an `EffectEvent`
  > extension) is a **#46 concern**: #32 fires the current-shape `EffectEvent`; nothing consumes consent context yet.
- **BR-S3-5 — Deterministic no-double-count key (SS-6).** The `EffectEvent` per (effect, target) is built as:
  `subjectNaturalKey = target.entityId`, `transition = <occurrence discriminator>`, `effectType`, `targetRef =
target.entityId`. Two sessions completing the same target on the same occurrence → same `effect_event_id` → the
  ledger dedupes (SS-6 no-double-count). `[FACT: ADR-004 §3.2.5-B1 example derive(habit_id ‖ date ‖ effect);
business-rules.md:32-38 (SS-6)]`.
  > **The discriminator MUST be a stable session date (Blocker-1 fix).** NOT `ended_at` (written by THIS
  > transition — unset at fire time, since BR-S3-8 fires first) and NOT `Date.now()` (a wall-clock date differs on
  > a later-day cross-device replay → different id → the double-count the deterministic key exists to prevent). Use
  > **`started_at`'s date** (`YYYY-MM-DD`, set at `in_progress`, available + stable at completion), falling back to
  > `created_at`'s date if `started_at` is null. `[FACT: sessions.ts:33 started_at set at in_progress; ADR-004
§3.2.5-B1 determinism]`.
- **BR-S3-6 — No-attachment fallback = the session is the subject.** A completion with zero resolved targets fires
  each declared effect once with `subjectNaturalKey = sessionId`, `transition = 'completed'`, `targetRef =
sessionId`. `[INTERPRETATION from contract.md:19-20 (instance-level optional) + BR-S3-5]`.
- **BR-S3-7 — (removed §XXVIII).** Was "uniform gate, type's own consent" — moot now the engine does not call the
  gate (BR-S3-3). The `sensitive_optins` consented set is what a future handler reads; #32's engine passes no
  consent to any gate. S2's dissolved `is_user_type` prereq stays dissolved (no bypass branch anywhere).
- **BR-S3-8 — Fire-first, commit-status-last.** Fire the effects, THEN write the new `status` (+ `ended_at`).
  The status write is the commit point; a mid-fire crash self-heals on replay (re-run from the unchanged
  from-state, ledger dedupes). `[FACT: ADR-004 §3.2.5-B.4:113 (ledger defends replay); effects/service.ts:44]`.
- **BR-S3-9 — Re-ack boundary.** `transition` is NOT target-state idempotent: re-issuing an already-applied event
  (status already advanced) → `InvalidTransition` (the transition did happen). The caller owns request dedup. This
  is acceptable v1; documented not silent. `[INTERPRETATION from BR-S3-1 + business-rules.md:84]`.

## §3 — Contract

```ts
export class InvalidTransition extends Error {
  /* sessionId, fromStatus, event */
}

export interface TransitionDeps {
  registry: SessionRegistry // resolves the type def (effects, permissions, transitions)
  rail: EffectRail // applyEffect
  db: DrizzleDb
  deviceId: string
}
export interface TransitionResult {
  status: SessionStatus // the new status
  fired: number // effects that applied ({applied:true})
}
export function transition(deps: TransitionDeps, sessionId: string, event: string): Promise<TransitionResult>
```

- Reads the session row (`db.select`), resolves its type via `registry.get(sub_type)`, validates the move,
  resolves targets via `resolveTargets` (S1), fires each declared effect × target via `rail.applyEffect`, writes
  status via `Repository.update` (co-transactional sync enqueue). `ended_at` set on the completion write.
- No gate call — the engine fires structurally-scoped effects (BR-S3-3); consent enforcement is handler-side.
- **Handler-absent path:** a declared effect with no registered handler → `rail.applyEffect` throws
  `NoEffectHandler` (BR-3 fail-closed). For #32 (handlers deferred) the tests register a stub handler; a genuine
  `NoEffectHandler` in production is a wiring bug (fail-loud, propagates).

## §4 — Acceptance (live-store Verification Gate, better-sqlite3)

- A1: `scheduled → in_progress` (event `start`) commits status, fires nothing (BR-S3-2).
- A2: `in_progress → completed` (event `complete`) fires the type's declared effects via a stub handler; ledger
  rows present; status `completed` + `ended_at` set.
- A3: illegal `(status, event)` → `InvalidTransition`, status unchanged, 0 effects (BR-S3-1).
- A4: **replay** — the fire path run twice → effects dedupe (`{applied:false}`), no double-count (BR-S3-5). Since
  a 2nd `transition()` hits BR-S3-9, the fire step is **exported separately** (`fireCompletionEffects`) so the
  replay is directly testable; the ledger's stable-date key (Blocker-1 fix) makes the 2nd run a no-op.
- A5: completion with attachments → effects scoped to the resolved targets (BR-S3-3); with none → session-subject
  fallback (BR-S3-6). (Was A6; former A5 gate-denial removed — enforcement is handler-side, not engine-testable.)
- A6: `tsc` 0 · full @vida/core suite green · eslint clean.

## §5 — Implementation prompt (gate-2 fills the IMPLEMENTATION-PLAN)

1. `lifecycle.ts` — `InvalidTransition`, `TransitionDeps`/`TransitionResult`, `transition()` + an exported
   `fireCompletionEffects(deps, session, def)` (the fire step, exported for A4 replay testability):
   `transition()` loads session → resolves def → matches transition (else throw) → if `to==='completed'`: call
   `fireCompletionEffects` → write status (+ `ended_at`) LAST. `fireCompletionEffects` resolves targets, builds
   EffectEvents with the **stable `started_at` date** discriminator (BR-S3-5) + session-subject fallback
   (BR-S3-6), and per effect×target calls `applyEffect` (tally `fired`). No gate call (BR-S3-3).
2. Export from `foundation/sessions/index.ts`.
3. `__tests__/lifecycle.test.ts` — A1–A5 on a live store; register a stub handler for the shipped `focus` type's
   effects (`attach_pomodoro`, `log_time`) so completion can fire.
4. `tsc`, lint, run suite.

## Boundary

S3 does NOT build per-module handlers (review→SM-2 etc. — #46/MOD-\*), the scheduler/`planned_blocks`, non-completion
firing, or the `derive()` hash. The domain-correct occurrence key per exotic effect is refined when real handlers
land (#46); #32 sets the SS-6-correct generic construction (entity_id ‖ date) + tests the mechanism with a stub.
