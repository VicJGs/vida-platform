<!-- Current Business Rules — notifications-delivery (foundation/notifications) · born XS-notifications-delivery #46 (LIF-174) · ADR-013 · 2026-09-21 -->

# Current Business Rules — Notification Delivery (the ZK delivery engine)

> The delivery MECHANISM (ADR-013): how a notification reaches the user off-device without the server reading it.
> NOT the records/dispatch/gating (MOD-notifications) nor *what/when* due (MOD-notifications + Sessions `dueIn`).
> M1 = pure decision/routing tier + deny-safe ports + NO schema; M2 = real reach + schema. Inherits ZK-1/2/3, LF-1/2.

## Invariants (BR-ND)
- **BR-ND-1 (three tiers by nature × platform).** `selectTier(nature, platform)`: time-based on native → `local_scheduled`;
  time-based on web OR any event → `wake_signal`. In-app underlies all three, always. `[FACT: ADR-013 §3.1 L41-47; tiers.ts]`
- **BR-ND-2 (channel matrix, no SMS).** `channelsFor`: only `wake_signal` reaches off-device (push wake-only + email
  generic); `local_scheduled`/in-app compose locally (in-app only). SMS is a removed vocabulary, never a member. `[FACT: ADR-013 §3.4 L59; NF-6]`
- **BR-ND-3 (content-zero payload).** `buildWakePayload` carries owner routing metadata only; it RUNTIME-refuses any
  content/type/entity key (`PayloadNotContentFree`), never a silent strip. `[FACT: ADR-013 §3.5 L61-65; payload.ts]`
- **BR-ND-4 (quiet-hours baked at registration).** `bakeQuietHours` pre-applies quiet hours (shift/suppress per the
  user's policy) BEFORE the OS scheduler — a pre-scheduled alert fires with the dispatcher not running. `[FACT: ADR-013 §3.2 L51]`
- **BR-ND-5 (reschedule = cancel + re-register).** `reschedulePlan` diffs by dedup key: cancel dropped, register new,
  leave unchanged untouched. `[FACT: ADR-013 §3.2 L49]`
- **BR-ND-6 (idempotent, once across devices).** `dedupKey`: event = the ADR-012 `effect_event_id` passed THROUGH
  (not re-hashed); due = the `dueIn` occurrence id; namespaced. `[FACT: NF-8; ADR-012 §3.1]`
- **BR-ND-7 (materialize at fire).** `shouldMaterialize(at, now)` = `at ≤ now`; a durable row is never pre-written
  future-dated. `[FACT: NF-3 business-rules:20-23]`
- **BR-ND-8 (fail-loud, in-app fallback).** Any external port returning not-delivered (incl. the M1 deny-safe default)
  → folded to in-app + flagged; never a silently dropped alert. In-app is the unconditional baseline. `[FACT: XCU-15; NF-7]`
- **BR-ND-9 (no-third-party opt-out).** `setDeliveryMode('no_third_party')` → the engine NEVER invokes an off-device
  port (no APNs/FCM, no email, no relay), even if the decision lists those channels. `[FACT: ADR-013 §3.5 L67]`
- **BR-ND-10 (gating is upstream).** The engine executes an ALREADY-GATED `DeliveryDecision`; it holds no capability
  enforcer / egress guard and runs no permission check — channel/permission/quiet-hours gating is the dispatcher's (NF-5),
  and off-device transmit governance of the server relay is a Hono-server/M2 concern. `[FACT: NF-5; ADR-013 §3.6 L74]`
- **BR-ND-11 (content-blind, deny-safe, no schema at M1).** No port makes a network call at M1; the engine decides
  when/whom, never what; authors zero DDL (delivery-audit + push-token columns are ADR-002 §5.20 / M2). M2 swaps real
  reach with NO signature change. `[FACT: ADR-013 §3.6 L72, §5 L111-115]`

## Boundary
OWNS: three-tier contract · content-minimal payload spec · per-channel ZK-fidelity rule · wake-relay capability +
metadata bound · opt-out mode. Does NOT own: `notifications` records/dispatch/gating (MOD-notifications), *what/when*
due (MOD-notifications + Sessions), channel/quiet-hours CONFIG (Preferences §5.17), device registry (ADR-003, XCU-13).

## Deferred (M2 / build-phase)
Real reach (Expo/Tauri/Web-Push/APNs/FCM), the Hono server wake-relay, email provider, push vendor/runtime policy,
delivery-audit + push-token columns. Rich/actionable push, history backup, digest/batching (N5) — ⚠ INTENDED-later.
