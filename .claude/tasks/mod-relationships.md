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
- [x] **S3** Events — REL-26,27,28,29 ✅ (createEvent + upcoming/all, recurring MM-DD projection; 25/25 live-store)
- [x] **S4** Reminders + groups + dueIn seam — REL-30…42 ✅ (9 methods + getDueReminders producer; 28/28 live-store)
- [x] **S5** Networks + graph data-prep — REL-43…46 ✅ (network CRUD, m2m membership, getNetworkGraph; 32/32 live-store)
- [x] **S6** Health engine (derived) — REL-22,23,24,25,47 ✅ (formula designed; closeness-weighted + network rollup; 39/39)
- [x] **S7** Device import (deny-safe X1/X8) — REL-07…11 ✅ (deny-safe facade + pure matcher + commit-on-confirm; 43/43)
- [x] **S8** Tags + pages + links — REL-48,49,50 ✅ (entity_tags via Spaces, pages via Notes, REL-50 RATIFY; 47/47)
- [x] **S9** Fan-out + Journal + seams — REL-51,52,53,57,33/36/38,N7 ✅ (Journal /summary + DueProvider lane; PULL-only; 50/50)

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
- **S3 — Events (✅ 2026-10-07).** `createEvent`/`getUpcomingEvents`/`getAllEvents` over `contact_events`.
  `reminder_days` JSON→`EventView` boundary; recurring MM-DD projection (`nextOccurrence`/`mmdd`, year-wrap);
  one-time literal dates. REL-29: read-surfaced, never auto-complete/spawn (Tasks unbuilt). Un-homed gap noted
  (updateEvent/deleteEvent — not in REL-26/27/28). Gate: spec critique+preflight inline → **25/25 live-store** →
  inline g2 SHIP → currency BR-RL-S3-*. tsc 0 · eslint 0. **S3 full-suite checkpoint: 1873/1874** (1 = load-induced
  vitest-worker timeout flake; relationships isolated 25/25 green).
- **S4 — Reminders + groups + dueIn producer (✅ 2026-10-07).** 9 methods: createReminder/completeReminder/
  snoozeReminder · createGroup/addMembers/removeMembers/setBirthdayAnchor/deleteGroup (REL-34 SET-NULL) ·
  `getDueReminders(TimeRange): DueItem[]` (the R7 producer — explicit + stay-in-touch overdue + birthday-anchor +
  daily/weekly schedule groups; **biweekly+ = grounded schema gap, flagged forward, not invented**). `ReminderGroupView`
  (days_of_week JSON). N2/N7 honored downstream (Notifications/Prefs). Gate: spec critique+preflight inline (biweekly
  gap surfaced, dueIn seam grounded vs sessions DueItem) → impl → **28/28 live-store** → independent g2 (dispatched) →
  currency BR-RL-S4-*. tsc 0 · eslint 0. [S9 registers getDueReminders as a sessions DueProvider lane.]
- **S5 — Networks + graph data-prep (✅ 2026-10-07).** `createNetwork`/`addToNetwork`/`removeFromNetwork`/
  `getNetworkGraph` over network_groups + network_group_contacts. Many-to-many (RL-4, idempotent); graph =
  membership-only node/edge set (no contact↔contact), dangling-edge-guarded, isolated networks included. Gate: spec
  critique+preflight inline (dangling-edge fix) → **32/32 live-store** → inline g2 SHIP → currency BR-RL-S5-*.
  tsc 0 · eslint 0. (Un-homed noted: deleteNetwork.)
- **S6 — Health engine, derived (✅ 2026-10-07).** The build-phase DESIGN-PASS: `getContactHealth(id,asOf?)` →
  {band,score,factors,partial?} — new/healthy/at_risk/overdue; score = clamp(100 − daysOverdue·weight·1.5 +
  sentiment·15); closeness onion from relationship_type+is_favorite (closeness_tier OPEN → display-only);
  recentSentiment = last 5 rated; grace shorter for inner tiers. `getNetworkHealth` = worst-band + mean-score rollup.
  **C1 honored: NOT an ADR-011 measurement** (no measurement_kind, no registry advertise). `asOf` determinism seam.
  Gate: spec critique+preflight inline → **39/39 live-store** → independent **g2 SHIP** (C1 grep-confirmed: no
  measurement import/advertise/kind; formula + partial-guard + rollup verified) → folded g2 note (recentSentiment
  created_at tiebreak). tsc 0 · eslint 0. Currency BR-RL-S6-*. **S6 full-suite checkpoint: 1893/1896 under Node 24**
  (3 non-relationships flakes; relationships isolated 39/39). ⚠ **ABI incident:** the S6 g2 agent rebuilt
  better-sqlite3 to Node-24 ABI (137) in the shared worktree → broke Node-22 runs (1645 setup-fails, pure ABI
  mismatch, not code). **Resolution: session standardized on Node 24** (matches the binary); future review agents
  must be forbidden from native rebuilds.
- **S7 — Device import, deny-safe X1/X8 (✅ 2026-10-07).** `importDeviceContacts(device?)` (deny-safe →
  ContactsPermissionError), pure `stageContacts` natural-key matcher (email case-fold/phone/exact-name/parse_error),
  `commitContactImport` (writes new, never overwrites matched, commit-on-confirm). `createContactImpl` hoisted +
  reused. X1 refuse-not-downgrade inherent; X2/X5 grant + device bridge + import_staging store = M2. Gate: spec
  critique+preflight inline → **43/43 live-store** → inline g2 SHIP (no agent — avoids native-rebuild hazard).
  tsc 0 · eslint 0. Node 24 for tests.
- **S8 — Tags + pages + links (✅ 2026-10-07).** Deps grew (+spaces/+notes, required). `tagContact`/`untagContact`/
  `tagNetwork`/`untagNetwork` delegate to `spaces.tagEntity` (entity-guarded, idempotent); `ensureContactNote`/
  `ensureNetworkNote` = titled find-or-create pages (purposes mechanism). REL-50 (contact as entity_links target) =
  RATIFY (seeded registry; link written note-side). contact/network pre-seeded in ENTITY_TYPES → no register().
  Harness widened (real spaces+notes); 43 prior tests unaffected. Gate: spec critique+preflight inline → **47/47
  live-store** → inline g2 SHIP → currency BR-RL-S8-*. tsc 0 · eslint 0.
- **S9 — Fan-out + Journal + seams, the ① closer (✅ 2026-10-07).** `getDayRelationshipsDigest` (counts) +
  `journal.ts` (`createRelationshipsJournalContribution`/`registerRelationshipsJournal`/
  `registerRelationshipsDueProvider`). PULL-only Journal contribution + sessions DueProvider lane (wires S4
  `getDueReminders` → `sessions.dueIn`, verified end-to-end). **NO effect-rail PUSH** (C1 no measurement, C2 no
  economy). REL-51/52/57/N7 = documented seams (owners consume / deferred). Gate: spec critique+preflight inline →
  **50/50 live-store** → inline g2 SHIP → currency BR-RL-S9-*. tsc 0 · eslint 0.
- **① BACKEND COMPLETE — S1–S9, 9 commits, 50 live-store tests, 59 legs REL-01…59.** Next: pre-PR full-suite gate → PR.
