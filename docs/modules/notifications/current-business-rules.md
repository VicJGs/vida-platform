<!-- CURRENT-BUSINESS-RULES · module: notifications · living invariants (§XXIX) · never lags the code -->

# Notifications — CURRENT BUSINESS RULES  (`@vida/core` `services/notifications`)

> The invariants the code enforces, promoted per slice from the slice PLANs. Inherits the CORE constitution
> (ZK-1/2/3, LF-1/2/3, INT-1). Born at S1 (LIF-132, #53). Source rules: `docs/features/notifications/business-rules.md`
> (NF-1..15) + `docs/features/notifications/delivery/{interpretation,slice-map}.md`.

## Shipped invariants (as of S1)

- **BR-NT-S1-1 (pure sink / NF-1)** — the service writes ONLY its own `notifications` rows and exposes no
  surface any other `@vida/core` module depends on. It can be fully disabled with no core breakage.
  `[code: services/notifications/service.ts; index.ts export]`
- **BR-NT-S1-2 (lifecycle / NF-13)** — read→archive→expire. `markRead` sets `is_read`+`read_at`; `archive`
  sets `is_archived`+`archived_at`; `archiveExpired(now)` auto-archives rows with `expires_at ≤ now`. There is
  NO `deleted_at` / soft-delete (`softDelete: false`). Purge lands at S5. `[code: service.ts; schema/notifications.ts]`
- **BR-NT-S1-3 (NULL-safe expiry)** — `archiveExpired` uses `lte(expires_at, now)`; a NULL `expires_at`
  (no-expiry row) is `NULL ≤ now` = not-true → never archived. `[code: service.ts archiveExpired; live-store test]`
- **BR-NT-S1-4 (idempotent lifecycle)** — `markRead` on an already-read row returns it WITHOUT re-stamping
  `read_at`; `archive` on an already-archived row likewise. `[code: service.ts markRead/archive short-circuit]`
- **BR-NT-S1-5 (typed not-found)** — a lifecycle mutation on a missing id throws `NotificationNotFoundError`
  (not the repo's generic error). `[code: service.ts; types.ts NotificationNotFoundError]`
- **BR-NT-S1-6 (derived badge / NF-13)** — `unreadCounts()` derives total unread + `error`/`warning`/
  `reminder` counts from live rows, excluding read + archived. No stored counter. `[code: service.ts unreadCounts]`
- **BR-NT-S1-7 (faithful view)** — `toView()` returns exactly the `@vida/types Notification` shape: `boolInt`
  columns as booleans, `_sync_*` and the phantom `updated_at` dropped. `[code: service.ts toView; live-store test]`
- **BR-NT-S1-8 (newest-first, local-scale paging)** — `list` orders by `created_at` desc and pages by
  `INBOX_PAGE_SIZE` (50), sorting/slicing in-memory (local single-user inbox). `[code: service.ts list]`
- **BR-NT-S1-9 (M1.0 encryption seam)** — the repo is built with `encryptedFields: []` even though
  `title`/`message`/`action_label`/`metadata` are `[E]`; the `[E]` set activates at M3/DB-5, zero signature
  change. `[code: service.ts repo config; [[m10-repos-use-empty-encryptedfields-seam]]]`
- **BR-NT-S1-10 (DB-11 reconcile)** — the `@vida/types Notification` interface carries `delivered_in_app/push/
  email` (boolean), `metadata` (string|null), `effect_event_id` (string|null), matching the DB-4 row.
  `[code: packages/types/src/common.ts]`

## Shipped invariants (as of S2)

- **BR-NT-S2-1 (module owns the gate / NF-5)** — the module READS `MergedPreferences` and builds an
  already-gated `DeliveryDecision`; the engine only routes it. `channelsFor` returns the ZK fidelity-max; the
  module gates it DOWN. `[code: service.ts gateChannels/deliver; tiers.ts channelsFor]`
- **BR-NT-S2-2 (in-app never gated / NF-7)** — in-app is always a delivered channel regardless of prefs; only
  external (push/email) can be suppressed. `[code: service.ts gateChannels in_app branch]`
- **BR-NT-S2-3 (push gating)** — push fires iff global `notification_push` AND the per-module `push_<x>`
  toggle (mapped from `entity_type` via `PUSH_TOGGLE_BY_ENTITY`, keys verified vs ENTITY_TYPES) AND not inside
  quiet hours. An unmapped `entity_type` has no per-module gate (global governs). `[code: service.ts]`
- **BR-NT-S2-4 (email gating)** — email fires iff global `notification_email` AND not quiet; it is NOT
  per-module gated (no `email_<x>` toggle exists). `[code: service.ts gateChannels email branch]`
- **BR-NT-S2-5 (quiet hours / NF-5)** — external delivery is suppressed inside the quiet window (in-app still
  records); the window is `'HH:MM'`→minutes, spanning-midnight aware, evaluated against a CALLER-supplied
  `nowMinuteOfDay` (the engine's TZ discipline); absent ⇒ not-quiet (permissive). `[code: service.ts hhmmToMinutes/inQuietWindow]`
- **BR-NT-S2-6 (content-blind M1 fold / NF-6)** — a push needs a routing `userId` (ADR-003) that does not
  exist at M1; absent `routing` ⇒ `buildWakePayload` rejects the empty target ⇒ push folds to in-app. The wake
  payload carries ONLY routing, never `[E]` content/type/entity (engine-enforced). `[code: service.ts deliver; payload.ts:27-31]`
- **BR-NT-S2-7 (delivery-audit / NF-8)** — `deliver` persists which channels actually FIRED
  (`delivered_in_app` always true; `delivered_push/email` only when a port confirmed; fallbacks are NOT
  delivered). `[code: service.ts deliver update]`
- **BR-NT-S2-8 (permissive absent prefs)** — `preferences?` absent ⇒ `PERMISSIVE_PREFS` (every channel on, no
  quiet window) — fail-OPEN, a user-convenience policy not a security gate. `[code: service.ts PERMISSIVE_PREFS; habits precedent]`

## Shipped invariants (as of S3)

- **BR-NT-S3-1 (single write path / NF-2)** — every row enters through `fire` (public time path) or
  `applyNotificationEffect` (the `surface_notification` rail handler); no other insert site. `[code: service.ts]`
- **BR-NT-S3-2 (event path co-writes in the rail tx / NF-8)** — `applyNotificationEffect` persists via
  `createInTx(tx, …)` in the rail's transaction; `effect_event_id` derived from the event triple
  (byte-identical to the rail's). `[code: service.ts applyNotificationEffect; foundation/effects/service.ts:42]`
- **BR-NT-S3-3 (idempotent / NF-8)** — per-device dedup rides the rail's `appliedEffects` ledger (handler
  fires once per id/device); cross-device convergence is the notifications `UNIQUE(effect_event_id)` resolved
  at sync. A re-fired event converges to one row. `[code: foundation/effects/service.ts:44-56; schema UNIQUE]`
- **BR-NT-S3-4 (PURE SINK — handler NEVER throws / NF-1)** — a malformed payload is SKIPPED (not thrown), and
  a same-id/different-targetRef collision is pre-checked + skipped (not a UNIQUE-throw) — notifications must
  NEVER roll back the triggering write. Deliberately unlike economy's additive handler (which throws).
  `[code: service.ts applyNotificationEffect guard; contrast foundation/economy/handlers.ts:44]`
- **BR-NT-S3-5 (local-first / NF-9)** — the event handler stamps `delivered_in_app: true` at creation (the
  row IS the in-app channel); external delivery for the event path is post-commit (M2). `[code: service.ts]`
- **BR-NT-S3-6 (public fire fail-loud)** — `fire` throws `InvalidNotificationError` on an unknown type or
  empty title (public API; no rail tx to roll back) — the asymmetry with the fail-soft handler is intended.
  `[code: service.ts fire; types.ts InvalidNotificationError]`
- **BR-NT-S3-7 (6 fixed types / NF-12)** — both paths validate `type ∈ NOTIFICATION_TYPE` (the handler via
  `fireInputFromPayload`, fire via a guard); no new type. `[code: service.ts NOTIFICATION_TYPE_SET]`
- **BR-NT-S3-8 (achievement recorded not evaluated / NF-14)** — the handler records whatever a producer (e.g.
  Gamification) emits on `surface_notification`; it evaluates no predicate. `[code: service.ts applyNotificationEffect]`

## Shipped invariants (as of S4)

- **BR-NT-S4-1 (time path / NF-2)** — `tick(range?, now?)` is the headless time half of the single write
  path; it materializes rows ONLY through the existing `fire` time entry (no new insert site). `range`
  defaults to `{ start: 0, end: now }`, `now` to `Date.now()`. `[code: service.ts tick]`
- **BR-NT-S4-2 (fire only time-pinned / OQ-1)** — a `DueItem` materializes ONLY if it has a `hard_deadline`;
  an un-pinned item has no stable fire instant ⇒ **skipped** (agenda work, not an alarm).
  `[code: service.ts tick hd-guard; sessions/types.ts:231]`
- **BR-NT-S4-3 (derive-until-fire / NF-3)** — a pinned item materializes ONLY when
  `shouldMaterialize(hard_deadline, now)` (deadline ≤ now). A future deadline writes NO inbox row (no phantom
  future rows). `[code: service.ts tick; foundation/notifications/scheduling.ts:72]`
- **BR-NT-S4-4 (occurrence identity + in-service dedup / NF-8)** — the OS schedule keys by
  `${source_module}:${ref_id}:${hard_deadline}`; the **inbox-row** dedup is in-service — a fired row links
  `entity_type = source_module`, `entity_id = ref_id`, and `tick` skips if a prior row with that
  `(entity_type, entity_id)` AND `effect_event_id IS NULL` exists. The `isNull` clause confines dedup to prior
  DISPATCHER rows, so a prior EVENT-path row on the same subject never false-skips a time fire. Remaining M1
  window: a rescheduled block (same `ref_id`, new `hard_deadline`) converges to one row (benign — 1:1 at M1,
  lanes dormant). `[code: service.ts alreadyMaterialized; schema/notifications.ts:56,62-67]`
- **BR-NT-S4-5 (two ticks ⇒ one row / NF-8)** — re-running `tick` over the same due occurrence yields exactly
  one inbox row. `[code: service.ts tick dedup; live-store AC4]`
- **BR-NT-S4-6 (gate rides deliver / NF-5)** — a materialized row goes through `fire`→`deliver`, so S2 channel
  gating + quiet-hours suppression apply unchanged (in-app always, NF-7); `tick` passes a `DeliverContext`
  with `nowMinuteOfDay` derived from `now`. `[code: service.ts tick → fire]`
- **BR-NT-S4-7 (local OS arm, deny-safe M1)** — after materializing, `tick` calls
  `engine.scheduleLocal(occ, quietHours)` to arm the native alert (deny-safe M1 → no OS call). A quiet-hours
  bake may `suppress` the alert (in-app still recorded). `minuteOfDay` is a UTC approximation at M1 (true
  device TZ = M2, zero signature change). `[code: service.ts tick; foundation/notifications/service.ts:74-92]`
- **BR-NT-S4-8 (SignalUnavailable / failure-isolated)** — a throwing `dueIn` ⇒ `tick` returns a zeroed result
  (never fires on fabricated data, never crashes); per-item processing is isolated — one bad item is caught +
  skipped, never aborts the batch. `[code: service.ts tick try/catch; contract.md:40]`
- **BR-NT-S4-9 (TickResult accounting)** — `{ evaluated, fired, suppressed, skipped }`, disjoint on outcome:
  `fired + suppressed` = new rows materialized (suppressed = OS alert quiet-hours-suppressed, in-app only);
  `skipped` = not materialized (un-pinned ∪ future ∪ duplicate ∪ unavailable-lane). The invariant holds
  ACROSS an OS-arm failure: once `fire` materializes the row, it is counted `fired`/`suppressed` even if
  `engine.scheduleLocal` throws (the local alert is best-effort — a materialized row is never recounted
  `skipped`; split try/catch, g2). `[code: service.ts tick fire/scheduleLocal split; live-store AC10]`
- **BR-NT-S4-10 (fired row shape)** — a dispatcher fire is `type:'reminder'`, `title = DueItem.label`,
  `entity_type/entity_id` = the subject link, `metadata = JSON.stringify({ occurrenceId, hard_deadline })`
  (raw TEXT at this tier). `[code: service.ts tick FireInput; live-store AC8]`

## Shipped invariants (as of S5) — ① COMPLETE

- **BR-NT-S5-1 (one summary contribution, consumer-not-provider / OQ-3)** — notifications registers exactly ONE
  `JournalContribution { module:'notifications', sectionKey:'summary', dataPoints: DATA_POINTS }` with a
  `summary(date)` recap and **no `dueIn` agenda lane** (it CONSUMES `dueIn` in S4; it is not a daily-agenda
  provider — the gamification/knowledge summary-only precedent). `[code: services/notifications/journal.ts]`
- **BR-NT-S5-2 (summary = unread snapshot)** — `summary(date)` reuses `unreadCounts()` → the
  `{ unread, error, warning, reminder }` badge; `state = 'success'` iff `unread > 0`, else `'empty'`; a no-data
  day returns a well-formed `empty` SectionData, never a throw. `date` is accepted for the contract; a per-day
  "received on `date`" delta is a documented refinement (the gamification snapshot precedent). `[code: journal.ts summary]`
- **BR-NT-S5-3 (TerminalState by type)** — `state` reuses the `@vida/core` `TerminalState` canon BY TYPE
  (`'success'`/`'empty'`), not `deriveTerminalState`. `[code: journal.ts; foundation/capability/types]`
- **BR-NT-S5-4 (retention purge / NF-13)** — `purgeExpired(before)` hard-deletes LONG-ARCHIVED rows
  (`is_archived = true AND archived_at ≤ before`) via `repo.hardDelete` (snapshots + enqueues a `'delete'` sync
  op → the purge syncs cross-device); returns the count reclaimed. A NULL `archived_at` (active row) never
  matches `lte`; an active row is never purged regardless of age. `[code: service.ts purgeExpired; repository.ts:467-481]`
- **BR-NT-S5-5 (NF-10 dangling-subject survives)** — a notification whose `entity_type`/`entity_id` points at a
  deleted subject still lists and reads at ① (no FK, reads never join); `action_url` resolution is the ②
  concern. `[code: service.ts list/toView never join; business-rules.md:46,68-69]`
- **BR-NT-S5-6 (① COMPLETE)** — the barrel exports `createNotificationsJournalContribution` +
  `registerNotificationsJournal` alongside the service + `registerNotificationsEffects`; all 5 slices shipped.
  `[code: services/notifications/index.ts]`

## Deferred (homed to later milestones — not this module's ①)

- **NF-15 (digest/batching)** → M2 (realtime per-notification at M1). Real OS/wake/email reach → M2.
- `action_url` "no longer available" RESOLUTION UI → **② `fe-notifications` (LIF-192)**.
- Per-day "received on `date`" journal delta + TZ → refinement (snapshot at M1). `[E]` encryption → M3.
- Time-path per-module push gating (a `source_module → entity_type` map) → M2 (see current-spec M2 forward-note).
