# Task: mod-notifications
# Status: in-progress
# Linear: LIF-132
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V `#53`, LIF-132; ADR-016 model)

## Goal
Notifications — the Notifications module ① backend service tier (`createNotificationsService`) over the
DB-4 `notifications` table: the ADR-013 user-facing notification MODULE (the dispatcher/surface) that
composes the already-built `foundation/notifications` delivery engine (`xs-notifications-delivery` #46,
pure routing/quiet-hours/dedup tier) and the AR-7 effect rail (`xs-effect-rail`), turning module effect
signals into materialized, scheduled, deliverable notifications. Entity Delivery Flow (v1): front matter
(interpretation + decomposition) → per-slice service track.

## Dependencies
- blocked by `mod-sessions` ✅ Done
- blocked by `xs-effect-rail` ✅ Done
- blocked by `xs-notifications-delivery` ✅ Done
(all blockers Done — #53 READY)

## Build Steps (Entity Delivery Flow — Default scenario)
- [x] Step 0: document-context BASELINE — aspect corpus read (intent authority) + built seams verified in
      @vida/core (delivery engine #46 · effect rail · Sessions `dueIn(range)` aggregator · Preferences gating
      · `notifications` table incl. delivery-audit/metadata/effect_event_id · repository · MOD pattern). Explore
      agent mapped exact signatures; I disambiguated the 3 distinct `dueIn`s by FACT.
- [x] Step 1: Interpretation layer — `docs/features/notifications/delivery/interpretation.md` written
      (A deps · B needs · C org · D implicit rules · E M1/M2 boundary · F 4 open questions), each `[FACT: path:line]`
- [x] Step 1.5: Envision Gate — N/A stated (pure-backend; no user-facing surface — EDF §3.75)
- [x] Step 2: Decomposition Gate — slice-map (5 slices) + seam-contract + interpretation; g1 critic REVISE→4
      blockers+2 nits folded → **Approval 1 GRANTED (2026-10-05)**.

### Slices (per-slice §XXVI double-gate + live-store Verification Gate + code-review + currency)
- [x] **S1** — scaffold + inbox reads + lifecycle + DB-11 `@vida/types` reconcile. `createNotificationsService`
      ({db,deviceId}) + `list`/`unreadCounts`/`markRead`/`markAllRead`/`archive`/`archiveExpired` + `toView` +
      `NotificationNotFoundError`; DB-11 reconcile (`delivered_*`/`metadata`/`effect_event_id` on `@vida/types
      Notification`). Repo `encryptedFields:[]`/`softDelete:false`. g1 critic (decomposition) SHIP→Approval 1;
      independent g2 code-review SHIP (2 nits folded: dropped unneeded `type` cast · fixed seam-contract
      NotificationView drift); pre-ship /critique SHIP. tsc 0 · eslint 0 · **12/12 S1 live-store** · full
      @vida/core **1545/1545**. Currency `docs/modules/notifications/current-*` (BR-NT-S1-1..10). Caught+fixed
      1 ISOLATED bug: a `*/` inside a JSDoc (`delivered_*/metadata`) closed the comment early.
- [x] **S2** — Preferences gating + `DeliveryDecision` builder + `deliver` + delivery-audit. `deliver(id,ctx?)`
      composes the BUILT engine (deps += `engine` required, `preferences?` deny-safe); `gateChannels` (in-app
      never gated NF-7 · push by global+per-module+quiet · email by global+quiet); `PUSH_TOGGLE_BY_ENTITY`
      (keys verified vs ENTITY_TYPES); quiet-hours `'HH:MM'`→min, caller-`nowMinuteOfDay`; routing caller-
      supplied → absent at M1 ⇒ external folds to in-app (content-blind, NF-6); delivery-audit persisted.
      g2 code-review REVISE→SHIP (1 blocker: stale entity_type keys `routine_action`/`course`/`study_topic`/
      `language` → real `routine_step`/`subject`/`knowledge_object`; +regression test) + 1 nit folded; pre-ship
      /critique SHIP. tsc 0 · eslint 0 · **21/21 notifications** · full @vida/core **1553/1553**. Currency
      BR-NT-S2-1..8.
- [ ] **S3** — `fire` single write path + `applyNotificationEffect` rail handler + idempotency
- [ ] **S4** — dispatcher `tick()` + time path (hard_deadline-pinned, materialize-at-fire)
- [ ] **S5** — Journal summary contribution + close-out (purge · dangling-subject · currency) → ① COMPLETE

### Per-slice closing steps (each slice)
- [ ] Step 3: read 3 existing MOD services → state the pattern
- [ ] Step 4: /api-contract (service surface) → approved before code
- [ ] Step 5–6: /adr-check approach → /adr-new if a significant choice
- [ ] Step 7: implement (types → service logic → barrel → §XXIX current-*) + D6 birth CURRENT- docs
- [ ] Step 8: tsc --noEmit = 0
- [ ] Step 9: BLOCKING Verification Gate — functional tests + live-store smoke (real data store)
- [ ] Step 10: code-review → /critique SHIP
- [ ] Step 11: Currency Rule (§XXIX) — current-* refreshed, committed WITH code

## Open Questions
- [to be filled as they arise during Interpretation / Decomposition]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## On Failure
1. Always invoke victor:triage first — classify before any fix attempt
2. Check .claude/knowledge/failure-patterns/known-failures.md for this exact error
3. If not documented: solve it, then document per _template.md — before /session-end

## Route History
- 2026-10-05: activated (was backend-replan P5 `planned` stub) via /begin → next `#`-order head #53
  (advisory `--next` differs — routes to a frontend surface; the `#` order wins per this repo's routing
  rule). Scenario = Default (Entity Delivery Flow v1). Fresh branch `mod-notifications` off main @ 220ebb7,
  isolated worktree `.claude/worktrees/mod-notifications` (parallel frontend session live → isolation).
  Starting at Step 0 (BASELINE documentation). LIF-132 already exists in Linear (P5 reshape) — no issue
  create; tracker `--sync` deferred to a MAIN-checkout run (worktree map is gitignored/absent). Corrected
  the stub's stale `# Source:` cross-ref (LIF-110 → LIF-132 / `#53`).
- 2026-10-05: front matter complete (Steps 0–2). BASELINE + interpretation.md + slice-map.md (5 slices) +
  seam-contract.md. **g1 /critique = independent critic → REVISE** (4 blockers + 2 nits, all grounded, all
  folded): B1 JournalContribution needs required `dataPoints`; B2 `registerNotificationsEffects` handler must be
  tx-aware (resolved D1 → event entry `applyNotificationEffect(event, tx)` via `createInTx`, distinct from public
  `fire`); B3 OQ-1 invented `todayDateKey` + TZ double-fire → fire ONLY `hard_deadline`-pinned items
  (`occurrenceId=module:ref:hard_deadline`, skip un-pinned); B4 `shouldMaterialize` `at`=hard_deadline; N1
  `DeliveryDecision.key` via `dedupKey`; N2 citation path. Front matter g1-clean → **awaiting Approval 1**.
- 2026-10-05: **Approval 1 GRANTED** → S1 shipped. Front matter committed, then S1 (scaffold + inbox reads +
  lifecycle + DB-11). Full per-slice Entity Delivery Flow: api-contract RATIFY + adr-check none → implement →
  tsc 0/eslint 0/12-live-store/1545-full → independent g2 code-review SHIP (2 nits folded) → pre-ship /critique
  SHIP → §XXIX currency born (BR-NT-S1-1..10). 1 ISOLATED bug caught+fixed (JSDoc `*/` early-close). **Next: S2
  — Preferences gating + DeliveryDecision builder + deliver + delivery-audit** (adds `engine` + `preferences?`
  deps). Branch `mod-notifications`; per-slice cadence; PR when ① (all 5 slices) complete.
- 2026-10-05: **S2 shipped** — Preferences gating + `deliver` + delivery-audit. Composes the BUILT delivery
  engine (#46). Surfaced + corrected a real M1 insight: push needs an ADR-003 routing `userId` absent at M1 →
  external honestly folds to in-app (content-blind, NF-6); `routing` is caller-supplied (M2). g2 code-review
  caught 1 blocker (stale guessed entity_type keys in the push-toggle map — grep-the-registry lesson
  [[db4-types-may-be-colocated-grep-name-before-net-new]]); fixed + regression test. tsc 0 · eslint 0 · 21/21 ·
  full 1553/1553. Currency BR-NT-S2-1..8. 1 ISOLATED test-helper bug fixed (toEqual on full row). **Next: S3 —
  `fire` single write path + `applyNotificationEffect(event, tx)` rail handler + idempotency** (registers the
  `surface_notification` Additive handler).

## Notes
- Env: Node 24 via nvm (a stray non-24 `pnpm test` recompiles better-sqlite3 to the wrong ABI → rebuild for
  Node 24: `cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release`).
- Per-slice cadence; open the PR (mod-notifications → main) when ① (all slices) completes.
- PR #77 (mod-learning-education ①) remains OPEN + CONFLICTING on its own branch — a separate close-out
  thread, not a blocker for #53 (its blockers are all already on main).
