<!-- Contract — features/notifications · /documentation Phase 2 · sources: ADR-002 §5.16 · §5.17 · ADR-012 §3.1 · ADR-004 §3.2.5 · sessions dueIn -->

# Contract — Notifications ("the System's out-loud voice") (level: Feature — observer leaf)

> ⚠ The surface below is **INTENDED** (the alerting layer); the v2 code is 1 table, 0 service logic. Notifications is a
> **consumer/dispatcher** — it reads signals via seams, gates against Preferences, and writes only its own rows via the
> §3.2.5 rail; it re-implements nothing. Terminal states per capability are enumerated in `[[business-rules]]`.

## Exposed surface — `NotificationService`

- **`fire(notification)`** — the receiving handler for the ADR-012 **`surface_notification`** Additive effect: append a
  `notifications` row (deterministic `effect_event_id`), then dispatch per Preferences. The **single write path** into the
  table — no producer inserts directly. `[FACT: ADR-012 §3.1; ADR-004 §3.2.5 single-write-path]`
- **Inbox reads** — `list({status, type, page})` · `unreadCounts()` (derived badge: unread/error/warning/reminder) ·
  `markRead(id)` / `markAllRead()` · `archive(id)` / `archiveExpired()`. `[INTENT: RESOLUTION N7; FACT: v1 UnreadCounts]`
- **Dispatcher (headless, on-device)** — `tick()`: read `dueIn(range)` → for each due reminder, gate against Preferences →
  **materialize a row at fire time** (NF-3) → deliver. Not user-facing; runs on the device loop. `[INTENT: RESOLUTION N1]`
- **`deliver(row)`** — route to channels the user allows: **in-app** (always, local) · **push** (content-free wake-signal,
  device composes locally) · **email** (generic nudge only). Records a **delivery-audit** on the row for multi-device
  dedup. `[INTENT: RESOLUTION N3/N4 → ADR-013]`

## What it consumes (documented integration points — no direct table access, constitution §6)

- **ADR-004 effect rail** — receives `surface_notification` (Additive); the fire is idempotent per `effect_event_id`
  (INT-2 / §3.2.5). `[FACT: ADR-004 §3.2.5; ADR-012 §3.1]`
- **Sessions & Scheduling** — `dueIn(range)` for all time-driven reminders (the 8-module backbone). `[FACT: sessions dueIn]`
- **Preferences** — `user_preferences` §5.17: channel toggles · quiet hours · per-module push (`push_habits`/`tasks`/
  `routines`/`contacts`/`study`) · (INTENDED) `notification_frequency`. Read at every dispatch. `[FACT: §5.17 L27-39]`
- **Relationships** — `contact_reminders`/`reminder_groups` due-reminders (birthday/event-anchored + snooze) flow through
  the dispatcher. `[FACT: relationships G11]`
- **Platform delivery layer** — Tauri native OS notif (desktop) · Expo Notifications (mobile) · web toast + browser push.
  `[FACT: ADR-001]`
- **Depended on by:** **nothing** — terminal sink. (Journals may _render_ a notifications summary at read; no write
  dependency.) `[FACT: dep-graph leaf]`

## Contract error cases (typed)

- `ChannelDisabled` — a channel/module toggle is off in Preferences → **in-app fallback only**, recorded, never dropped (NF-5).
- `QuietHours` — inside quiet hours → external delivery suppressed; row still recorded in-app (NF-5).
- `DeliveryFailed` — push/email dispatch fails → **in-app fallback** + flag; the wake-signal carried no content to lose (NF-6).
- `SignalUnavailable` — a `dueIn` source is missing/stale → that reminder is **suppressed** + flagged, never fired on
  fabricated due-data (NF-3).
- `DuplicateFire` — a re-origination/retry/multi-device collision on the same `effect_event_id` → **no-op** (idempotent, NF-8).
- `DanglingSubject` — the linked `entity_id` was deleted → the row survives; `action_url` resolves to "no longer
  available", never a crash (NF-10).

## Completion checklist

- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim · [x] single write path (`fire`) · [x] dispatcher = derived-until-fire · [x] ZK delivery routed
