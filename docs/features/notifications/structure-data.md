<!-- Structure & Data — features/notifications · /documentation Phase 2 · sources: ADR-002 §5.16 L3468-3500 · common.ts L70-99 · §5.17 · ADR-012 §3.1 · ADR-004 §3.2.5 · ../life-os/src/types/notifications.ts · docs/intake/notifications.md RESOLUTION -->

# Structure & Data — Notifications ("the System's out-loud voice") (level: Feature — observer leaf)

## Data model

### As-is (v2 — FACT, the floor) `[FACT: ADR-002 §5.16; common.ts L81-99]`

- **`notifications`** — `id · type CHECK{info,success,warning,error,reminder,achievement} · title[E] · message[E] ·
action_url · action_label[E] · entity_type · entity_id · is_read · read_at · is_archived · archived_at · expires_at ·
created_at · _sync_*`. One partial index `idx_notifications_unread(is_read) WHERE is_archived=0`.
- **Schema-only, 0 service logic:** no dispatcher, no delivery, no `dueIn` wiring; `reminder-engine.ts` = 0 bytes.
  `[FACT: grep clean packages/core/src/services]`

### Intended (the alerting layer — ⚠ INTENDED → ADR-002 §5.20 + ADR-013) `[INTENT: RESOLUTION]`

- **Dispatcher** (NEW — `reminder-engine.ts`, an **on-device loop**, NOT a table): reads `dueIn(range)` → gates against
  Preferences (§5.17) → **materializes a row at fire time** (NF-3) → hands to platform delivery. `[INTENT: RESOLUTION N1]`
- **AMENDMENTS to `notifications`:**
  - **delivery-audit** (NEW cols) — a compact record of _which channels a row fired on_ (`delivered_in_app ·
delivered_push · delivered_email` flags, or a small `delivered_channels` set) for **multi-device dedup** (NF-8). All P
    (structural). `[INTENT: RESOLUTION N4]`
  - **`metadata` JSON `[E]`** (NEW, optional) — entity-specific payload for extensibility (v1 had it). `[INTENT: RESOLUTION N4]`
  - **`notification_frequency`** does **NOT** land here — it is a **Preferences** field (⚠ INTENDED, §5.17) driving the
    digest mode; Notifications reads it. `[INTENT: RESOLUTION N5; FACT: preferences/business-rules L40]`
- **New effect on the ADR-004 rail:** **`surface_notification`** — **Additive-class** (writes a durable synced
  `notifications` row; deterministic `effect_event_id` sole convergence key). Added to the §3.2.2 catalogue **by ADR-012**
  (Notifications is the receiving handler, `notifications.fire`). `[FACT: ADR-012 §3.1; ADR-004 §3.2.5]`
- **ZK delivery (→ ADR-013):** the server relays a **content-free wake signal**; device composes locally. Per-channel
  fidelity: in-app full · push wake-only · email generic · SMS dropped. **No schema on the server** beyond the existing
  opaque-blob relay. `[INTENT: RESOLUTION N3 → ADR-013]`

### v1 delta (harvest — what moved / dropped) `[FACT: ../life-os/src/types/notifications.ts]`

- v1 `channels[]` on the row → **moved to Preferences** (channel toggles §5.17); the row keeps only a **delivery-audit**
  (what actually fired), not a config list.
- v1 `NotificationPreferences` (email-on-\*, per-module push, frequency, quiet hours) → **all Preferences' job** (N2).
- v1 `sms` channel → **DROPPED** (un-encryptable, carrier-visible; NF-6).
- v1 `UnreadCounts` → a **derived read** (badge query), not a stored table.
- v1 `metadata` JSON → **optionally restored** `[E]` (N4).

## Dependencies / graph (within the coupling budget — constitution §6)

- **Depends on (reads via seams — no direct table access):**
  - **Sessions & Scheduling** — `dueIn(range)` (the time-driven backbone; 8 modules register providers). `[FACT: sessions dueIn]`
  - **Preferences** — `user_preferences` §5.17 (channels · quiet hours · per-module toggles · INTENDED frequency). `[FACT: §5.17]`
  - **Every event producer** — via `surface_notification` (Gamification unlock/level-up; any consequence). `[FACT: ADR-012 §3.1]`
  - **Relationships** — `contact_reminders`/`reminder_groups` due-reminders (birthday/event-anchored, snooze) flow through
    the same dispatcher. `[FACT: relationships G11]`
  - **Platform delivery layer** — Tauri (desktop OS notif) · Expo Notifications (mobile) · web toast/browser-push. `[FACT: ADR-001]`
- **Depended on by:** **nothing** — terminal sink, **out-degree 0.** (Journals may _render_ a notifications summary at
  read, but does not depend on the module writing.) `[FACT: dep-graph in/out — leaf]`
- **No cycle:** it reads everything, writes only its own rows, is read by nothing. `[FACT: dep-graph; INT-1]`

## ADRs / structural decisions

- **ADR-013 ("Zero-Knowledge Notification Delivery") — ACCEPTED 2026-07-19:** three-tier delivery (in-app · **native
  local-scheduled** · content-free wake-signal) + per-channel ZK fidelity (in-app full · push wake-only · email generic
  · SMS dropped) + on-device compose. Honest bound: push exposes timing to APNs/FCM (new 3rd party) + tokens, never
  content. Amends ADR-001 (Phase-6.7 resolution) · ADR-002 (delivery-audit) · ADR-003 (wake-relay + device-registry
  push-token cols). `[FACT: ADR-013]`
- **ADR-012 (Points Economy)** — owns `surface_notification` (Additive); Notifications is its receiving handler. `[FACT: ADR-012 §3.1]`
- **ADR-004 (Session Framework)** — the `surface_notification` effect rides §3.2.5; `dueIn` is the Sessions seam. `[FACT: ADR-004 §3.2.5]`
- **ADR-002 §5.20 amendment (build-phase)** — delivery-audit cols + optional `metadata[E]` on `notifications`; the
  dispatcher owes no table but a service. `[INTENT: §5.20]`

## Single source of truth (constitution §3)

- **"What's coming" lives in `dueIn`/Sessions** — Notifications derives from it, storing only fired rows (NF-3).
- **Delivery config lives in Preferences** — Notifications reads it (NF-4).
- **The subject fact lives in its own module** — a notification links (`entity_type`/`entity_id`), never copies (NF-10).
- **Achievement/level state lives in Gamification** — Notifications records the alert, never evaluates it (NF-14).
- **Read/archive state is the row's own** — synced by LWW/HLC across devices (NF-9).

## Completion checklist

- [x] data model (as-is FACT floor vs INTENDED) · [x] v1 delta enumerated · [x] dep graph within budget (leaf, no cycle) · [x] ADRs (ADR-013 surfaced + reused) · [x] single source per concern · [x] [FACT/INTENT] on every claim · [x] RETIRE/NEW/AMEND for §5.20
