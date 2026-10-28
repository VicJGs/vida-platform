# Interpretation Layer — check-ins ① (backend service tier)

> Entity Delivery Flow · Step 1 (front matter). Makes the implicit explicit before decomposing.
> Session: 2026-09-19-mod-check-ins · Sources: current-spec/current-business-rules (BASELINE) · `parts/check-ins.md` (31 CHE legs) · `traceability.md` (①/② split) · schema `check-ins.ts`.
> No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN].

## DEPENDENCIES (what must already exist for ① to build)

- **Schema — DONE.** `daily_check_ins`, `check_in_templates`, `check_in_template_questions` authored at DB-4 #16 (migration `026_check_ins`, v26). `[FACT: packages/core/src/db/schema/check-ins.ts]`
- **Types + enum validators — EXIST (reconcile, don't author net-new).** `CHECK_IN_TYPE`(6)/`CHECK_IN_SCHEDULE_TYPE`(3)/`CHECK_IN_PREFERRED_TIME`(4)/`CHECK_IN_QUESTION_FIELD_TYPE`(6) + interfaces `DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` `[FACT: packages/types/src/entities/user.ts:104-180]`; Zod enum schemas `[FACT: packages/core/src/validators/user.ts:19-22]`. ⚠ CHE-18 says "no types file exists" — **stale**; only the entity _object_ validators may need adding.
- **Repository — DONE.** Generic encrypt-on-write/decrypt-on-read `Repository` (table-agnostic). `[FACT: packages/core/src/db/CLAUDE.md]`
- **Effect rail — DONE (xs-effect-rail #32).** ADR-004 completion-effect rail for CHE-17 `grant_currency` emission. `[FACT: TASKS.md xs-effect-rail Done]`
- **Blocker modules — DONE.** MOD-journals #39 (day-page/`entity_links` for CHE-16, `/summary` for CHE-29), MOD-notes-and-pages #40 (`pages`/`entity_links` substrate), XS-effect-rail #32. `[FACT: decomposition.md:57]`
- **Sibling service precedents to mirror:** `preferences`, `journals`, `notes` — factory-object services (`create<X>Service` → object literal), `validate → repository → encrypt-seam → return`. `[FACT: packages/core/src/services/{preferences,journals,notes}/]`

## NEEDS (what ① must deliver)

- A `@vida/core` **check-ins service** (`services/checkins/`) exposing the 28 MOD-homed legs (10 `service` + 18 `single`). `[FACT: traceability.md check-ins rows]`
- CRUD over the 3 tables + a template form-engine + default-template seeding + two derivations (mood/energy trend, consecutive-day streak) + Journal-link writes + an XP-feeder emission + a placeholder review aggregator. `[FACT: parts/check-ins.md CHE-01..CHE-31]`
- Typed errors + fail-loud terminal states per capability. `[FACT: business-rules.md:60-74; CHE-27]`

## ORGANIZATION (how ① is shaped)

- Factory-object service, intra-service calls hoisted to closures (NOT `this.` — breaks on the ② destructure consumption shape); validating methods `async` (reject, not sync throw). `[FACT: memory factory-service-no-this-for-intra-calls]`
- Mirror the sibling module file layout: `types.ts` (or reuse colocated `@vida/types`), `service.ts`, `index.ts`, `__tests__/`. `[FACT: services/preferences/, services/journals/]`
- M1.0 encryption seam: `encryptedFields: []` (pass-through) — the `[E]` set is the M3/DB-5 target (CHE-30). `[FACT: check-ins.ts:22; memory m10-repos-use-empty-encryptedfields-seam]`

## IMPLICIT RULES (the backend deps that surface as runtime crashes, not review comments)

- **Persistence/uniqueness (CHE-01):** the (date,type) slot is enforced by `uq_daily_check_ins_slot` at the DB, but the service must **catch** the constraint violation and re-throw `DuplicateCheckInError` — a raw SQLite error is not the contract. `[FACT: check-ins.ts:63; CHE-01]`
- **No-FK app-layer cascade (CHE-22):** `template_id` is plain TEXT (no FK). On template delete the service MUST, in app code, null out referencing `daily_check_ins.template_id` (entry survives) and delete the template's `check_in_template_questions` (the intended CASCADE). Nothing does this automatically. `[FACT: check-ins.ts:39,90; CHE-22 reconciled to no-FK]`
- **Reduced-column table (CHE-08/questions):** `check_in_template_questions` has `id + syncColumns` only (NO created_at/updated_at). `Repository.create` always spreads created_at/updated_at; on a no-baseColumns table Drizzle drops them on INSERT but the create() RETURN may carry phantom values → build the returned view explicitly. `[FACT: check-ins.ts:83-104; memory repository-create-on-reduced-column-table-drops-phantom-basecolumns]`
- **Repository.create returns the input row, not DB defaults (CHE-06/07/11):** omitted notNull-default columns (`icon`, `is_default`, `is_active`, `sort_order`, `check_in_type`) come back `undefined` from create() — backfill the defaults in the service create input. `[FACT: memory repository-create-returns-input-row-not-db-defaults]`
- **Derived streak, no write (CHE-14/E9):** `computeCheckInStreak` reads `daily_check_ins` and returns a derived value; it MUST NOT write `user_profile.check_in_streak*` (those columns persist until the Part-2 DDL split, but ① never writes them). `[FACT: CHE-14; business-rules CK-11]`
- **Emit, don't apply (CHE-17):** a completion emits `grant_currency(XP)` through the effect rail; ① never writes XP or `consequence_ledger` (Gamification #48 applies). `[FACT: CHE-17]`
- **Link, don't copy (CHE-16):** check-ins writes an `entity_links` row (`entity_type='daily_check_in'`) to the Journal day page; it never copies content into `pages`. `[FACT: CHE-16; business-rules CK-7]`
- **custom_data single-source discipline (CHE-21):** standard default-template answers → real columns; ONLY extra user-question answers → `custom_data` JSON. Never duplicate a standard field. `[FACT: CHE-21]`
- **No-tags model guard (CHE-26):** never add a tag store or an `entity_tags` write for check-ins (SP1 opt-out). `[FACT: CHE-26]`
- **Local-first/LWW (CHE-23):** rides the foundation sync substrate; does not re-implement sync. `[FACT: CHE-23]`

## RESOLVED (was flagged UNKNOWN at BASELINE)

- **CK-11 / E9 streak ownership** → CHE-14 (derive read-side, no user_profile write) + CHE-17 (emit-only). Docs-fixed; not an open decision. `[FACT: parts/check-ins.md CHE-14, CHE-17]`

## OPEN UNKNOWNs (carried — do not block ①; ① ships the placeholder/config)

- CK-6 review→Purpose/Projects/Tasks aggregation **contract shape** — finalized post-Wave-3; ① ships **placeholder aggregation** only (CHE-15). `[FACT: parts/check-ins.md UNKNOWNs; delivery-plan §9:260]`
- CK-8 reminder-**fire** boundary — homed to M1.2 Notifications; ① ships **schedule config** only (CHE-11). `[FACT: parts/check-ins.md UNKNOWNs; CHE-24]`
- G6 unified cross-module mood view — deferred beyond M1.1, no build item. `[FACT: parts/check-ins.md UNKNOWNs]`
