<!-- Entity Delivery Flow ② · Step 1 — Interpretation layer · fe-notifications (LIF-192) · M1.2.2 -->

# fe-notifications ② — Interpretation Layer

> Make the implicit explicit before decomposing. Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or
> `[UNKNOWN]` (No-Guessing, §XXVI). The ① backend (`mod-notifications` #53, LIF-132) is COMPLETE and unchanged;
> this is the pure UI/UX tier over it. Worktree `.claude/worktrees/fe-notifications` off `origin/main` @ `5ef0ce7`.

## 0. Scope (doc-authoritative — corrects the task-header summary)

The gated P6 decomposition homes **exactly two legs** to `fe-notifications`:

- **NOT-24 — Inbox UI.** Grouped read/unread list, status/type filters, pagination; states: loading skeleton ·
  empty "you're all caught up" · read-error → cached + retry. UI face of `list()`. `[FACT: parts/notifications.md:36]`
- **NOT-25 — Dangling-subject UI state.** `action_url` resolves to a "no longer available" state instead of
  navigating to a deleted subject; never a crash. UI face of NF-10. `[FACT: parts/notifications.md:37]`

`[FACT: decomposition-p6.md:27 "fe-notifications | 2 | NOT-24, NOT-25"; traceability-p6.md:147-148]`

**Out of scope — "channel-matrix controls" is drift.** The task-header reshape line names it, but it is **not a
traced leg** for fe-notifications, and it is **not** in `fe-settings`' control set (theme·motion·density·arrangement·
sync-vis·Atlas·rename) `[FACT: .claude/tasks/fe-settings.md:9]`. Channel toggles are a Preferences-config concern
the service only *reads* (`gateChannels`) `[FACT: services/notifications/service.ts:284-310]`. Per the "gated
decomposition outranks a reshape summary" discipline, it is excluded here. No Preferences **writes** in this unit →
zero overlap with the live `fe-settings` session.

## 1. DEPENDENCIES — what the UI stands on

- **`NotificationsService` (@vida/core) — consumed as TYPE + convention, NOT live.** Read surface:
  `list({status,type,page})` · `unreadCounts()`; lifecycle writes: `markRead(id)` · `markAllRead()` · `archive(id)`.
  `[FACT: services/notifications/service.ts:468-480 (exports); types.ts:118-152 (NotificationsService)]`
  - **No live apps/web service composition root exists yet.** The first ② surface (notes) ships every data hook
    **M1-default empty** with a `?sample` DEV param; a live `Service.method()` call would throw on the worker-RPC
    Drizzle `values` seam today. `[FACT: apps/web/src/notes/use-notes-rows.ts:6,48; use-note-entity.ts:4,125;
    [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]]` → fe-notifications inherits this convention
    (honest-empty default + `?sample`; live swap documented + deferred to the composition root).
- **`NotificationView` = `@vida/types` `Notification`.** The read row shape the UI renders: `type` (6-enum),
  `title`, `message`, `action_url`, `action_label`, `entity_type`, `entity_id`, `is_read`, `read_at`,
  `is_archived`, `archived_at`, `expires_at`, `delivered_*`, `metadata`, `effect_event_id`, `created_at`.
  `[FACT: services/notifications/service.ts:169-191 toView; types.ts:69 "NotificationView = Notification"]`
- **6 notification types** drive severity/visual distinction: `[FACT: @vida/types common.ts:80 NOTIFICATION_TYPE]`
  (enumerated at build in the greybox — error/warning/reminder/success/info/…).
- **`UnreadCounts`** = `{ unread, error, warning, reminder }` — the derived badge, no stored counter (NF-13).
  `[FACT: services/notifications/types.ts:59-64; service.ts:218-228]`
- **Shell placement is doc-fixed.** A global `/notifications` route + a "Notifications" nav link (`Bell` icon)
  already ship; the surface mounts INTO them. `hasStandalonePages:false`, `hasMultiModeTopView:false` → a single
  route-level surface, not multi-mode, not a bell-dropdown.
  `[FACT: apps/web/src/nav/module-map.ts:103,118; shell/nav-icons.ts:61; shell/global-surfaces-list.test.tsx:25]`
- **@vida/ui shipped primitives** the surface composes: `EmptyState` (teaching-invitation), `SyncStatus`/
  honest-progress voice, the 8-state machine (`deriveInteractionState`/`collapseToTerminal`), list/data-view
  primitives, `Card`/`Button`/`Tabs` atoms. `[FACT: packages/ui/src/CLAUDE.md; apps/web/src/state-conventions/]`

## 2. NEEDS — what must be built

- **A surface dir `apps/web/src/notifications/`** (mirrors `apps/web/src/notes/`).
- **A `useNotifications` data seam** — M1-default empty + `?sample` DEV populate; returns the inbox rows + the
  derived state + the unread badge. Live React-Query→`service.list()/unreadCounts()` swap documented, deferred
  (first-consumer / ProviderRead convention). `[INTERPRETATION: notes-surface precedent]`
- **The inbox surface component** — bespoke single-surface list (NOT CollectionView: no SavedView/view-config,
  `hasMultiModeTopView:false`): status filter (unread/read/archived) + the 8-state set + newest-first list +
  unread badge + `mark all read` + per-row read/archive actions.
- **A notification-row presentation** — type/severity expression × read-vs-unread treatment × timestamp × title/
  message × optional `action_url` affordance. No shipped renderer matches → the Envision greybox pins it; home
  (@vida/ui primitive vs apps/web composition) decided at Decomposition.
- **NOT-25 dangling-subject state** — when `action_url`'s subject is gone, the row renders a calm "no longer
  available" state instead of a live link; never crashes. (M1: resolution is display-only; the row always lists.)
- **Lifecycle write wiring** — `markRead`/`markAllRead`/`archive` with cache invalidation; writes are
  **deferred-live** behind the same composition-root seam (consistent with reads; stated, not faked).
- **Route wiring** — render the surface at the existing `/notifications` route.

## 3. ORGANIZATION — where it lives

- `apps/web/src/notifications/` — surface + hooks + renderers + `CLAUDE.md` (the notes-surface layout).
- Presentation primitives: reuse shipped @vida/ui; a net-new **notification row** primitive lands in @vida/ui
  ONLY if the greybox shows it is reusable chrome (else composed in apps/web). `[INTERPRETATION: decide at Step 2]`
- Route: wire into `apps/web/src/routes.tsx` `/notifications`.
- No `@vida/core` change. No `@vida/types` change (DB-11 already reconciled `Notification` at ① S1,
  `[FACT: current-business-rules.md:32-34 BR-NT-S1-10]`).

## 4. IMPLICIT RULES — caught here, not in the browser

- **IR-1 — honest-empty by default (no live composition root).** The surface must render correctly with zero
  data and never imply a live backend that isn't wired. `?sample` drives populated states for the Visual Gate.
  `[FACT: notes use-notes-rows.ts:48]`
- **IR-2 — the badge is DERIVED, never stored.** Unread count comes from `unreadCounts()`; the UI holds no
  counter. `[FACT: current-business-rules.md:23-24 BR-NT-S1-6]`
- **IR-3 — in-app is the always-on channel.** This surface IS the in-app inbox; it shows every row regardless of
  external-channel delivery state. Suppression ≠ absence. `[FACT: BR-NT-S2-2 / NF-7]`
- **IR-4 — honest voice, no false states.** No "saving…"/cloud language (M1 is local, no sync); errors use the
  calm privacy voice; dangling subjects degrade gracefully. `[FACT: fe-codec-patterns S4 SyncStatus; NOT-25]`
- **IR-5 — dangling subject never crashes (NOT-25/NF-10).** A deleted `entity_id` → "no longer available",
  the row still lists/reads. `[FACT: BR-NT-S5-5; parts/notifications.md:37]`
- **IR-6 — lifecycle is idempotent + optimistic-safe.** `markRead`/`archive` on an already-read/archived row is a
  no-op at the service; the UI must not double-stamp or desync. `[FACT: BR-NT-S1-4]`
- **IR-7 — read vs unread must be a non-color-only distinction** (AA + §XIV): weight/marker, not hue alone.
  Full-matrix contrast both modes incl. warm reader-dark. `[FACT: DoD §XXII; [[contrast-test-must-be-full-matrix]]]`
- **IR-8 — 6 fixed types, no new type.** The row renders only `NOTIFICATION_TYPE`; an unknown type degrades, not
  invents. `[FACT: BR-NT-S3-7]`

## 5. Open interpretation (resolved — not deferred to the browser)

- **Inbox ≠ Collection.** `hasMultiModeTopView:false` + no SavedView → the inbox does NOT ride CollectionView/
  `useCollection`; it is a bespoke single-surface list over @vida/ui list/state primitives. `[FACT: module-map.ts:103]`
- **Filter model = status (unread/read/archived) + type.** Directly from `InboxQuery`. `[FACT: types.ts:51-56]`
- **Envision FIRES** (§3.75): the notification-row + inbox chrome are affordances with no shipped 1:1 answer →
  greybox + human checkpoints before decomposition.
