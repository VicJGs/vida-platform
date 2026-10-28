<!-- Current Spec — notifications-delivery (foundation/notifications) · born XS-notifications-delivery #46 (LIF-174) · ADR-013 · 2026-09-21 -->

# Current Spec — Notification Delivery Engine (`@vida/core` foundation/notifications)

> The ADR-013 zero-knowledge delivery engine. Built M1 as a pure decision/routing tier + deny-safe/fail-closed ports,
> NO schema. 17 legs (XCU-01…12, 14–18; XCU-13 device-registry = ADR-003). Rules: `current-business-rules.md`.

## Files

- `types.ts` — tiers/natures/platforms/channels/modes; `RoutingMeta`/`WakePayload` + `FORBIDDEN_PAYLOAD_KEYS` +
  `PayloadNotContentFree`; S2 (`QuietHours`/`DueOccurrence`/`QuietHoursResult`/`RegisteredReminder`/`ReschedulePlan`/`DedupSource`);
  S3 (`DeliveryDecision`/`DeliveryResult`/`ScheduleRequest`/`ScheduleResult`/ports/`NotificationDeliveryEngine`).
- `tiers.ts` — `selectTier` (XCU-01), `channelsFor` (XCU-12/17), `PrimaryTier`. Pure.
- `payload.ts` — `buildWakePayload` (XCU-08/16, content-zero guard). Pure.
- `scheduling.ts` — `bakeQuietHours`/`reschedulePlan`/`dedupKey`/`shouldMaterialize` (XCU-05/04/14/18). Pure.
- `ports.ts` — `denySafeOsScheduler`/`denySafeWakeRelay`/`denySafeEmail` (M1 fail-closed defaults).
- `service.ts` — `createNotificationDeliveryEngine(ports?)` (S3; factory-of-closures, no enforcer/egress).
- `index.ts` — barrel; re-exported from `@vida/core` (`packages/core/src/index.ts`).

## Public API (the seam MOD-notifications + Sessions consume)

```
selectTier(nature: NotificationNature, platform: Platform): PrimaryTier            // XCU-01
channelsFor(tier: DeliveryTier, mode: DeliveryMode): DeliveryChannel[]             // XCU-12/17
buildWakePayload(routing: RoutingMeta): WakePayload                                // XCU-08/16 (throws PayloadNotContentFree)
bakeQuietHours(occ: DueOccurrence, qh: QuietHours): QuietHoursResult               // XCU-05
reschedulePlan(prev: RegisteredReminder[], next: RegisteredReminder[]): ReschedulePlan  // XCU-04
dedupKey(source: DedupSource): string                                             // XCU-14 (event id pass-through)
shouldMaterialize(occurrenceAt: number, now: number): boolean                     // XCU-18
createNotificationDeliveryEngine(ports?: NotificationPorts): NotificationDeliveryEngine
  .deliver(decision) → DeliveryResult      // XCU-02/06/07/09/10/11/15 — in-app always; off-device via deny-safe ports; fail→in-app
  .scheduleLocal(occ, quietHours) → ScheduleResult   // XCU-03/05 — bake then register (deny-safe M1)
  .cancelLocal(id) → void                  // XCU-04
  .setDeliveryMode(mode) → void            // XCU-17 — no_third_party never touches an off-device port
```

## Ports (M1 deny-safe → M2 real, no signature change)

`osScheduler` (Expo/Tauri) · `wakeRelay` (Hono server relay / Web Push) · `email` (generic nudge). Absent/default →
no network call, `{scheduled:false}`/`{delivered:false}` → in-app fallback.

## Verification

All slices pure/in-memory (no DB/schema at M1 → no live-store; spy + deny-safe port doubles). @vida/core 1166/1166
(+38), tsc 0, eslint 0.
