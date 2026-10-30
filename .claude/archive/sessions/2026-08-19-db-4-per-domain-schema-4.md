---
Session 4 — 2026-08-19
Goal: DB-4 per-domain schema (LIF-66) — author the v2 domain schema one group at a time (5-phase lifecycle)
Profile: add-backend-component (schema-foundation build)
---

## Accomplished
- **4 DB-4 domain groups authored, gated, and committed** (branch `db-4-per-domain-schema`), 15 net-new tables:
  - **#5 Projects** (`95718c5`, v16) — `projects`·`milestones`·`deliverables`·`project_documents`. `deliverables`
    INTENDED authored; `progress`→nullable slot ×3; measurement pair on `deliverables` only; inline `tags`→`entity_tags`.
  - **#6 Habits** (`7b81702`, v17) — `habits`·`habit_completions`·`project_habits` (kept junction, deferred from #5 →
    entity_tags v2 shape). Measurability HB-13; G8 restored fields; net-new `HABIT_DIFFICULTY`; `value` REAL (first in v2).
  - **#7 Routines** (`10c6c2e`, v18) — the ORCHESTRATION REFRAME (`routines`·`routine_step`·`routine_completions`,
    supersedes the flat §5.6 POC). `step_type` OPEN vocab; polymorphic entity ref; `recurrence_rule` RRULE; net-new
    `ROUTINE_LIFECYCLE`.
  - **#8 Purpose & Goals** (`55abae9`, v19) — the CAPSTONE, 6 tables (`purposes`·`targets`·`purpose_metrics`·
    `purpose_metric_values`·`target_reviews`·`dreams`); §5.7 floor − the 4 DB-3 substrate tables. Heavy ADR-011
    amendments; `dreams` absorbs `bucket_list_items`; measurement pair on `targets` only.
- Every group: full §XXVI double-gate + preflight + independent post-impl `/critique` = SHIP (12 independent critiques
  total, all clean). §XXIX currency promoted per group (`database-layer/current-spec.md` + `current-business-rules.md`).
- `@vida/core` **240 → 336 tests** green; typecheck clean; eslint 0-err; `LATEST_VERSION` 15 → 19.
- **8 of 22 DB-4 groups now done** (14 remain).

## Decisions Made
- **The measurement pair (`measurement_kind`/`binding_mode`) is scoped by the MODULE DOC roster, not the ADR-011 broad
  list** — Projects: `deliverables` only; Purpose: `targets` only. The specific per-table列表 wins over ADR-011 §3.4's
  cross-cutting pursuable list. (Both re-confirmed by independent critics.)
- **`binding_mode` is always nullable, no default** (the override-slot grain) even where a doc names the natural
  ('event-trigger' for habits, 'derived-pull' for routines/targets) — the natural is *derived*, not stored. The Tasks
  gate-2 trap, avoided in every group.
- **`project_habits` (kept junction) reconciles to the `entity_tags` v2 shape** — synthetic UUIDv7 `id` PK + UNIQUE, not
  the §5.x composite PK.
- **Routines authors the REFRAME, not the POC** — the reframe DESIGN landed in `docs/intake/routines.md` §E + the
  realignment rerun; only the DDL was deferred "→ build phase" (= DB-4). Policies→Preferences/Spaces, membership→Spaces
  (design-pass, non-blocking), scheduler→Sessions — all doc-decided boundaries.
- **`dreams` absorbs `bucket_list_items`** (PG-16, retired); keeps both `domain` (LifeDomain) + `category` (bucket vocab).
- **Reuse `FREQUENCY` for `targets.review_frequency`** (gate-1 caught a would-be net-new `REVIEW_FREQUENCY` duplicate).

## Open Questions
- **The recurring drift class: manufacturing openness the docs already close.** Victor corrected it 3× this session
  (#5 measurement-scope escalation; #7 Routines twice — "investigate deeper" / "already solved in the documentation").
  Two memories saved: [[module-doc-is-db4-roster-not-adr-broad-list]], [[check-intake-and-reruns-before-triaging-a-design-pass-undone]].
  The standing guard: for any design-pass-flagged group, grep `docs/intake/<mod>.md` §E + the realignment reruns FIRST.
- **DB-11 interface-reconcile backlog is growing** across all groups (@vida/types interfaces + retirements deferred
  mirror-only). Tracked per group; lands at DB-11.

## Next Session
First step: **DB-4 group #9 Finance (+Fiscal & Legal), Phase 1** — grep intake + realignment reruns FIRST, then read
ADR-002 §5.8 (accounts/transactions/assets/liabilities/investments/income_streams) + §5.20 (Fiscal & Legal net-new:
`fiscal_residencies`/`legal_entities`/`fiscal_obligations` + jurisdiction tag; `category_bidx` blind-index F7). `store`/
`rules` are already DB-3 substrate — exclude them.
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" · flow doc §2/§4 ·
`database-layer/current-spec.md` (roster) · the memories above · groups #5–#8 specs as the pattern.
