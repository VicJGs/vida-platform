---
Session 2 — 2026-10-05
Goal: mod-notifications ① backend (#53, LIF-132) — createNotificationsService over DB-4 notifications
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
---

## Accomplished
- **Front matter (Approval 1):** BASELINE (aspect corpus + built-seam verification; disambiguated the 3 `dueIn`s)
  → `delivery/interpretation.md` → 5-slice `delivery/slice-map.md` + `delivery/seam-contract.md`. Independent g1
  critic REVISE → 4 blockers + 2 nits folded → Approval 1. Commit `ed01089`.
- **S1 (`4bd3554`)** — `createNotificationsService({db,deviceId})` + inbox reads (`list`/`unreadCounts`/`markRead`/
  `markAllRead`/`archive`/`archiveExpired`) + lifecycle (NF-13) + DB-11 `@vida/types Notification` reconcile
  (`delivered_*`/`metadata`/`effect_event_id`). g2 SHIP. BR-NT-S1-1..10.
- **S2 (`cc6963c`)** — Preferences gating + `DeliveryDecision` builder + `deliver` + delivery-audit. Deps +=
  `engine` (required) + `preferences?` (deny-safe/fail-OPEN). g2 REVISE→SHIP (stale entity_type keys fixed).
  BR-NT-S2-1..8.
- **S3 (`7f12b1f`)** — `fire` (public time path) + `applyNotificationEffect` (the `surface_notification` Additive
  rail handler) + `registerNotificationsEffects` + idempotency. PURE SINK (NF-1): handler never throws; added an
  in-tx convergence guard. g2 SHIP. BR-NT-S3-1..8.
- Green throughout: tsc 0 · eslint 0 · **28/28 notifications live-store** · full @vida/core **1560/1560**.

## Decisions Made
- Module owns NF-5 gating; the built engine routes an already-gated decision.
- M1 external delivery folds to in-app (no ADR-003 routing userId until M2) — content-blind, honest.
- Dispatcher (S4) fires only `hard_deadline`-pinned DueItems (rejected an invented `todayDateKey` → TZ double-fire).
- The event handler is a pure sink that NEVER throws into the rail (unlike economy) — malformed skipped +
  effect_event_id convergence pre-check (closes the narrower-UNIQUE-vs-composite-ledger hole).
- `PUSH_TOGGLE_BY_ENTITY` keys verified vs ENTITY_TYPES (grep-the-registry; g2 caught stale guesses).
- The 6 contract errors = a record-not-throw outcome vocabulary.

## Open Questions
- S4 feed sparsity: the Sessions `dueIn(range)` aggregator is built but provider lanes are dormant at M1 — the
  dispatcher LOGIC is the deliverable; the feed grows as owning modules register lanes. Don't depend on any lane.
- (Upstream, noted not-owned) the notifications `UNIQUE(effect_event_id)` is id-only vs the rail ledger's
  composite — hardened in-app via the S3 convergence guard; a schema widen is an M2/upstream call if producers
  ever need per-targetRef distinct notifications from one effect triple.

## Next Session
First step: **S4 — dispatcher `tick()` + time-driven path.** FRESH `/begin` → resume IN THIS worktree
(`.claude/worktrees/mod-notifications`), branch `mod-notifications`. Read `delivery/slice-map.md` S4 + S4 row of
`seam-contract.md` + `docs/modules/notifications/current-*`. Compose: Sessions `dueIn(range): Promise<DueItem[]>`
(`services/sessions/service.ts:163`) + engine `shouldMaterialize`/`scheduleLocal`/`bakeQuietHours`/`dedupKey` +
S3 `fire` + S2 `deliver`. OQ-1 resolved: fire only `hard_deadline`-pinned items, `occurrenceId =
${source_module}:${ref_id}:${hard_deadline}`, `at = hard_deadline`; skip un-pinned; `SignalUnavailable` =
skip+flag (failure-isolated per item). Adds the `sessions` dep (required from S4). Then S5 (Journal summary +
purge + dangling-subject) → ① COMPLETE → open PR mod-notifications → main.
Env: Node 24 via nvm; worktree deps installed + @vida/types built. Per-slice cadence; PR when all 5 slices done.
Context to reload: `.claude/tasks/mod-notifications.md` (Route History + Build Steps) · `docs/features/
notifications/delivery/{slice-map,seam-contract,interpretation}.md` · `docs/modules/notifications/current-*`.
