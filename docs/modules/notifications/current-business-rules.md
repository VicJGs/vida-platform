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

## Deferred to later slices (the rule exists in the corpus; not yet enforced in code)

- **NF-2/NF-8 (single write path + idempotent)** — `fire` + the `surface_notification` rail handler → **S3**.
- **NF-4/NF-5/NF-6/NF-7 (gate before deliver · ZK channel fidelity · in-app always)** → **S2**.
- **NF-3 (derive-until-fire, no phantom inbox) + occurrence keying** — the dispatcher `tick()` → **S4**
  (fires only `hard_deadline`-pinned `DueItem`s; `occurrenceId = module:ref:hard_deadline`).
- **NF-10 (dangling subject survives) + retention purge** → **S5**.
- **NF-14 (achievement from Gamification, recorded not evaluated)** — via the rail handler → **S3**.
- **NF-15 (digest/batching)** → M2 (realtime at M1).
