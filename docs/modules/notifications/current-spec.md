<!-- CURRENT-SPEC · module: notifications · the living contract (§XXIX Currency Rule) · never lags the code -->

# Notifications — CURRENT SPEC  (`@vida/core` `services/notifications`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-notifications ① S1 (LIF-132, #53). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createNotificationsService(deps)` — the ① backend service tier for the **Notifications module** (the ADR-013
user-facing dispatcher/surface) over DB-4 `032_notifications` (1 table, `notifications`). The OS's terminal
**PURE SINK** (in-degree = everything, out-degree 0): it observes every module and nothing depends on it. It
composes — and never re-implements — the BUILT `foundation/notifications` delivery engine (#46), the ADR-004
effect rail, the Sessions `dueIn(range)` aggregator, and Preferences gating. Full design lives in
`docs/features/notifications/` (aspect docs) + `docs/features/notifications/delivery/` (interpretation ·
slice-map · seam-contract). Build state: **① IN PROGRESS — S2 of 5 shipped** (S1 scaffold + inbox reads +
lifecycle + DB-11 reconcile · S2 Preferences gating + `deliver` + delivery-audit).

## Delivered surface (as of S2)

`createNotificationsService({ db, deviceId, engine, preferences? }) → NotificationsService`. Factory-object,
hoisted closures, no `this.`. `engine` (the BUILT `foundation/notifications` delivery engine #46) is required
from S2; `preferences?` is the deny-safe/fail-OPEN gating read port (absent ⇒ permissive). S4 adds `sessions`.
Persistence: DB-6 `createRepository(db, notifications, { deviceId, encryptedFields: [], softDelete:
false })` — the M1.0 empty-`[E]` dormant seam (title/message/action_label/metadata are `[E]`, activated at
M3/DB-5); NO `deleted_at` (read→archive→expire→purge lifecycle).

- `list(q?: InboxQuery) → NotificationView[]` — status (`unread`/`read`/`archived`) + `type` filters,
  newest-first, paged by `INBOX_PAGE_SIZE` (50). `[code: service.ts list]`
- `unreadCounts() → UnreadCounts` — derived badge: total unread + `error`/`warning`/`reminder` counts
  (excludes read + archived). `[code: service.ts unreadCounts]`
- `markRead(id) → NotificationView` — sets `is_read`+`read_at`; idempotent (no re-stamp); throws
  `NotificationNotFoundError`. `[code: service.ts markRead]`
- `markAllRead() → number` — marks every unread; returns count; leaves read/archived. `[code: service.ts]`
- `archive(id) → NotificationView` — sets `is_archived`+`archived_at`; idempotent; throws on missing.
- `archiveExpired(now?) → number` — auto-archives rows with `expires_at ≤ now` (NULL never matches, NF-13).
- `deliver(id, ctx?: DeliverContext) → DeliveryResult` (S2) — gates the row against Preferences (NF-5), routes
  via `engine.deliver(decision)`, persists the `delivered_{in_app,push,email}` audit. `ctx = { platform?,
  nowMinuteOfDay?, routing? }` — all caller-supplied; platform defaults `'web'`, absent `routing` ⇒ external
  folds to in-app (M1 content-blind). `[code: service.ts deliver/gateChannels]`

**S2 gating (NF-5, the module owns it; the engine routes an already-gated decision):** in-app NEVER gated
(NF-7); push gated by global `notification_push` + per-module `push_<x>` (`PUSH_TOGGLE_BY_ENTITY`, keys verified
vs ENTITY_TYPES) + quiet-hours; email by `notification_email` + quiet-hours (no per-module email toggle). Quiet
hours resolved from a caller-supplied `nowMinuteOfDay` (the engine's TZ discipline). `channelsFor` gives the ZK
fidelity-max; the module gates it DOWN.

Reads go through `findWhere`/`findAll` (real DB reads → faithful values; `boolInt` maps 0/1↔boolean).
Mutations go through `repo.update`, which re-reads the full persisted row (faithful return). `toView()` picks
exactly the `@vida/types Notification` fields, dropping `_sync_*` + any phantom column.

## DB-11 reconcile (shipped at S1)

`@vida/types Notification` extended to match the DB-4 row: `delivered_in_app`/`delivered_push`/
`delivered_email: boolean` (delivery-audit, N4), `metadata: string | null` (`[E]` raw TEXT), `effect_event_id:
string | null` (ADR-012 Additive convergence key). `[code: packages/types/src/common.ts]`

## Not yet built (homed to later slices — do not assume present)

- **S3** — `fire` single write path + `applyNotificationEffect(event, tx)` rail handler + idempotency.
- **S4** — dispatcher `tick()` + time-driven path (fires only `hard_deadline`-pinned `DueItem`s).
- **S5** — `registerNotificationsJournal` summary + `purgeExpired` + dangling-subject read-safety → ① COMPLETE.

## Out of scope (homed elsewhere)

- External reach (Expo/Tauri scheduler · Hono wake-relay · Web Push · email) → **M2** (deny-safe engine ports).
- Digest/batching (`notification_frequency`) → **M2** (realtime per-notification at M1, NF-15).
- Inbox UI render + `action_url` deep-link resolution → **② `fe-notifications` (LIF-192)**.
- `[E]` field encryption → **M3** (the `encryptedFields: []` dormant seam).
