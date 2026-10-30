# Seam Contract — XS-notifications-delivery (#46, LIF-174)

> The service API MOD-notifications (#53, the dispatcher) + MOD-sessions consume. This XS ships the delivery
> MECHANISM; the caller owns _what/when_. Signatures are M1/M2-stable (deny-safe ports swap underneath, IR-7).
> Every type lands in `@vida/core` `foundation/notifications`. `[FACT: ADR-013 §3.6; decomposition.md:93-102]`

## Vocabulary

```
DeliveryTier   = 'in_app' | 'local_scheduled' | 'wake_signal'
DeliveryChannel= 'in_app' | 'push' | 'email'          // no 'sms' (XCU-12, IR-8)
Platform       = 'ios' | 'android' | 'desktop' | 'web'
DeliveryMode   = 'standard' | 'no_third_party'        // XCU-17 opt-out posture
```

## Operations (the seam)

| op                  | signature                                                                                                                                                                                                                                   | leg                      | purity                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ |
| `selectTier`        | `(nature, platform) => DeliveryTier`                                                                                                                                                                                                        | XCU-01                   | pure                     |
| `channelsFor`       | `(tier, mode) => DeliveryChannel[]`                                                                                                                                                                                                         | XCU-12/17                | pure                     |
| `buildWakePayload`  | `(routing: RoutingMeta) => WakePayload` — throws `PayloadNotContentFree` if any content/type/entity present                                                                                                                                 | XCU-08/16                | pure                     |
| `bakeQuietHours`    | `(occurrence, quietHours) => { action: 'schedule'\|'shift'\|'suppress', at? }`                                                                                                                                                              | XCU-05                   | pure                     |
| `reschedulePlan`    | `(prev, next) => { cancel: id[], register: Occurrence[] }`                                                                                                                                                                                  | XCU-04                   | pure                     |
| `dedupKey`          | `(source: EventSource \| DueOccurrence) => string` — event branch = **identity over the supplied ADR-012 `effect_event_id`** (pass-through, not a fresh hash — effect-rail #32 owns the key, NF-8); due branch = the `dueIn` occurrence key | XCU-14                   | pure                     |
| `shouldMaterialize` | `(occurrence, now) => boolean`                                                                                                                                                                                                              | XCU-18                   | pure                     |
| `deliver`           | `(decision: DeliveryDecision) => Promise<DeliveryResult>` — decision already gated (dispatcher, NF-5); routes to deny-safe port; fail→in-app                                                                                                | XCU-02/06/07/09/10/11/15 | effectful (deny-safe M1) |
| `scheduleLocal`     | `(occurrence, quietHours) => Promise<ScheduleResult>` — bakes quiet-hours then registers via OS port                                                                                                                                        | XCU-03/05                | effectful (deny-safe M1) |
| `cancelLocal`       | `(id) => Promise<void>`                                                                                                                                                                                                                     | XCU-04                   | effectful (deny-safe M1) |
| `setDeliveryMode`   | `(mode: DeliveryMode) => void`                                                                                                                                                                                                              | XCU-17                   | pure                     |

## Ports (injected; M1 default = deny-safe/fail-closed)

```
NotificationPorts {
  osScheduler?: { register(req): Promise<{scheduled:boolean, id?}>; cancel(id): Promise<void> }  // XCU-03
  wakeRelay?:   { push(payload: WakePayload, target): Promise<{delivered:boolean}> }              // XCU-06/07/09/10
  email?:       { sendNudge(target): Promise<{delivered:boolean}> }                               // XCU-11
}
```

- **Omitted / default port → deny-safe:** `{scheduled:false}` / `{delivered:false}` and **no network call**. The
  decision is still made + returned; the engine falls back to in-app (IR-4). M2 injects real reach; **signatures do
  not change** (IR-7). `[FACT: egress ports precedent; memory deny-safe-port-build-shape]`
- **No permission gate in the engine.** The `DeliveryDecision` reaching `deliver` is already gated by the dispatcher
  (channel-enabled / permission / quiet-hours, NF-5). The engine does NOT call the egress guard or capability enforcer;
  its constructor takes **no enforcer/egressGuard** (`createNotificationDeliveryEngine(ports?)`). The off-device
  _transmit_ governance of the server wake-relay is a Hono-server, M2 concern. `[FACT: NF-5; ADR-013 §3.6 L74; IR-2]`

## Errors (typed, in `types.ts`)

- `PayloadNotContentFree` — the payload builder refused a content/type/entity field (IR-3).
- **Suppression is NOT an error.** Opt-out mode / quiet-hours suppression is a normal result: `bakeQuietHours` →
  `action:'suppress'` and `scheduleLocal` → `{action:'suppress', scheduled:false}` (recorded in-app, not lost, NF-5);
  `deliver` under opt-out simply omits the off-device channels. No `DeliverySuppressed` error is thrown.
- **`deliver` never rejects** — a failed/undeliverable external channel (incl. a mis-built payload) folds to
  `fallbacks` with `inApp:true` (BR-ND-8/DEL-4). Only `buildWakePayload`, called directly, throws `PayloadNotContentFree`.

## Boundary reminders (what the caller owns, NOT this seam)

- The `notifications` ROW (create/read/archive/is_read) — MOD-notifications. This seam takes a `DeliveryDecision`
  built from a row the caller already made/derived; it never writes the table. `[FACT: ADR-013 §3.6 L73-74]`
- _Whether_ to notify + _when due_ — MOD-notifications dispatcher + Sessions `dueIn`. `[FACT: NF-2/NF-3]`
- Config storage — Preferences §5.17 (passed in as `quietHours`/`mode`, never stored here). `[FACT: NF-4]`
