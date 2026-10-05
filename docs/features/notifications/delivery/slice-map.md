<!-- Slice map — mod-notifications ① backend (#53, LIF-132) · Entity Delivery Flow v1 Step 2 ·
     feeds Approval 1 · grounds: interpretation.md · aspect corpus · built seams @ main 220ebb7 -->

# Slice map — mod-notifications ① backend (`createNotificationsService`)

> All slices are **backend** (pure-sink module; no frontend/shared slice → Envision Gate N/A, EDF §3.75).
> Each slice runs the full per-slice loop: §XXVI double-gate → live-store Verification Gate → code-review →
> /critique → §XXIX currency. Pure service tier — **no new schema, no migration** (every column shipped at
> DB-4; D4). Composes the BUILT delivery engine (#46) + effect rail + Sessions `dueIn` + Preferences; invents
> no engine (NF-1/identity.md:41-42).

## Dependency order (each slice builds on the prior)
S1 reads/repo → S2 delivery (gating + engine compose) → S3 fire (event path, uses S2 deliver) →
S4 dispatcher (time path, uses `dueIn` + S3 fire + engine.scheduleLocal) → S5 journal + close-out.

## Slices

### S1 — Service scaffold + inbox reads + lifecycle + DB-11 reconcile  `[backend]`
**Covers:** NF-1 (pure sink), NF-13 (read→archive→expire lifecycle), NF-12 (6 fixed types), the read half of
contract.md:14.
- `createNotificationsService(deps)` factory-of-closures (no `this`; validating methods async) over
  `createRepository(db, notifications, { deviceId, encryptedFields: [], softDelete: false })` (D5 dormant
  seam; NO `deleted_at` — NF-13). `[FACT: interpretation A5; repository.ts:236]`
- Inbox reads: `list({status?, type?, page?})` · `unreadCounts()` (derived badge: unread/error/warning/
  reminder) · `markRead(id)` / `markAllRead()` · `archive(id)` / `archiveExpired(now)`. `[FACT: contract.md:14; NF-13]`
- **DB-11 (OQ-4 fold):** extend `@vida/types Notification` with `delivered_in_app/push/email`, `metadata`,
  `effect_event_id` to match the DB-4 row; add a `NotificationView` read type if the Row≠interface gap bites
  ([[drizzle-row-not-assignable-to-vida-types-interface]]). `[FACT: common.ts:90-108 vs schema]`
- **Verification:** live-store — create rows directly, assert list filters (status/type), unreadCounts derive,
  markRead/markAllRead/archive/archiveExpired transitions + sync enqueue.

### S2 — Preferences gating + DeliveryDecision builder + `deliver` + delivery-audit  `[backend]`
**Covers:** NF-4/NF-5 (gate before deliver), NF-6/NF-7 (ZK channel fidelity, in-app always), NF-8 (delivery-
audit), contract.md:18.
- Inject a **Preferences read port** (`preferences.getMergedPreferences()` → `MergedPreferences`). `[INTERP]`
  Required dep if the Preferences service is wired; else a deny-safe port (absent ⇒ permissive/in-app-only,
  the habits fail-OPEN precedent [[absent-deny-safe-port-write-is-noop-not-new-error]]). `[FACT: preferences/service.ts:74-86]`
- `buildDecision(row, ctx)` — gate channels: `notification_in_app` always; `push`/`email` iff their toggle +
  the per-module `push_<module>` toggle on + NOT inside quiet hours; `mode = no_third_party` when all external
  off. Compose `selectTier` + `channelsFor`, and **populate the required `DeliveryDecision.key` via
  `dedupKey(...)`** (N1 — `key` is non-optional, types.ts:173). `[FACT: tiers.ts:35,47; scheduling.ts:63; preferences fields]`
- `deliver(row)` — build the gated `DeliveryDecision`, call `engine.deliver(decision)`, persist the
  `DeliveryResult` → `delivered_in_app/push/email` audit cols (`update`). `[FACT: service.ts:39-72; types DeliveryResult]`
- **OQ-2 outcome vocabulary** (exported, non-throwing): `ChannelDisabled`/`QuietHours` → external suppressed,
  in-app recorded; `DeliveryFailed` → in-app fallback + audit flag. No throw-site (record-not-abort). `[FACT: contract.md:35-42; NF-5]`
- **Verification:** live-store — against a persisted row, assert audit cols reflect deny-safe M1 (in-app=1,
  push/email=0 fallback), quiet-hours suppression records in-app, per-module toggle off ⇒ no push.

### S3 — `fire` single write path + `surface_notification` rail handler + idempotency  `[backend]`
**Covers:** NF-2 (event path), NF-8 (idempotent per `effect_event_id`), the single-write-path rule
(conventions.md:6), NF-14 (achievement from Gamification — recorded not evaluated).
- **D1 ratified (B2):** the single persist logic (map → validate type → derive id → insert) is a service-
  internal closure with TWO entries, differing ONLY in the write primitive:
  - **time entry** `fire(input)` — public; `repo.create(…)` (its own tx). `[FACT: repository.ts create]`
  - **event entry** `applyNotificationEffect(event, tx)` — tx-aware; `repo.createInTx(tx, map(event))` so it
    co-writes in the RAIL's transaction (ADR-004 §3.2.5), NEVER opening its own. `[FACT: effects/types.ts:53 handler=(event,tx); repository.ts createInTx]`
- `registerNotificationsEffects(registry, svc)` — registers `(event, tx) => svc.applyNotificationEffect(event, tx)`
  for `'surface_notification'`; the `svc` form is the `registerXJournal(registry, svc)` precedent and is
  tx-correct because the method RECEIVES `tx` (not the mis-grounded "svc.fire opens a new tx" shape the g1 critic
  flagged). Handler maps `EffectEvent.payload` → row (`[E]` title/message), derives `effect_event_id` from the
  event triple. `[FACT: registry.ts:12; event-id.ts:20; effects/types.ts:29 Additive; gamification/journal.ts:72 precedent]`
- **Idempotency:** UNIQUE(`effect_event_id`) → a duplicate fire is a no-op (`DuplicateFire` vocabulary, caught
  on unique-violation / pre-checked). `[FACT: schema UNIQUE; NF-8]`
- **Verification:** live-store — fire via a simulated rail event co-writes in-tx; re-fire same `effect_event_id`
  ⇒ one row (idempotent); fired row is delivered (audit set).

### S4 — Dispatcher `tick()` + time-driven path  `[backend]`
**Covers:** NF-2 (time path), NF-3 (derive-until-fire, no phantom inbox), SignalUnavailable, NF-8 (occurrence
key), NF-5 gate.
- `tick(range?, now?)` — read `sessions.dueIn(range)` → for each `DueItem`:
  - **OQ-1 REVISED (B3/B4):** fire ONLY time-**pinned** items — those with a `hard_deadline` (the device-stable
    UTC-ms fire instant). `at = hard_deadline`; `occurrenceId = ${source_module}:${ref_id}:${hard_deadline}` →
    `dedupKey({kind:'due', occurrenceId})`. **A `DueItem` WITHOUT `hard_deadline` has no stable fire instant**
    (`DueItem` supplies none — sessions/types.ts:225-232) ⇒ it is **skipped** (un-pinned due-work is agenda/
    Journals, not an alarm — a documented upstream gap, NOT an invented key). No TZ/local-date math, no
    double-fire. `[FACT: sessions/types.ts:225-232; scheduling.ts:63,72; NF-8]`
  - `shouldMaterialize(hard_deadline, now)` → gate (S2) → `fire` (time entry) → `engine.scheduleLocal(occ,
    quietHours)` for native/local alerts. `[FACT: scheduling.ts:72; service.ts:74; contract.md:16]`
- `SignalUnavailable` — a missing/throwing `dueIn` source ⇒ that lane skipped + flagged, never fire on
  fabricated data; tick is failure-isolated per item. `[FACT: contract.md:40; NF-2/NF-3]`
- Dispatcher is headless/on-device (not a server cron); feed is sparse at M1 (dormant provider lanes, D3) —
  logic is the deliverable. `[FACT: conventions.md:31; sessions/service.ts:33]`
- **Verification:** live-store — stub a `dueIn` returning DueItems; assert materialize-at-fire only
  (`shouldMaterialize` gate), occurrence-id dedup (two ticks ⇒ one row), gated suppression records in-app,
  `dueIn` throw ⇒ skip+flag not crash.

### S5 — Journal contribution + close-out  `[backend]` → **① COMPLETE**
**Covers:** OQ-3 (Journal summary), NF-10 (dangling subject read-safety), NF-13 (expire/purge), final currency.
- `registerNotificationsJournal(registry, svc)` — a thin `JournalContribution { module:'notifications',
  sectionKey:'summary', dataPoints: DATA_POINTS, summary(date) }` (**B1: `dataPoints` is REQUIRED** —
  journals/types.ts:58-64; a `DATA_POINTS` const per gamification/journal.ts:34) — unread/by-type recap; **no
  `dueIn` agenda lane** (Notifications CONSUMES dueIn, is not an agenda provider; the gamification summary-only
  precedent). `[FACT: journals/types.ts:58-64; gamification/journal.ts:30-68; identity.md:32]`
- `purgeExpired(before)` retention sweep (NF-13). `[FACT: NF-13; business-rules:82]`
- NF-10 dangling-subject: the read path returns the row with an `action_url` resolvable to "no longer
  available" (mostly a ② concern; ① guarantees the row survives a deleted subject). `[FACT: NF-10]`
- Barrel export the service + both `register*` from `@vida/core`; §XXIX currency `docs/modules/notifications/current-*`.
- **Verification:** live-store — journal summary derives from real rows; purge archives/reclaims; a row whose
  subject was deleted still lists (no crash).

## Decisions resolved at this gate (ratify or correct)
| # | Decision | Resolution | Grounding |
|---|----------|-----------|-----------|
| OQ-1 | time-path occurrence-id | `${source_module}:${ref_id}:${hard_deadline}`; fire ONLY items WITH a hard_deadline, skip un-pinned (g1 B3 fix — no invented `todayDateKey`, no TZ double-fire) | NF-8 device-stable (UTC ms); DueItem supplies no other stable instant (sessions/types.ts:225-232) |
| OQ-2 | 6 typed errors throw-vs-record | exported typed OUTCOME vocabulary; record-not-throw (in-app fallback/suppress/no-op) | contract.md:35-42; [[absent-deny-safe-port-write-is-noop-not-new-error]] |
| OQ-3 | Journal contribution scope | thin summary contribution IN ①; inbox render = ② | identity.md:32; gamification precedent |
| OQ-4 | `@vida/types Notification` reconcile | fold into S1 | DB-11; common.ts:90-108 vs schema |
| D-ENC | `encryptedFields` at M1 | `[]` dormant seam (`[E]` set = future boundary) | [[m10-repos-use-empty-encryptedfields-seam]] |
| D-SCHEMA | new schema? | none — pure service tier, all cols shipped at DB-4 | schema vs interpretation D4 |

## Not in ① scope (homed elsewhere)
- Real external reach (Expo/Tauri scheduler · Hono wake-relay · Web Push · email) → **M2** (deny-safe ports, zero-sig swap). `[FACT: ports.ts; ADR-013 §5]`
- Digest/batching (`notification_frequency`) → **INTENDED/M2** (realtime per-notification at M1, NF-15).
- Inbox UI render, `action_url` deep-link resolution UI → **② `fe-notifications` (LIF-192)**.
- Encryption of `[E]` fields → **M3 encryption pass** (dormant `encryptedFields` seam).
