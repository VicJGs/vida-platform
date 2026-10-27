# PLAN — sessions-rescope X1 · Effect engine semantics (BACKEND)

> §XXVI gate 1 artifact. Slice X1 of `delivery/slice-map.md` (Re-scope Gate APPROVED 2026-10-27). Yardstick:
> `delivery/interpretation.md` rev 8.4 (IR-S4 · S5 seam · S16 · S17(0) · S19) · `delivery/reconciliation.md` rows
> R-7, R-9…R-13, R-15, R-42, R-44 + the X1 parts of R-48 and the factory `providers?` dep.
> Plane: **backend** → Verification Gate. Files: `packages/core/src/foundation/sessions/**`,
> `packages/core/src/foundation/effects/**`, `packages/core/src/services/sessions/service.ts` (deps pass-through only).

## 1. Identity

X1 changes HOW a session completion fires its declared effects — and nothing about WHEN (focus behaviour is X2). After
X1 the engine (a) checks every handler exists before any write, (b) asks canTouch per effect × target with the
catalogue's target typing, (c) skips a vanished subject loudly, (d) keeps completing when one effect's handler throws,
(e) keys `log_time` / `attach_pomodoro` per run, (f) counts only ledger-applied effects, (g) exposes a payload seam and a
replay entry, and (h) builds its event inputs in ONE shared function that X3's read reuses.

## 2. Grounded scope — verdicts

| Ledger                     | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Grounding                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| R-12 preflight             | BUILD — `transition()` checks a handler exists for every NON-projection `def.effects` member before firing; missing → `NoEffectHandler`, nothing written                                                                                                                                                                                                                                                                                                                                                                                       | ADR-004:91-92 "fails closed" · IR-S17(0)                                                                                                                          |
| R-13 soft-deleted spine    | BUILD — a spine with `deleted_at` ≠ null is treated as missing → `InvalidTransition(id,'missing',event)`, nothing written                                                                                                                                                                                                                                                                                                                                                                                                                      | pomodoro BR:63-64 · IR-S17                                                                                                                                        |
| R-9 canTouch               | BUILD — `canTouch(def, effectType, target)`: effect ∈ `def.permissions.allowed_effects` (as today) AND the catalogue's target typing — `log_time` → target `entity_type ∈ {task, project}` (ADR-004:61); `attach_pomodoro` → needs a REAL attachment (the self-target fallback is denied, IR-S3). Every other effect: no type constraint (the docs fix none — not invented here). The self-fallback target is typed `session` (so a self-target `log_time` is denied). Denied → `PermissionDenied(type, effect, target)`, completion continues | contract.md:30,64 · ADR-004:61                                                                                                                                    |
| R-11/R-44 vanished subject | BUILD — with `providers?` present and a provider registered for the target's `entity_type`, the DOCUMENTED by-id path: `list({ predicates: { id } })` as a HINT + a defensive `row.id === id` match (BR-TK-S7-2/3, `docs/modules/tasks/current-business-rules.md:171-180`; a provider may ignore unknown predicates, XCU-13 / ADR-007:67-68). Missing ⇔ no returned row has `row.id === id` → `AttachmentTargetMissing(entity)`, not applied, not retried. No provider / no `providers` → existence unknown → treated as existing (fail-open)  | contract.md:65 · sessions BR:79-80 · IR-S19                                                                                                                       |
| R-10 handler failure       | BUILD — a handler throw inside `applyEffect` (its tx rolls back ledger + write) → `EffectFailed(effect, target, cause)`, logged; the remaining effects still fire; the status still commits                                                                                                                                                                                                                                                                                                                                                    | pomodoro BR:78-79 · contract:59 · IR-S4(4)                                                                                                                        |
| R-42 `fired`               | BUILD — `fired` counts only `{applied:true}` for NON-projection effects (projection returns `applied:true` at `effects/service.ts:35-36` without a row)                                                                                                                                                                                                                                                                                                                                                                                        | ADR-004:84 · `lifecycle.ts:47`                                                                                                                                    |
| R-7 keying                 | BUILD — `log_time` + `attach_pomodoro`: `subjectNaturalKey = session.id`, `transition = target.entityId`, `targetRef = target.entityId` → id `session.id ‖ target ‖ type` exactly as IR-S16 (per run AND per target — ADR-4:83: the id is an additive effect's ONLY convergence key, so two targets of one run must not share it; the `                                                                                                                                                                                                        | `invariant holds, both parts are UUIDs,`event-id.ts:15-19`). All other effects unchanged: `(target ‖ utcDate(started_at ?? created_at))`. Self-fallback unchanged | IR-S16 · TAS-17 · PD-12 · ADR-004:83,99-100 · §XXVIII #3 |
| IR-S5 seam                 | BUILD — optional `TransitionDeps.payloadFor?(session, effectType): Promise<Record<string, unknown> \| undefined>`; the fire step attaches its result as `event.payload`. X1 supplies none (payload-less as today); X2 plugs the focus resolver                                                                                                                                                                                                                                                                                                 | IR-S5                                                                                                                                                             |
| R-15 replay                | BUILD — `replayCompletionEffects(deps, sessionId)`: only for a `completed` spine (else `InvalidTransition`); re-runs the fire step with the SAME rules + payload seam; never writes status; returns `{fired, denied, missing, failed}`                                                                                                                                                                                                                                                                                                         | ADR-004 B.2 · IR-S4                                                                                                                                               |
| IR-S11 inputs              | BUILD — `buildCompletionEvents(session, def, targets)` (pure) = the ONE event-input construction (keying + canTouch verdicts), used by the fire step, replay, and X3's read                                                                                                                                                                                                                                                                                                                                                                    | IR-S11 · R-17 (X3 consumes)                                                                                                                                       |
| `providers?` dep           | BUILD — optional `providers?: ViewProviderRegistry` on `SessionsServiceDeps` + `TransitionDeps`, passed through                                                                                                                                                                                                                                                                                                                                                                                                                                | IR-S19 · impact §2 (10 construction files, SAFE)                                                                                                                  |
| R-48 (X1 part)             | FIX comments — "handlers deferred (#46)" at `foundation/sessions/CLAUDE.md:20`, `foundation/effects/CLAUDE.md:22`, `services/sessions/service.ts:30-32`, sessions-service.test 4c title `:296`                                                                                                                                                                                                                                                                                                                                                 | §XXIX                                                                                                                                                             |

**Out of X1 (later slices):** focus spine close + its payload resolver (X2) · `attach_pomodoro` handler (X2) · focus def
changes (X2) · reads (X3) · web root wiring incl. keeping the effect registry reachable (X4 — today the root creates it
inline, `composition-root.ts:99`).

## 3. Business rules (BR-X1-\*)

- **BR-X1-1 · Preflight.** A transition to `completed` first resolves a handler for every non-projection effect the def
  declares; one missing → `NoEffectHandler(type)` before ANY write (ledger, handler, status). The rail exposes this as
  `EffectRail.hasHandler(effectType): boolean` (additive).
- **BR-X1-2 · Deleted spine = missing.** `transition()` and `replayCompletionEffects()` ignore soft-deleted spines →
  `InvalidTransition(id, 'missing', event)`.
- **BR-X1-3 · Order per effect × target:** canTouch → existence → `applyEffect`. Denied / missing never reach the rail
  (no ledger row). `EffectFailed` rolls back that pair only.
- **BR-X1-4 · Completion continues.** `PermissionDenied`, `AttachmentTargetMissing`, `EffectFailed` are COLLECTED, never
  thrown; the status commits LAST (BR-S3-8 crash ordering kept). `NoEffectHandler` (wiring) and `UnknownEffectType`
  stay thrown. "Logged" (contract.md:64; pomodoro BR:79) = the TYPED RESULT is the record: core has no logging convention (zero
  `console.*` in non-test `packages/core/src`; best-effort precedents swallow silently — routines `bestEffort`
  `routines/service.ts:438-444`, tasks `fanOutCompletion` `tasks/service.ts:258-266`). The engine emits no console
  output; callers surface `denied/missing/failed`, and the EC-4 rail derives unapplied effects on read (X3/X6).
- **BR-X1-5 · Result.** `TransitionResult = { status, fired, denied: PermissionDenied[], missing: AttachmentTargetMissing[],
failed: EffectFailed[] }` — additive; all three default `[]`.
- **BR-X1-6 · `fired`** = count of non-projection `{applied:true}`. A replay of an applied set → `fired: 0`.
- **BR-X1-7 · Per-run keying** for `log_time` + `attach_pomodoro` only (IR-S16); every other effect per occurrence.
- **BR-X1-8 · Payload seam.** `payloadFor` is consulted per (session, effectType); `undefined` → no payload.
- **BR-X1-9 · Replay** re-applies only what has no ledger row (B.2); the same inputs → the same ids → the same payload.
  A still-denied / still-missing pair is re-reported and writes nothing. Determinism depends on `started_at` never being
  patched after start — built in **X2** (IR-S18(d), R-41); until X2 lands, replay is deterministic for unpatched spines.
- **BR-X1-10 · Typed errors** `PermissionDenied(sessionType, effectType, targetRef)`, `AttachmentTargetMissing(entityType,
entityId)`, `EffectFailed(effectType, targetRef, cause)` live in `foundation/sessions` and are exported by name from the
  `@vida/core` barrel (no class of these names exists in core today; gate-2 grep kept). Argument order vs the contract's
  `(type, effect, target)` · `(entity)` · `(effect, target)` is compatible (entity = `entityType + entityId`; `EffectFailed`
  adds `cause`) — recorded in sessions current-spec.

## 4. Acceptance — Verification Gate

Vitest (real SQLite store, the lifecycle/sessions harness):

1. Preflight: a def declaring an unhandled non-projection effect → `NoEffectHandler`; status, ledger, writes unchanged.
2. Preflight ignores projection: a def with only `surface_journal` completes, `fired: 0`, no ledger row.
3. Deleted spine → `InvalidTransition('missing')`, nothing written (transition + replay).
4. canTouch: `log_time` on a `habit` target → `denied[0]` `PermissionDenied`; on a `task` target → applied.
5. canTouch: `attach_pomodoro` with no attachments (self fallback) → denied, no row, not an error.
6. Existence: a soft-deleted task subject with the tasks provider registered → `missing[0]`, no row; without
   `providers` → applied (fail-open).
7. Handler throws on one of two targets → `failed[0]`, the other target applied, status `completed`, no ledger row for
   the failed pair.
8. Replay after 7 with the handler fixed → re-applies only the failed pair, `fired: 1`; replay again → `fired: 0`.
9. Keying: two `log_time`-declaring sessions completed on the same task, same UTC day → 2 ledger rows (per run);
   two `award_xp`/keyed sessions on one target, same day → 1 row (per occurrence, BR-S3-5 kept).
10. `fired` excludes projection (R-42); replay of an all-applied session → `fired: 0`.
11. Payload seam: a `payloadFor` stub's object arrives on the handler's `event.payload`.
12. `buildCompletionEvents` is pure and yields the same inputs the fire step used (ids identical).
    13a. Preflight runs per def BEFORE canTouch: an unhandled effect that would be denied for every target still throws
    `NoEffectHandler`.
    13b. Denied and missing pairs leave NO ledger row (alongside test 7's failed pair).
    13c. Replay of a still-denied / still-missing pair re-reports it, writes nothing.
    13d. A provider that IGNORES the `id` predicate (returns unrelated rows) → the subject is still detected missing.
    13e. Per-target ids: one run, two task targets → two distinct `log_time` ids.
13. Flipped tests (impact §2): lifecycle.test A2/A4/A5 re-seeded with real targets of the right type; sessions-service
    4b re-pointed (self-target `log_time` → `PermissionDenied`); 4c title corrected.
    Then: `tsc` 0 (core + web) · eslint 0 · full `@vida/core` suite · live smoke: a scratch session on a real store through
    `completeSession` with a registered handler + a deleted subject → the typed result as above.

## 5. Build steps (outline — refined into the IMPLEMENTATION-PLAN at gate 2)

1. Typed errors + `TransitionResult` shape (additive) + barrel exports.
2. `EffectRail.hasHandler` (additive) — impact: the one rail factory + its consumers.
3. `buildCompletionEvents` (pure: keying + canTouch) + its tests.
4. `transition()`: deleted filter → preflight → per pair: canTouch → existence (providers) → `applyEffect` in try/catch →
   collect → commit LAST; `fired` rule.
5. `replayCompletionEffects`.
6. `payloadFor` + `providers?` deps; `SessionsServiceDeps` pass-through.
7. Flip/extend tests; fix stale comments; currency (§8).

**Impact (reconciliation §2) — covered:** `transition()` 2 prod callers (`service.ts:449,453`) · `completeSession` prod
callers tasks:565 · flashcards:260 · books:804 · routines:864,926 — `effects: []` sub-types → behaviour unchanged (SAFE);
routines:905 completes a step's ARBITRARY registered sub-type (`routines/service.ts:893-905`, could declare `log_time`) →
still SAFE: a missing handler throws via the preflight exactly as today, and a `routine_step` target now gets
`PermissionDenied` with completion continuing (more lenient than today's throw) · `fireCompletionEffects` (lifecycle:113 + test A4) · the rail's other consumer `foundation/economy/handlers.ts:74-76`
(`applyEffect` only) unaffected by the additive `hasHandler`; no hand-written `EffectRail` fakes exist (grep) · factory
`providers?` (10 construction files, optional → SAFE).

## 6. Deviations (§XXVIII register)

- **#3** — BR-S3-5 per-occurrence keying narrowed: `log_time` + `attach_pomodoro` per run (IR-S16).
- **#8** — completion no longer aborts on a runtime handler failure (collected `EffectFailed`); BR-S3-8 crash ordering kept.
  Both recorded for Approval 1.

## 7. Risks

- Barrel name collision for `PermissionDenied` (generic name) → gate-2 grep; rename to a prefixed export if it collides.
- `console.warn` noise in suites that exercise denied/missing paths → assert, don't silence.

## 8. Currency (§XXIX, commits with the code)

`docs/core/effects/current-{spec,business-rules}.md` (hasHandler, `fired`, keying) · `docs/features/sessions-and-scheduling/
current-{spec,business-rules}.md` (BR-9 keying, BR-10 replay/self-heal + handled failure, new typed results) ·
`foundation/{sessions,effects}/CLAUDE.md`.

## 9. Change log

- 2026-10-27 — drafted (gate 1).
- 2026-10-27 — g1 /critique REVISE (3 blocking: per-run id lacked the target · no core logging convention · existence
  must use the documented `row.id === id` match) → rev 2.
- 2026-10-27 — g1 /critique rev 2: **SHIP** (routines:905 justification reworded).
