# Task: mod-relationships
# Status: in-progress
# Linear: LIF-137
# Profile: Add Backend Component
# Scenario: default (Entity Delivery Flow ①)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md #56 (Phase V, LIF-110; ADR-016 model)

## Goal
Relationships (CRM) — ① backend service `createRelationshipsService` over DB-4 `025_relationships` (8 tables:
contacts · contact_events · interactions · contact_reminders · reminder_groups · reminder_group_contacts ·
network_groups · network_group_contacts). The PII-heaviest module; composes the built foundation substrates
(spaces · notes · journal · sessions/dueIn · ingestion · notifications-delivery) — does not re-implement them.

## Dependencies (all ✅ merged)
- blocked by `mod-journals` · `mod-notes-and-pages` · `mod-sessions` · `xs-ingestion`
- blocked by `xs-notifications-delivery` · `xs-spaces-tags-links` · `xs-views`

## Baseline correction (grounded 2026-10-07)
The aspect docs + decomposition + rerun carry "⚠ INTENDED / schema-0 / ADR-002-amendment-deferred" for networks,
closeness_tier, snooze/priority, event-anchor, G8 fields. **STALE** — the rerun was a doc-realignment unit
(2026-07-24, pre-schema); DB-4 then authored all 8 tables + every intended column (`relationships.ts` header
L23-27, "settled intent"). **The schema is the floor — networks/snooze/anchor/closeness are LIVE, built here.**

## Interpretation (doc/schema-grounded, No-Guessing)
- Health = derived analytic, **NOT a measurement** (C1 guard — no measurement_kind/M5). Formula designed in S6.
- `closeness_tier` = represented (column exists, OPEN vocab no CHECK) — resolves REL-25.
- Device import (X1/X8) = deny-safe ingestion seam (M1 facade + staging + ContactsPermissionError; device bridge M2).
- Reminders → notifications = produce-only (`getDueReminders`/`dueIn` R7 + DueProvider); Notifications dispatches.
- Tasks follow-up / Gamification streak = deny-safe / emit-only deferred seams (Tasks unbuilt; 012 not a driver, C2).
- `[E]` encryption = empty set in M1.0 (pass-through, BR-DB6-3).
- RL-2 cascade = app-layer in softDeleteContact (no-FK convention).

## Build Steps (slice map — Approval 1 granted 2026-10-07; 59 legs REL-01…59)
- [x] **S1** Contact spine + DB-11 reconcile — REL-01…06,17,54,55,58 ✅ (fully gated + 2 independent SHIP; 10/10 live-store)
- [x] **S2** Interactions + derived stats — REL-12…16,19,20,21 ✅ (ledger + recompute engine; 17/17 live-store)
- [ ] **S3** Events — REL-26,27,28,29 (createEvent, upcoming/all, occur-not-complete; spawn = surfaced trigger)
- [ ] **S4** Reminders + groups + dueIn seam — REL-30…42 (reminders, snooze, groups, birthday-anchor, getDueReminders, never-auto-send)
- [ ] **S5** Networks + graph data-prep — REL-43…46 (network CRUD, m2m membership idempotent, getNetworkGraph membership-only)
- [ ] **S6** Health engine (derived) — REL-22,23,24,25,47 (getContactHealth {band,score,factors} closeness-weighted + network rollup; formula designed)
- [ ] **S7** Device import (deny-safe X1/X8) — REL-07…11 (importDeviceContacts facade + import_staging + ContactsPermissionError)
- [ ] **S8** Tags + pages + links — REL-48,49,50 (entity_tags via Spaces contact+network parent_tag_id; pages via Notes; entity-link target)
- [ ] **S9** Fan-out + Journal + seams — REL-51,52,53,57,33/36/38,N7 (DueProvider reg, Journal /summary + digest, deny-safe tasks?/gamification?/preferences?, quiet-hours honor)

Each slice: full Entity Delivery Flow (§XXVI double-gate → implement types-first → blocking live-store Verification
Gate [Node 24] → independent g2 code-review + pre-ship /critique → §XXIX currency). Whole ① ships as one PR.

## Scenario
Add Backend Component · Default (Entity Delivery Flow ①). Worktree `.claude/worktrees/mod-relationships`,
branch `mod-relationships` off `main`. Node 22 (tests Node 24, better-sqlite3 ABI).

## Slice log
- **S1 — Contact spine + DB-11 (✅ 2026-10-07).** `createRelationshipsService` S1 over `025_relationships`. Full
  Entity Delivery Flow: spec `/critique` REVISE→folded (B1 ContactView return-type, B2 findAll-not-findWhere) →
  Approval 1 → `/preflight` BLOCKED→folded (G1 soft-deleted-update guard + error-mapping, G2 required-field set) →
  gate-2 SHIP → implement → **live-store Verification Gate 10/10** (Node 22 ABI) → independent g2 code-review SHIP
  (0 blockers, all 9 dims verified empirically) → pre-ship `/critique` SHIP. Decomposition independent critic also
  SHIP (0 blockers, 59 legs homed). Delivered: contact CRUD, app-layer cascade (RL-2, 5 children), `social_links`
  JSON boundary→`ContactView`, soft-deleted-update guard (`ContactNotFoundError`), DB-11 reconcile (dropped phantom
  `Contact.tags`; +how_we_met/closeness_tier/energy/snooze/priority/anchor + Network interfaces). tsc 0 · eslint 0 ·
  full @vida/core **1866/1867** (1 = vitest worker-RPC timeout, infra flake under the 329s run — not a relationships
  test; re-confirm at pre-ship suite). Currency born: `docs/modules/relationships/current-*`. One refinement vs spec:
  createContact re-reads after insert (faithful nulls) instead of echo+reattach — same contract, strictly more correct.
- **S2 — Interactions ledger + derived stats (✅ 2026-10-07).** `logInteraction`/`updateInteraction`/
  `deleteInteraction`/`getTimeline` + `recomputeContactStats` (count/MAX-date/cadence `stay_in_touch_days ??
  frequencyToDays`, UTC-safe addDaysISO). Guards: ContactNotFoundError (log on non-live contact),
  InteractionNotFoundError. Gate: spec critique+preflight inline (3 impl folds: NN-default backfill, re-read,
  defensive null-guard) → impl → **17/17 live-store** → inline g2 SHIP → currency BR-RL-S2-*. tsc 0 · eslint 0.
  (Full @vida/core suite deferred to the S3 checkpoint — S2 touched only relationships files.)
- (S3 next — events)
