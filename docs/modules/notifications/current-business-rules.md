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

## Deferred to later slices (the rule exists in the corpus; not yet enforced in code)

- **NF-2/NF-8 (single write path + idempotent)** — `fire` + the `surface_notification` rail handler → **S3**.
- **NF-3 (derive-until-fire, no phantom inbox) + occurrence keying** — the dispatcher `tick()` → **S4**
  (fires only `hard_deadline`-pinned `DueItem`s; `occurrenceId = module:ref:hard_deadline`).
- **NF-10 (dangling subject survives) + retention purge** → **S5**.
- **NF-14 (achievement from Gamification, recorded not evaluated)** — via the rail handler → **S3**.
- **NF-15 (digest/batching)** → M2 (realtime at M1).
