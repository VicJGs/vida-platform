# Service Spec — XS-notifications-delivery (#46, LIF-174)  ·  Entity Delivery Flow service track

> The service/ spec set (operations · operation-flow · invariants · contract · composition) for the
> `foundation/notifications` delivery engine. Contract = `../delivery/seam-contract.md`; composition = the
> interpretation ORGANIZATION section. Every rule is `[FACT: path:line]` or grounded `[INTERPRETATION]`.
> Pattern: **factory-of-closures** (no `this`; `createEgressGuard`/`createCapabilityEnforcer` precedent) (IR-7).

## Files (mirrors every `foundation/<svc>/`)
- `foundation/notifications/types.ts` — tiers, channels, `DeliveryDecision`, `WakePayload`, `RoutingMeta`,
  `NotificationPorts`, `DeliveryMode`, errors (`PayloadNotContentFree`, `DeliverySuppressed`).
- `foundation/notifications/tiers.ts` — `selectTier`, `channelsFor` (S1, pure).
- `foundation/notifications/payload.ts` — `buildWakePayload` (S1, pure, content-zero assertion).
- `foundation/notifications/scheduling.ts` — `bakeQuietHours`, `reschedulePlan`, `dedupKey`, `shouldMaterialize` (S2, pure).
- `foundation/notifications/ports.ts` — deny-safe default ports (S3).
- `foundation/notifications/service.ts` — `createNotificationDeliveryEngine(ports?)` (S3; no enforcer/egress — DEL-3).
- `foundation/notifications/index.ts` — barrel (mirrors `egress/index.ts`).
- `foundation/notifications/__tests__/*.test.ts` — Vitest (pure S1/S2 + live-store S3).
- `foundation/notifications/CLAUDE.md` — refresh the existing substrate note (D6).
- Re-export from `packages/core/src/index.ts`.

## Resolved pre-flight assumptions (PF)
- **PF-1** — `createNotificationDeliveryEngine(ports?: NotificationPorts)`. **No enforcer, no egressGuard** — the
  engine executes an already-gated decision; gating is the dispatcher's (NF-5) and this XS has zero build deps
  (`decomposition.md:47`). (gate-1 correction — the xs-ai "don't copy a sibling's params" lesson applied harder:
  the whole delegation was mis-fit, not just one param. `[FACT: xs-ai.md pre-ship critique; egress/types.ts:36-41]`)
- **PF-2** — pure functions (S1/S2) are free module-level exports; the effectful engine (S3) is the factory (IR-7, no `this`).
- **PF-3** — the engine performs **no permission/egress check**. Off-device *transmit* governance (the server
  wake-relay's own egress) is a Hono-server / M2 concern, out of this client engine (IR-2). `[FACT: NF-5; ADR-013 §3.6 L72-74]`
- **PF-4** — timestamps = `Date.now()` (Unix ms) in service code.
- **PF-5** — all slices are pure/in-memory at M1 (no DB, no schema); **no live-store harness needed**. Vitest under
  **Node 24** (repo default). The M2 seam is the ports, tested with spy/deny-safe port doubles.

## Invariants
- **DEL-1 (content-zero).** `buildWakePayload` refuses any `[E]` content / `type` / entity ref → `PayloadNotContentFree`;
  the server payload carries only ADR-003 routing metadata. `[FACT: XCU-08/16; ADR-013 §3.5 L61-65]` (IR-3)
- **DEL-2 (three channels, no SMS).** `channelsFor` never returns `'sms'`; the matrix is {in_app, push, email}. `[FACT: XCU-12; ADR-013 §3.4 L59]` (IR-8)
- **DEL-3 (no permission gate in the engine).** the engine receives an already-gated decision (dispatcher did the
  channel/permission/quiet-hours gate, NF-5) and does NOT call the egress guard or enforcer; off-device transmit
  governance of the server relay is a Hono-server/M2 concern. `[FACT: NF-5; ADR-013 §3.6 L74]` (IR-2)
- **DEL-4 (fail-loud, in-app fallback).** a not-delivered port result (incl. the M1 deny-safe default) → record in-app +
  flag; never a silently dropped alert; a wake-signal no-op is benign. `[FACT: XCU-15; NF-7; business-rules:85,88]` (IR-4)
- **DEL-5 (in-app unconditional).** in-app is never gated away; it is baseline + fallback. `[FACT: XCU-02; NF-7:36-38]` (IR-5)
- **DEL-6 (quiet-hours baked at registration).** `scheduleLocal` applies `bakeQuietHours` before the OS-scheduler port;
  a pref change → `reschedulePlan`. `[FACT: XCU-05; ADR-013 §3.2 L51]` (IR-1)
- **DEL-7 (idempotent once across devices).** `dedupKey` is deterministic per `dueIn` occurrence / ADR-012 id. `[FACT: XCU-14; NF-8:41-42]`
- **DEL-8 (opt-out posture).** `mode='no_third_party'` restricts the tier set to {in_app, local_scheduled} — no
  wake-relay, no email, no server. `[FACT: XCU-17; ADR-013 §3.5 L67]`
- **DEL-9 (content-blind engine + deny-safe M1).** no port makes a network call at M1; the engine decides when/whom,
  never what; M2 swaps real reach with no signature change. `[FACT: ADR-013 §3.6 L72; memory deny-safe-port-build-shape]` (IR-6/IR-7)
- **DEL-10 (no schema).** M1 authors zero DDL; delivery-audit + push-token columns are ADR-002 §5.20 / M2. `[FACT: xcut-notifications.md:52-53; ADR-013 §5]`

## Operation-flow — `deliver(decision)` (the core executor)
1. **channel resolve** — `channelsFor(decision.tier, mode)`; in-app always included (DEL-5).
2. **in-app leg** — always compose/record locally (the caller-supplied decrypted row); this succeeds first (NF-9).
3. **per external channel (push/email) in the decision** (opt-out mode already excluded them, DEL-8):
   a. `buildWakePayload(routing)` for push (DEL-1, content-zero); email → generic nudge (no payload content).
   b. call the port (`wakeRelay.push` / `email.sendNudge`); M1 deny-safe → `{delivered:false}`, no network call.
   c. `!delivered` → in-app fallback + flag (DEL-4).
4. return `DeliveryResult { inApp: true, channels: [...], fallbacks: [...] }`.

## Operation-flow — `scheduleLocal(occurrence, quietHours)`
1. `bakeQuietHours` → `suppress` (record in-app only) | `shift`(at) | `schedule`(at) (DEL-6).
2. `osScheduler.register(...)`; M1 deny-safe → `{scheduled:false}` (decision still returned).
3. store nothing (no schema, DEL-10); the caller/M2 persists.

## Composition
- **No composed services** — zero build deps (`decomposition.md:47`). Gating is upstream (MOD-notifications dispatcher,
  NF-5); the engine holds no enforcer/egress (DEL-3, PF-1/PF-3).
- **effect-rail #32 / ADR-012** (not a build dep) — the caller supplies the `effect_event_id`; `dedupKey` passes it
  through for event notifications (DEL-7, N3).
- **ports** — OS scheduler / wake-relay / email = M1 deny-safe, M2 real (DEL-9). Server wake-relay = Hono/M2.
- **first-consumer** — MOD-notifications #53 dispatcher + MOD-sessions `dueIn`.

## §4 Acceptance (per-slice Verification Gate)
- S1: tier matrix + no-SMS + content-zero refusal — pure Vitest. tsc 0, eslint 0.
- S2: quiet-hours shift/suppress + reschedule + stable dedup + materialize — pure Vitest.
- S3: **functional Vitest (pure — no live-store; no DB/schema at M1)** — opt-out mode never hits an off-device port;
  a deny-safe default port → not-delivered → in-app fallback (loud); a spy port receives the correct tier/channel/payload;
  content-zero payload enforced at dispatch. tsc 0, eslint 0.
- Full `@vida/core` suite green (+N); D6 currency `docs/core/notifications-delivery/current-*` born; /critique SHIP.
