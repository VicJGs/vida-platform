<!-- Interpretation layer — mod-notifications ① backend (#53, LIF-132) · Entity Delivery Flow v1 Step 1 ·
     sources: docs/features/notifications/{identity,contract,business-rules,structure-data,conventions}.md ·
     built seams verified in @vida/core @ main 220ebb7 · ADR-013 · ADR-012 §3.1 · ADR-004 §3.2.5 -->

# Interpretation — mod-notifications ① backend (`createNotificationsService`)

> Purpose: make the implicit explicit before decomposing (No-Guessing). Every claim is `[FACT: path:line]`,
> `[INTERP]` (my reading of two+ facts — must be ratified at the Decomposition Gate), or `[UNKNOWN]`.
> **What #53 is:** the Notifications _module_ service tier — the ADR-013 user-facing dispatcher/surface over
> the DB-4 `notifications` table, composing the already-built `foundation/notifications` _delivery engine_
> (#46). It is the terminal **pure sink** (in-degree = everything, out-degree 0). `[FACT: identity.md:6-8]`
> It is **not** a second delivery engine and invents no event bus. `[FACT: identity.md:41-42]`

## A. DEPENDENCIES (what this module composes — reads via seams, never direct tables)

### A1. The delivery engine — `foundation/notifications` (BUILT #46, deny-safe at M1)

- `createNotificationDeliveryEngine(ports?): NotificationDeliveryEngine` — factory-of-closures.
  `[FACT: foundation/notifications/service.ts:28-30]`
- Returns `{ deliver, scheduleLocal, cancelLocal, setDeliveryMode }`. `[FACT: service.ts:103]`
  - `deliver(decision: DeliveryDecision): Promise<DeliveryResult>` — executes an **already-gated** decision;
    in-app always succeeds, push/email route via deny-safe ports (M1 → not-delivered → fold to in-app
    fallback), promise never rejects. `[FACT: service.ts:39-72]`
  - `scheduleLocal(occ, quietHours): Promise<ScheduleResult>` — bakes quiet-hours then registers an OS alert
    (deny-safe M1 → `scheduled:false`). `[FACT: service.ts:74-92]`
  - `cancelLocal(id)` / `setDeliveryMode(mode)`. `[FACT: service.ts:94-101]`
- Pure decision helpers (the module calls these to BUILD a `DeliveryDecision`):
  `selectTier(nature, platform)` `[FACT: tiers.ts:35]` · `channelsFor(tier, mode)` `[FACT: tiers.ts:47]` ·
  `buildWakePayload(routing)` (runtime-refuses non-content-free keys → `PayloadNotContentFree`)
  `[FACT: payload.ts:22-35]` · `bakeQuietHours` / `reschedulePlan` / `dedupKey` / `shouldMaterialize`
  `[FACT: scheduling.ts:32,47,63,72]`.
- `DeliveryDecision = { tier, channels: DeliveryChannel[], mode, key, routing? }`. `[FACT: types.ts:168-178]`
- `DeliveryResult = { inApp: true, delivered: DeliveryChannel[], fallbacks: DeliveryChannel[] }`.
  `[FACT: types.ts:180-185]`
- **Ports are deny-safe/fail-closed at M1; M2 wires real reach (Expo/Tauri scheduler · Hono wake-relay · Web
  Push · email) with NO signature change (IR-7).** `[FACT: ports.ts:13-24; types.ts:200-203; docs/core/notifications-delivery/current-business-rules.md:31 (BR-ND-11)]`

### A2. The effect rail — `foundation/effects` (BUILT; the EVENT path)

- `createEffectRegistry(): EffectRegistry` with `register(effectType, handler)` (throws `DuplicateEffectHandler`)
  - `resolve(effectType)`. `[FACT: foundation/effects/registry.ts:12-30]`
- `EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>` — the handler receives the ACTIVE
  transaction and MUST co-write through it (ADR-004 §3.2.5 same-tx); never opens its own transaction.
  `[FACT: foundation/effects/types.ts:53]`
- `surface_notification` IS present in `EFFECT_CLASS_OF` as **`'additive'`**. `[FACT: foundation/effects/types.ts:29]`
- `deriveEffectEventId(subjectNaturalKey, transition, effectType): string` → `"${k}|${t}|${type}"`,
  deterministic/device-stable. `[FACT: foundation/effects/event-id.ts:20-26]`
- `EffectEvent = { subjectNaturalKey, transition, effectType, targetRef, payload? }`. `[FACT: types.ts:37-43]`
- `[INTERP → RESOLVED at Decomposition, g1 B2]` The `surface_notification` handler is a tx-aware EVENT entry
  `applyNotificationEffect(event, tx)` (distinct from the public time-entry `fire`): it reads `[E]` title/message
  from `event.payload`, derives `effect_event_id` from the event triple, and persists via `repo.createInTx(tx, …)`
  in the rail's transaction → idempotent per the UNIQUE `effect_event_id` (NF-8). Both entries share ONE persist
  closure, differing only in the write primitive (create vs createInTx). `[FACT: effects/types.ts:53 handler=(event,tx);
contract.md:11-12; conventions.md:18; schema UNIQUE]`

### A3. Sessions & Scheduling — the `dueIn(range)` aggregator (the TIME path backbone)

- **The correct seam is `SessionsService.dueIn(range: TimeRange): Promise<DueItem[]>`** — the S7 "shared
  platform primitive" cross-module aggregator. `[FACT: services/sessions/service.ts:163,689; types.ts:216]`
- `DueItem = { source_module, ref_id, label, est_minutes, urgency, hard_deadline? }`. `[FACT: sessions/types.ts]`
- `TimeRange = { start: number, end: number }` (Unix ms, inclusive). `[FACT: sessions/types.ts]`
- Providers feed the aggregator via a `DueProvider = { module, fetch(range) }` seam, registered by **owning
  modules** — "live dueIn provider lanes → owning modules". `[FACT: sessions/service.ts:33; types.ts DueProvider]`
- `[INTERP]` At M1 the aggregator is built but most provider lanes are dormant → `dueIn` returns a sparse/empty
  list. The dispatcher's LOGIC is the deliverable; its FEED grows as owning modules register lanes. Do NOT
  make the dispatcher depend on any specific provider being live. `[FACT: service.ts:33 "dormant" seam]`
- ⚠ **Disambiguation (3 distinct `dueIn`s — do not conflate):** (1) `foundation/review/engine.ts:253`
  `dueIn(objectId, at?)→boolean` (spaced-repetition — NOT this); (2) the Sessions aggregator above (THIS);
  (3) `services/journals/types.ts:63` `dueIn?(range)→SectionData` (a JournalContribution agenda lane — a
  render seam, different return). `[FACT: all three cited]`

### A4. Preferences — the gating config (NF-4/NF-5; the module only READS)

- `createPreferencesService(...)` → `PreferencesService`. `[FACT: services/preferences/service.ts:208,229]`
- `MergedPreferences` already exposes every gate input: `notification_{email,push,in_app}`,
  `quiet_hours_{enabled,start,end}`, `notification_frequency`, `push_{habits,tasks,routines,contacts,study}`.
  `[FACT: services/preferences/service.ts:74-86,135-146]`
- `[INTERP]` The module reads merged prefs to GATE each fire (channel on? per-module toggle on? inside quiet
  hours?) and builds the `DeliveryDecision.channels`/`mode` the engine consumes. Suppression ≠ loss: in-app is
  always recorded. `[FACT: NF-4/NF-5 business-rules:24-30; identity.md:28-29]`

### A5. The repository + schema — `notifications` (BUILT at DB-4; the ONLY table this module writes)

- `createRepository(db, notifications, { deviceId, encryptedFields, softDelete? })`; methods
  `create/createInTx/findById/findAll/findWhere/update/delete/hardDelete/count`. `[FACT: db/repository.ts:236; RepositoryConfig:176-183]`
- Table columns (all present): `id · type CHECK{info,success,warning,error,reminder,achievement} · title[E] ·
message[E] · action_url · action_label[E] · entity_type · entity_id · is_read · read_at · is_archived ·
archived_at · expires_at · delivered_in_app · delivered_push · delivered_email · metadata[E] ·
effect_event_id (UNIQUE, nullable) · created_at · _sync_*`. `[FACT: db/schema/notifications.ts]`
- Indices: UNIQUE(`effect_event_id`); partial `idx_notifications_unread(is_read) WHERE is_archived=0`
  (SQL-migration-only). **NO `updated_at`, NO `deleted_at`** (lifecycle = read→archive→expire→purge, NF-13).
  `[FACT: db/schema/notifications.ts]`
- `@vida/types`: `NOTIFICATION_TYPE` (6 values) + `Notification` interface (no `delivered_*`/`metadata`/
  `effect_event_id` yet → a DB-11 interface reconcile is owed). `[FACT: packages/types/src/common.ts:80-108]`

## B. NEEDS (what the module must own / produce — the surface, per contract.md)

1. **`fire(notification)`** — the single write path + the `surface_notification` rail handler (A2). `[FACT: contract.md:11-12]`
2. **Inbox reads** — `list({status,type,page})` · `unreadCounts()` (derived badge) · `markRead`/`markAllRead`
   · `archive`/`archiveExpired`. `[FACT: contract.md:14; NF-13]`
3. **Dispatcher `tick()`** (headless, on-device) — read Sessions `dueIn(range)` → gate vs Preferences →
   `shouldMaterialize(at, now)` → `fire` → `deliver`/`scheduleLocal`. Derive upcoming, store fired (NF-3).
   `[FACT: contract.md:16; NF-2/NF-3]`
4. **`deliver(row)`** — build the gated `DeliveryDecision`, call `engine.deliver`, persist the delivery-audit
   (`delivered_in_app/push/email`) from the `DeliveryResult`. `[FACT: contract.md:18; NF-8 delivery-audit]`
5. **Typed errors** — `ChannelDisabled · QuietHours · DeliveryFailed · SignalUnavailable · DuplicateFire ·
DanglingSubject`. `[FACT: contract.md:35-42]` `[INTERP]` Several are non-throwing outcomes recorded on the
   row (suppression ≠ exception); DuplicateFire = idempotent no-op; the exact throw-vs-record split is a
   per-slice decision grounded in business-rules "failure is loud" (§84-88).
6. **Registration** — `registerNotificationsEffects(registry, …)` (the rail handler) and `[INTERP]` optionally
   a Journal contribution that _renders_ an inbox summary (Journals may render, no write dep — identity.md:32).

## C. ORGANIZATION (where code lands — follows the built MOD pattern)

- Service home: `packages/core/src/services/notifications/` (currently directory-only: `CLAUDE.md` says
  "SURFACE … rides foundation/notifications; does not re-implement"). `[FACT: services/notifications/CLAUDE.md]`
- Pattern precedent (verified): `createGamificationService(deps)` factory-of-closures; composes
  `createRepository`; `registerGamificationEffects(registry, …)` + `registerGamificationJournal(registry, svc)`.
  `[FACT: services/gamification/service.ts:94-100; journal.ts:66-74]`
- Factory-service rule: object-literal of closures, NO `this` for intra-calls; validating methods async.
  `[FACT: MOD-notes ① post-impl BLOCKER; factory-service convention]`
- Currency home: `docs/modules/notifications/current-{spec,business-rules}.md` (born at Step 7 D6).

## D. IMPLICIT RULES (the non-obvious invariants that would surface as runtime bugs, not review comments)

- **D1 — `fire` co-writes in the rail tx.** As the `surface_notification` handler, `fire` must use
  `repo.createInTx(tx, …)`, NOT `repo.create` — else it writes outside the rail's atomic boundary (ADR-004
  §3.2.5). The time-path `fire` (no rail tx) uses `repo.create`. `[FACT: effects/types.ts:53; identity.md:14]`
  `[INTERP]` → two entry shapes into one persist helper; ratify at Decomposition.
- **D2 — Occurrence-id keying for the time path (RESOLVED, g1 B3).** `DueItem` carries `ref_id` + an optional
  `hard_deadline`, NOT an `occurrenceId` (sessions/types.ts:225-232). The ONLY device-stable instant it supplies
  is `hard_deadline` (UTC ms). So the dispatcher fires **only time-pinned items**: `occurrenceId =
${source_module}:${ref_id}:${hard_deadline}` → `dedupKey({kind:'due', occurrenceId})`; an item without a
  `hard_deadline` has no stable fire instant → **skipped** (un-pinned due-work is agenda/Journals, not an alarm).
  No local-date math (the rejected `todayDateKey` would TZ-double-fire). `[FACT: sessions/types.ts:225-232;
scheduling.ts:63; NF-8]`
- **D3 — M1 is content-blind end-to-end.** Deny-safe ports mean push/email always fold to in-app at M1; the
  dispatcher feed is sparse (dormant lanes). Build the full logic; assert nothing about external delivery
  SUCCEEDING at M1. `[FACT: ports.ts deny-safe; service.ts:33]`
- **D4 — No new schema, no new migration.** Every AMENDMENT (delivery-audit, `metadata[E]`) already shipped at
  DB-4; this is a pure service-tier build. A DB-11 `@vida/types Notification` reconcile (add `delivered_*`/
  `metadata`/`effect_event_id`) is owed but is an interface edit, not a migration. `[FACT: schema vs common.ts:90-108]`
- **D5 — `[E]`/plaintext split + `encryptedFields`.** `title`/`message`/`action_label`/`metadata` are `[E]`;
  everything structural is plaintext. `[INTERP]` Per the M1.0 seam, the repo is built with `encryptedFields:
[]` (dormant seam; `getVaultKey` throws vault-locked) until the encryption pass — the `[E]` set is the
  future boundary, not the M1 runtime set. `[FACT: m10-repos-use-empty-encryptedfields-seam precedent; conventions.md:22-25]`
- **D6 — Never put content or entity refs on the wire.** The wake payload is routing-only; `buildWakePayload`
  runtime-refuses forbidden keys. The module must pass ONLY `RoutingMeta`, never `title`/`entity_*`.
  `[FACT: payload.ts:22-35; NF-6; conventions.md:13-15]`
- **D7 — Dangling subject survives.** A deleted `entity_id` leaves the row intact; `action_url` resolves to
  "no longer available", never a crash (read-side concern, mostly ②). `[FACT: NF-10; business-rules:68-69]`

## E. M1 vs M2 boundary (what ships now vs stays a deny-safe seam)

| Concern                                   | M1 (this build)                      | M2 / later                                  |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------- |
| `notifications` table + inbox reads       | ✅ full                              | —                                           |
| `fire` + rail handler (event path)        | ✅ full (idempotent)                 | —                                           |
| Dispatcher `tick()` logic                 | ✅ full                              | feed grows as provider lanes register       |
| Preferences gating (channel/quiet/toggle) | ✅ full (real `MergedPreferences`)   | `notification_frequency` digest = INTENDED  |
| `deliver` + delivery-audit persistence    | ✅ full                              | —                                           |
| External reach (push/email/OS scheduler)  | deny-safe port no-op (in-app always) | real reach (Expo/Tauri/Hono/Web-Push/email) |
| Encryption of `[E]` fields                | `encryptedFields: []` dormant seam   | encryption pass (M3)                        |
| Digest/batching (NF-15)                   | ❌ realtime-per-notification         | INTENDED                                    |

## F. Open questions for the Decomposition Gate (Approval 1)

- **OQ-1** D2 occurrence-id derivation for the time path — exact key formula. `[INTERP → decide]`
- **OQ-2** The throw-vs-record split for the 6 typed errors (D5 of NEEDS). `[INTERP → decide]`
- **OQ-3** Is a Journal contribution (inbox summary render) in ① scope now, or deferred to ②/Journals?
  identity.md:32 says "Journals may render … no write dependency" → `[INTERP]` lean: a thin `register…Journal`
  summary contribution is in-scope (the gamification precedent), inbox render is ②.
- **OQ-4** DB-11 `@vida/types Notification` reconcile — fold into S1 or note as carry-forward. `[INTERP → fold]`
