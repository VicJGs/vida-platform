<!-- Seam contract — mod-notifications ① backend (#53, LIF-132) · Entity Delivery Flow v1 Step 2 ·
     the service API the UI (② fe-notifications LIF-192) + the rail + the dispatcher runtime consume ·
     grounds: contract.md · interpretation.md · built seams @ main 220ebb7 -->

# Seam contract — `NotificationService` (mod-notifications ①)

> The module is a **pure sink** (out-degree 0): nothing in @vida/core depends on it writing. Consumers are
> (a) the ② frontend inbox (`fe-notifications`), (b) the effect rail (via the registered handler), (c) the
> headless dispatcher runtime. Types live in `@vida/types`; the factory + `register*` export from `@vida/core`.

## Factory
```ts
createNotificationsService(deps: NotificationsServiceDeps): NotificationsService

interface NotificationsServiceDeps {
  db: DrizzleDb
  deviceId: string
  engine: NotificationDeliveryEngine        // foundation/notifications (#46), BUILT
  sessions: Pick<SessionsService, 'dueIn'>   // the dueIn(range) aggregator — time path (S4)
  preferences?: PreferencesReadPort          // deny-safe: absent ⇒ permissive/in-app-only (habits fail-OPEN)
}

interface PreferencesReadPort {              // [INTERP] narrow read seam over MergedPreferences
  getMergedPreferences(): Promise<MergedPreferences>
}
```

## Surface — `NotificationsService`
```ts
interface NotificationsService {
  // ── Write (the SINGLE write path — NF-2/conventions.md:6) ────────────────
  fire(input: FireInput): Promise<NotificationView>          // TIME entry (repo.create) + deliver
  applyNotificationEffect(event: EffectEvent, tx: EffectTx): Promise<void>  // EVENT entry — co-writes in the
  //   rail tx via repo.createInTx(tx,…) (ADR-004 §3.2.5); invoked by the registered handler, not the UI (D1/B2)

  // ── Inbox reads (S1) ─────────────────────────────────────────────────────
  list(q?: InboxQuery): Promise<NotificationView[]>          // filter status/type; page
  unreadCounts(): Promise<UnreadCounts>                      // derived badge (unread/error/warning/reminder)
  markRead(id: Id): Promise<NotificationView>
  markAllRead(): Promise<number>                             // count marked
  archive(id: Id): Promise<NotificationView>
  archiveExpired(now?: Timestamp): Promise<number>           // expires_at ≤ now ⇒ archived (NF-13)
  purgeExpired(before: Timestamp): Promise<number>           // retention sweep (S5/NF-13)

  // ── Delivery (S2) ────────────────────────────────────────────────────────
  deliver(id: Id): Promise<DeliveryResult>                  // gate vs Preferences → engine.deliver → audit

  // ── Dispatcher (S4, headless) ────────────────────────────────────────────
  tick(range?: TimeRange, now?: Timestamp): Promise<TickResult>   // dueIn → materialize-at-fire → fire → schedule
}

// registration (S3/S5) — rail handler + Journal summary
function registerNotificationsEffects(registry: EffectRegistry, svc: NotificationsService): void
//   registers (event, tx) => svc.applyNotificationEffect(event, tx) for 'surface_notification' (Additive) — the
//   handler RECEIVES tx (tx-correct; not a svc.fire that opens its own tx). [gamification/journal.ts:72 precedent]
function registerNotificationsJournal(registry: JournalRegistry, svc: NotificationsService): void
//   registers { module:'notifications', sectionKey:'summary', dataPoints: DATA_POINTS, summary(date) }
//   — dataPoints is REQUIRED (journals/types.ts:58-64); no dueIn agenda lane (consumer, not provider)
```

## Key types
```ts
interface FireInput {
  type: NotificationType                      // one of the 6 (NF-12)
  title: string                               // [E]
  message?: string | null                     // [E]
  action_url?: string | null
  action_label?: string | null               // [E]
  entity_type?: string | null                 // link, don't copy (NF-10)
  entity_id?: Id | null
  expires_at?: Timestamp | null
  metadata?: Record<string, unknown> | null   // [E], optional
  // event entry only (handler-set, not caller-set): effect_event_id (deterministic, NF-8)
}

interface InboxQuery { status?: 'unread' | 'read' | 'archived'; type?: NotificationType; page?: number }
interface UnreadCounts { unread: number; error: number; warning: number; reminder: number }
type NotificationView = Notification               // DB-11/S1: delivered_*/metadata/effect_event_id now
//   live on `Notification` itself → the view IS the interface. `metadata: string | null` (raw TEXT at M1;
//   parsing is a ② reader convenience — NOT a parsed object at this tier).
interface TickResult { evaluated: number; fired: number; suppressed: number; skipped: number }
// DeliveryResult, TimeRange — re-exported from foundation/notifications + sessions
```

## Outcome vocabulary (OQ-2 — exported, NON-throwing; record-not-abort)
`ChannelDisabled` · `QuietHours` · `DeliveryFailed` · `SignalUnavailable` · `DuplicateFire` ·
`DanglingSubject` — a typed vocabulary recorded on the row / reflected in `DeliveryResult.fallbacks` or
`TickResult`, **not exceptions** (contract.md:35-42; the `PositionConflictPending` precedent). Genuine
programmer errors (invalid `type`, unknown id) throw typed errors (`NotificationNotFoundError`, validation).

## Invariants the contract guarantees (from business-rules)
- Single write path: every row enters via `fire` (public time entry or the rail handler). `[NF-2]`
- Idempotent per `effect_event_id` (event) / occurrence key (time). `[NF-8]`
- Gate before external deliver; in-app always recorded (suppression ≠ loss). `[NF-5/NF-7]`
- Content-blind wire: only `RoutingMeta` reaches the push/email path. `[NF-6]`
- Derive upcoming (via `dueIn`), store fired only. `[NF-3]`
- Pure sink: no @vida/core module depends on this service. `[NF-1]`

## M1 deny-safe behavior (consumers must not assume external success)
At M1 `engine` ports are deny-safe → `deliver`/`tick` always succeed in-app; `delivered_push/email` stay 0
(folded to fallbacks). `dueIn` feed is sparse (dormant lanes). `preferences` absent ⇒ permissive. Real reach +
encryption = M2/M3, zero signature change (IR-7). `[FACT: ports.ts; service.ts:33; ADR-013 §5]`
