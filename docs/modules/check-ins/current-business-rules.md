# Current Business Rules — check-ins   (level: Module · tier: STANDARD)
> Coverage: schema (full) + colocated types/validators + 4/5 intake aspects — status: full (code) · full (aspects harvested).
> Inherits: docs/core/business-rules.md (ZK-1/2/3, LF-1/2/3). Check-ins are "deeply personal" (ADR-002 L982-985) → ZK-1 governs every free-text field. A child rule contradicting a parent is a CONFLICT — flagged, never overridden.
> Last refreshed: 2026-09-19-mod-check-ins  ·  Source of truth = the code (Currency Rule §3.2b).

## 1. Invariants — what is ALWAYS / NEVER true
- **CK-1 — Encrypted reflection, plaintext scales.** `top_intentions`, `wins`, `gratitude`, `challenges`,
  `tomorrow_focus`, `reflection`, `custom_data`, template `name`/`description`/question `label`/`placeholder`
  are `[E]` (ZK-1). `mood_score`/`energy_level`, `check_in_type`, `check_in_date`, schedule config are
  **plaintext** (trend charts need them). `[FACT: check-ins.ts:45-60,69-96]`
  > ⚠ M1.0 encryption seam: the `[E]` set is EMPTY at M1.0 (pass-through); the `@encrypted` fields are the M3
  > target (BR-DB6-3). The service uses `encryptedFields: []` now. `[FACT: check-ins.ts:22]`
  > (memory: [[m10-repos-use-empty-encryptedfields-seam]] — `key()` only fetches when the set is non-empty.)
- **CK-2 — One check-in per (date, type).** ✅ **REALIZED** — `uq_daily_check_ins_slot` UNIQUE(`check_in_date`,
  `check_in_type`). `[FACT: check-ins.ts:63]`
  > ⚠ **CONTRADICTION (stale aspect doc):** business-rules.md CK-2 + structure-data.md still call this a "bug —
  > UNIQUE on date alone." The schema fixed it. The code is the truth.
- **CK-3 — Six check-in types.** ✅ **REALIZED** — `CHECK_IN_TYPE = [morning, afternoon, evening, weekly_review,
  monthly_review, yearly_review]`. `[FACT: entities/user.ts:104-111]`
  > ⚠ **CONTRADICTION (stale):** aspect docs say "ships only 3 (morning, evening, weekly_review)." Now 6.
- **CK-4 — Default template per type; columns = the built-in default.** The hardcoded `daily_check_ins` columns
  ARE the built-in default template, materialized for querying/trends; `custom_data` stores answers to **extra**
  user-added questions only (no duplication). `seedDefaultTemplates()` seeds one per type. `[INTENT G3,G5; FACT: check-ins.ts:60]`
- **CK-5 — Templates are typed and customizable.** A template owns ordered `check_in_template_questions`
  (`field_type` ∈ mood_scale/energy_scale/text_list/text_area/rating/boolean), UNIQUE(`template_id`, `field_key`);
  `min_value`/`max_value` bound scale/rating types. `[FACT: check-ins.ts:86-104; entities/user.ts:118-126]`
- **CK-7 — Check-ins feed the Journal day page.** A check-in links to its day's Journal `pages` row via
  `entity_links` (`daily_check_in` is a valid `entity_type`); reviews backlink reviewed entities. `[INTENT G10; FACT: ADR-002 L1350]`
- **CK-10 — Lifecycle: hard-delete, app-layer integrity.** ✅ **NO `deleted_at` on any of the 3 tables** (CK-10
  hard-delete). `template_id` is **no-FK plain TEXT** (was SET NULL / CASCADE); referential integrity is
  app-layer. `[FACT: check-ins.ts:39,61,80,90]`
  > ⚠ **CONTRADICTION (stale):** business-rules.md CK-10 states "SET NULL / CASCADE (FK)." The schema is no-FK
  > per ADR-016 §3.4. The service must enforce the cascade/orphan-handling in application code.
- **CK-11 — Check-ins own the streak; Gamification owns the reward (⚠ INTENDED, NOT yet realized).** The
  consecutive-day `check_in_streak*` should be check-ins-owned and **derived from `daily_check_ins`** (ADR-012 E9
  split), and a completion should **emit** `grant_currency(XP)` (E2) that Gamification applies → `consequence_ledger`
  (E3). Check-ins never writes XP itself, and there is **No S4** (a check-in is not a session). `[INTENT G9; ADR-012 E2/E3/E9]`
  > ⚠ **INTENDED DELTA (real, unrealized):** `user_profile` STILL carries `check_in_streak`,
  > `longest_check_in_streak`, `last_check_in_date` `[FACT: entities/user.ts:58-60; schema.ts:1183-1185]`. The E9
  > 3-owner split (Check-ins / Gamification / Preferences share the overloaded `user_profile` row) is NOT done.
  > **Decision needed at the Decomposition Gate:** does this service derive the streak from `daily_check_ins`
  > (leaving `user_profile.*` as a legacy/cache field), and is the XP-feeder effect in scope for ① or deferred to
  > the Gamification build (#48)? See current-spec §4. `[UNKNOWN: needs Decomposition Gate ruling]`
- **CK-12 — Local-first.** Every check-in/template edit succeeds locally first; LWW on structured columns. `[FACT: LF-2; ADR-003]`

## 3. Rule inventory — explicit · implicit · invented
- **EXPLICIT (schema-realized):** CK-1 ([E] tags), CK-2 (UNIQUE slot), CK-3 (6 types), CK-5 (UNIQUE field_key +
  field_type enum), CK-10 (no deleted_at, no-FK) — all cited to `check-ins.ts` / `entities/user.ts`.
- **EXPLICIT (intake-specified, to build in service):** CK-4 (default templates + seed), CK-7 (Journal link),
  CK-8 (schedule → reminders, INTENDED), CK-6/getReviewData (cross-wave INTENDED).
- **IMPLICIT (domain, enforce in service):** required question (`is_required=1`) blocks completion until
  answered; scale answer must fall within `min_value`/`max_value`; editing a past day's check-in re-feeds its
  Journal page. `[FACT: business-rules.md:55-57]`
- **INVENTED / DRIFT-RISK:** none introduced. The live drift is the **stale aspect docs** (CK-2/CK-3/CK-10 "to
  fix" framing) and the **unrealized E9 split** (CK-11) — both flagged above, neither is an invented rule.

## 4. Validation & edge cases
- Enum CHECKs (SQL migration, sourced from the tuples): `check_in_type` (6), `field_type` (6), `schedule_type`
  (3), `preferred_time` (4); `mood_score`/`energy_level` BETWEEN 1 AND 10. `[FACT: entities/user.ts:104-126; check-ins.ts:52-53]`
- A required template question blocks completion until answered (CK-5). A scale answer outside min/max is
  rejected (CK-5). A review with no linked goals/projects still saves as free reflection (CK-6 degrades).
  Editing yesterday's check-in is allowed and re-feeds its Journal day page (CK-7). `[FACT: business-rules.md:55-58]`

## 5. Terminal states
Per capability: entry wizard · history/calendar · mood/energy trends · review · template builder · reminder fire
— each with loading/empty/error/success enumerated in `docs/features/check-ins/business-rules.md:60-68` and
mirrored in current-spec §5. Fail-loud on every error path (§6).

## 6. Failure behavior (fail loud — constitution §5)
- A failed check-in save reverts optimistic state with a typed error — never silent loss of a personal entry. `[FACT: business-rules.md:71]`
- A review where a module read fails shows available progress + a flag, never a falsely-complete review. `[INTENT G7]`
- Trend/streak compute errors show a flagged partial, never a wrong number. `[INTENT G6,G9]`
- Validating service methods reject asynchronously (not sync throw) — factory-service convention. `[FACT: memory factory-service-no-this-for-intra-calls]`

## Completion checklist
- [x] §1 invariants with [FACT] (+ 3 stale-doc contradictions + 1 unrealized INTENDED delta flagged)
- [x] §3 inventory (explicit/implicit/INVENTED classified) · [x] §4 validation/edge · [x] §5 states · [x] §6 fail-loud
- [x] inherits docs/core; no child rule contradicts a parent · load-bearing [UNKNOWN] (CK-11 E9 scope) surfaced for the Decomposition Gate
