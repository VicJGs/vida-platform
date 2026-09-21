# foundation/notifications — substrate (ADR-013)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
ZK three-tier delivery RAIL (local-scheduled OS alert / content-free cross-device wake-signal / in-app); server never sees content. Surface = services/notifications/

## Owning ADR
ADR-013

## Capabilities (framework §3)
N1 N2 N7

## Status
**BUILT M1** — XS-notifications-delivery #46 (LIF-174), 2026-09-21. The ZK delivery ENGINE: `types.ts` · `tiers.ts`
(selectTier/channelsFor) · `payload.ts` (buildWakePayload, content-zero) · `scheduling.ts` (bakeQuietHours/reschedulePlan/
dedupKey/shouldMaterialize) · `ports.ts` (deny-safe defaults) · `service.ts` (`createNotificationDeliveryEngine(ports?)`).
17 legs XCU-01…12,14-18. Pure decision/routing tier + deny-safe/fail-closed ports, **NO schema** — real reach
(Expo/Tauri/Web-Push, Hono wake-relay, email) + delivery-audit/push-token columns are M2 (behind the ports).

Gating is UPSTREAM (MOD-notifications dispatcher, NF-5) — the engine holds no enforcer/egress and runs no permission
check; it executes an already-gated `DeliveryDecision`. Surface (records/dispatch/UI) = MOD-notifications (`services/notifications/`).
Docs: `docs/core/notifications-delivery/current-{spec,business-rules}.md`. 38 tests; @vida/core 1166 green.
