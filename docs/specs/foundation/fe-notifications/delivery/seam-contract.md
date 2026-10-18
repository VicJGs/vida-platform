<!-- Entity Delivery Flow ② · Step 2 — Decomposition Gate · fe-notifications (LIF-192) -->

# fe-notifications ② — Seam Contract

> The `@vida/core` ↔ UI boundary this surface consumes. All READ/WRITE goes through the shipped
> `NotificationsService`; no direct table access. M1 = honest-empty + `?sample` (no live composition root);
> the signatures below are what the deferred live hook will bind. `[FACT: services/notifications/types.ts]`

## Consumed — `NotificationsService` (unchanged ① surface)

```ts
// READ (inbox)
list(q?: { status?: 'unread'|'read'|'archived'; type?: NotificationType; page?: number }): Promise<NotificationView[]>
unreadCounts(): Promise<{ unread: number; error: number; warning: number; reminder: number }>
// WRITE (lifecycle) — deferred-live at M1
markRead(id: string): Promise<NotificationView>
markAllRead(): Promise<number>
archive(id: string): Promise<NotificationView>
```
`NotificationView = @vida/types Notification` — `{ id, type(6-enum), title, message, action_url, action_label,
entity_type, entity_id, is_read, read_at, is_archived, archived_at, expires_at, delivered_*, metadata,
effect_event_id, created_at }`. `[FACT: service.ts:169-191; types.ts:69]`

**Anticipations (The Margin "above now"):** derived from rows carrying a future `hard_deadline` in `metadata`
(the dispatcher writes `metadata = {occurrenceId, hard_deadline}` for reminder rows, `[FACT: BR-NT-S4-10]`).
At M1 the `?sample` seam supplies them directly; the live hook derives `anticipated` from unfired reminder
metadata. **No `tick()`/`dueIn` call from the UI** — the surface reads materialized + sample rows only.

## Owned by the UI (this unit)

```ts
// the app-local lens preference (NO @vida/core change) — persisted via app-local UI state, default 'margin'
type NotificationLens = 'margin' | 'dispatches' | 'constellation'
useNotificationLens(): { lens: NotificationLens; setLens(l: NotificationLens): void }

// the honest-empty data seam (M1 default [] + ?sample; live swap → React Query over list()/unreadCounts())
useNotifications(): { rows: NotificationView[]; counts: UnreadCounts; state: InteractionState }

// the pure one-model-three-renderers transform
toAttentionModel(rows: NotificationView[], now: number): {
  anticipated: AttentionEntry[]   // future hard_deadline, derived, "in Nh"
  settled: AttentionEntry[]       // fired, "N ago"
  byArea: Record<string, AttentionEntry[]>  // entity_type→module, for Constellation
}
// AttentionEntry = { id, type, title, voice, entity, relTime, marker, warm, dangling }
//   dangling (NOT-25) = action_url present AND its subject is gone → render "no longer available", no link
```

## Boundary rules
- **Tamagui-only** render primitives in `@vida/ui`; the `@vida/core`↔`@vida/ui` crossing (service types →
  Tamagui props) lives in `apps/web` (the collection-adapter precedent, BR-2). `[FACT: apps/web/src/collection/CLAUDE.md]`
- **No new `@vida/ui` primitive unless reusable** — the notification row/spine composes shipped primitives;
  Constellation reuses `NeuralGraph`. A net-new `@vida/ui` component only if S1 proves reusable chrome.
- **Writes are deferred-live** — `markRead`/`archive`/`markAllRead` bind to the same first-consumer composition
  root as reads; M1 = optimistic-local no-op stated honestly (no fake "saved").
- **8-state** via the shipped `deriveInteractionState`/`collapseToTerminal` canon; `state` is a prop (BR-2).
