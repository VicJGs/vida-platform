# Slice Map — check-ins ① (backend service tier)

> Entity Delivery Flow · Step 2 (Decomposition Gate). RATIFY-mode — the slices realize the doc-fixed legs (`traceability.md` ①/② split; `parts/check-ins.md` CHE-01..CHE-31). Each slice closes with a blocking Verification Gate before the next begins.
> Session: 2026-09-19-mod-check-ins.

## Split (from traceability.md)

- **① backend (this task, MOD-check-ins):** the 28 legs tagged `service` (10) or `single` (18) homed to `MOD:MOD-check-ins`.
- **② frontend (fe-check-ins, separate):** the 10 `ui` legs homed to `P6`. NOT built here.
- **Ride/defer:** CHE-23 (LWW → sync substrate), CHE-30 (`[E]` wiring → M3/DB-5 pass-through), CHE-24 (reminder fire → M1.2 Notifications), CHE-17 _apply_ (→ M1.2 Gamification), CHE-15 full aggregation (→ cross-module finalization; ① ships placeholder).

## Slices (all `backend`)

### S1 — Types & validators `[legs: CHE-18, CHE-19]`

Reconcile/extend `@vida/types` (enums+interfaces already exist — verify) + author the entity **Zod object validators** in `@vida/core` (`DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` create/patch schemas), incl. scale/range bounds (mood/energy 1–10; question `min_value`/`max_value`). Parity-tested vs SQL CHECK. Foundation for every op.

- **Verify gate:** enum-parity test green; validator unit tests (valid + ≥2 invalid per schema).

### S2 — Entry CRUD `[legs: CHE-01, CHE-02, CHE-03, CHE-04, CHE-20, CHE-21, CHE-31]`

`createCheckIn` (slot uniqueness → `DuplicateCheckInError`; catch the `uq_daily_check_ins_slot` violation), `updateCheckIn`, `getCheckIn(date,type)`, `listCheckIns(range)`. Required-question completion gate (CHE-20). `custom_data` single-source write discipline (CHE-21). Verify CK-2/CK-3 already in schema (CHE-31).

- **Verify gate:** Vitest logic + ≥2 failure paths (duplicate slot, missing required answer) + **live-store smoke** (real create/read against the DB, slot collision path).

### S3 — Templates & questions `[legs: CHE-05, CHE-06, CHE-07, CHE-08, CHE-09, CHE-10, CHE-11, CHE-12, CHE-22]`

Template CRUD + typed questions (UNIQUE `field_key` → typed error), `reorderQuestions`, `getActiveTemplate` (default-first resolution), `setSchedule` (config only), `seedDefaultTemplates` (one per 6 types). No-FK app-layer cascade on template delete (null entries' `template_id`; delete questions) — CHE-22 reconciled to no-FK.

- **Verify gate:** Vitest (dup field_key, default-first fallback, app-cascade on delete) + live-store smoke on seed + template delete cascade.

### S4 — Derivations `[legs: CHE-13, CHE-14]`

`getMoodEnergyTrend(range)` (aggregate plaintext scales) + `computeCheckInStreak` (derived read-side from `daily_check_ins`; **no `user_profile` write**, E9). Compute error → flagged partial.

- **Verify gate:** Vitest (streak across gaps/edges; empty-range trend "not enough data") + live-store smoke over seeded entries.

### S5 — Cross-module seams `[legs: CHE-16, CHE-17, CHE-15, CHE-25, CHE-28, CHE-29]`

`entity_links` day-page re-feed on create/update (CHE-16, link-don't-copy); `grant_currency(XP)` emission via the effect rail (CHE-17, emit-only); **placeholder** `getReviewData(type)` (CHE-15) + degrade-to-free-reflection (CHE-28) + `target_reviews` contribution placeholder (CHE-25); provide `/summary` contribution data (CHE-29). Model guards woven throughout: no-tags (CHE-26), terminal-state typed errors (CHE-27).

- **Verify gate:** Vitest (link written on save; emit fires once per completion; review degrades to partial+flag) + live-store smoke on the link write.

## Woven guards (assert in every slice, not a standalone slice)

- CHE-26 no-tags model guard · CHE-27 fail-loud typed terminal states · CHE-23 rides sync (no re-impl) · CHE-30 `encryptedFields:[]` pass-through (M1.0).

## Leg → slice coverage check (28 MOD legs, 0 unhomed)

S1: 18,19 · S2: 01,02,03,04,20,21,31 · S3: 05,06,07,08,09,10,11,12,22 · S4: 13,14 · S5: 15,16,17,25,28,29 · woven: 23,26,27,30.
Count: 2+7+9+2+6+4 = **30 leg-mentions = 28 MOD-homed legs + 2 RIDE legs** (CHE-23 sync-substrate, CHE-30 `[E]` pass-through — listed under `woven` but NOT MOD-homed). Each leg is mentioned exactly once (no double-listing). All 28 MOD-homed legs covered; CHE-24 is DEFERRED (M1.2 Notifications, not in the 28); the 10 `ui` legs are ② (out of scope).
