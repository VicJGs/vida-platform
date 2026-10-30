---
Session 5 — 2026-08-20
Goal: DB-4 per-domain schema — author the next heads: #14 Relationships (CRM), then #16 Check-ins.
Profile: add-backend-component
---

## Accomplished
- **DB-4 group #14 Relationships (CRM) — P1–P5 DONE + COMMITTED (`59956fb`).** 8 tables (`025_relationships`,
  v25): 6 §5.9 reshaped (`contacts`·`contact_events`·`interactions`·`contact_reminders`·`reminder_groups`·
  `reminder_group_contacts`) + 2 net-new networks (`network_groups`·`network_group_contacts`, G2/RL-4, M:N).
  - Build-phase INTENDED authored (intake §Resolution WHOLE): inline `contacts.tags`→`entity_tags` (G10/SP1);
    `contacts.how_we_met`[E] + `closeness_tier` (G4, OPEN — Preferences-defined); `interactions.energy_given`/
    `energy_received` (INT plaintext) + `key_takeaways`[E] (G8); `contact_reminders.is_snoozed`/`snoozed_until`/
    `priority` (reuse PRIORITY, G8); `reminder_groups.anchor_type`/`anchor_days_before` (event-anchor, G11, net-new
    `REMINDER_GROUP_ANCHOR`).
  - `deleted_at` on `contacts` ONLY (§5.9 floor + the `habit_completions`/`routine_completions` ledger precedent;
    `interactions` = the ledger). No-FK; no M\* (C1); `social_links` kept (C4); no E2 (C2); N1/N2/X1/X8 cite-not-author.
  - **Preflight fold F1:** the §5.9 composite-PK junctions reshaped to the live entity_tags-v2 junction shape
    (synthetic `id` PK + baseColumns + `UNIQUE(pair)` + reverse index; `project_habits`:29-30, NOT §5.9 composite PK).
  - Gates: gate-1 SHIP · preflight PASSED · gate-2 SHIP · post-impl SHIP. `@vida/core` 619 green; introspection 32 (8×4).
- **DB-4 group #16 Check-ins — P1–P5 DONE + COMMITTED (`04dc789`).** 3 tables (`026_check_ins`, v26), the lightest
  group: `daily_check_ins`·`check_in_templates` (baseColumns) + `check_in_template_questions` (id+syncColumns, NO
  created_at/updated_at — §5.13 floor + SyncMetadata interface).
  - Build-phase fixes (intake WHOLE): CK-2 composite `UNIQUE(check_in_date, check_in_type)` (bug fix, old single-col
    UNIQUE gone); CK-3 `check_in_type` 3→6 (`+afternoon/monthly_review/yearly_review` — amended the EXISTING
    `CHECK_IN_TYPE` tuple in `@vida/types/entities/user.ts`, the sole types-layer edit).
  - No `deleted_at` on ANY (documented FACT); no-FK; 4 FIXED CHECK (module's own existing tuples); `ENTITY_TYPES +=
    daily_check_in` (no tags, SP1). E9 streak DERIVED (no col) · E2 economy (Gamification) · G7 review (integration) ·
    no M\* — all cite-not-author.
  - **Gate-1 REVISE caught a real miss:** I claimed the check-in enums/interfaces/validators were net-new; they
    already existed in `entities/user.ts` + `validators/user.ts` (colocated with `user_profile`). A new file would
    have double-exported. Rewrote → reconcile-and-extend. Gates then: preflight PASSED · gate-2 SHIP · post-impl SHIP.
    `@vida/core` 635 green; introspection 12 (3×4).
- **§XXIX currency promoted** for both groups (`database-layer/current-{spec,business-rules}.md`: BR-RL-1…8, BR-CK-1…7)
  + task roster/Route History + TASKS.md. Two memories written (junction-reshape; types-colocation).

## Decisions Made
- **#14 junctions = entity_tags-v2 shape, not §5.9 composite PK** (synthetic id + UNIQUE(pair) + reverse index;
  `project_habits` precedent). A preflight catch; the §5.9 composite-PK/SyncMetadata shape is the stale source.
- **#14 `deleted_at` on `contacts` only** — the §5.9 per-module floor + the habit/routine ledger precedent (children/
  ledgers/groups cascade or use is_active).
- **#16 `deleted_at` = NONE on all 3** — a documented FACT (§5.13 DDL + the P/E table omit it while every neighbor
  lists it; CK-10 hard-delete), NOT a flagged call. Confirmed after Victor's "ground everything on the documentation."
- **#16 check-in types RECONCILE, not net-new** — the 4 enums + 3 interfaces + 4 validators already live in
  `entities/user.ts` + `validators/user.ts`; amend `CHECK_IN_TYPE` 3→6 in place (validator/interface auto-inherit).
- **#16 `check_in_template_questions` = id + syncColumns** (no created_at/updated_at) — §5.13 + `SyncMetadata` interface.

## Open Questions
- none blocking. Carry-forward (all groups): DB-11 `@vida/types` row-interface reconcile (deferred every group).

## Next Session
First step: DB-4 group **#17 Health: Core** — Phase 1 intent intake. Grep intake+reruns FIRST
(`part-1.2-reruns/health*`), read the FULL 5-aspect `docs/features/health/core/` + ADR-002 §. Health was SPLIT ×3
(Core/Nutrition/Training, P0 D1) — the heaviest remaining cluster (~23 tables across the 3).
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` (P0 roster + Route History) · flow doc
`docs/roadmap/schema-foundation-build-flow.md §2` · memories [[db4-types-may-be-colocated-grep-name-before-net-new]] ·
[[build-phase-flags-mean-resolve-now-not-defer]] · [[stale-source-plus-live-convention-is-fact-not-a-decision]].
15 of 21 active groups done; 6 remain (#17-19 Health ×3, #20 Journals, #21 Gamification, #22 Notifications).
