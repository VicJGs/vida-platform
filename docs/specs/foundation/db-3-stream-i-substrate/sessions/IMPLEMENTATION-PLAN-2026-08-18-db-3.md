# IMPLEMENTATION-PLAN — DB-3 Stream (i) Substrate (gate-2 / Approval 2)

> Build-steps for the approved `PLAN-2026-08-18-db-3.md`. Pattern-matched to migrations 002–006 + `_shared.ts` +
> `enum-parity.test.ts` (all read at gate 2). Any divergence → §XXVIII. No new DDL decisions — this is the *how*.

## Pattern facts (verified on disk)
- Enum tuples: `@vida/types/src/<domain>.ts` `export const X = [...] as const`; re-exported via `types/src/index.ts`.
- Drizzle module: `schema/foundation/<x>.ts`, `...baseColumns`, `enumText('col', TUPLE)`, `index()`/`unique()` in the 3rd arg; `$inferSelect/$inferInsert` type exports. NO cross-table FK (plain TEXT).
- Migration: `migrations/00N_<x>.ts` → `export const migrationNNN…: Migration = { version, name, up }`; raw SQL `CREATE TABLE` with the full `baseColumns` SQL mirror + inline CHECK + `CREATE INDEX` after; registered in `runner.ts ALL_MIGRATIONS`.
- Validators: `core/src/validators/<domain>.ts` `z.enum(TUPLE)`; parity asserted in `validators/enum-parity.test.ts` (append `(table, column, tuple)` rows + import the new migrations).

## Build steps (in order; typecheck + test after each group)

**1 · @vida/types enum tuples**
- NEW `purpose.ts`: `CONTRIBUTION_GOAL_TYPE=['purpose','target']` · `CONTRIBUTION_CONTRIBUTOR_TYPE=['habit','routine','project','task','dream','finance_target','check_in']` · `PLAN_STEP_OWNER_TYPE=['task','target']`. Add `export * from './purpose'` to `index.ts`.
- `knowledge.ts` += `REVIEW_CURVE_KIND=['decay','review','test']` · `METHOD_BINDING_TARGET_TYPE=['area','subject','unit','topic','kind']`.
- `economy.ts` += `STORE_NODE_KIND=['group','wrapper']` · `STORE_REF_TYPE=['account','investment','asset']` · `RULE_CONDITION_BINDING_TYPE=['event_trigger','derived_pull']`.
- `session.ts` += `PLANNED_BLOCK_STATUS=['planned','scheduled','fulfilled','skipped']`.

**2 · Drizzle modules (`schema/foundation/`)**
- NEW `purpose.ts`: `values` · `contributions` · `purposeReviews` · `planSteps` (DDL per PLAN §B Group P + indexes §G).
- NEW `knowledge-review.ts`: `reviewCurves` · `methodBindings` · `reviewEvents` (Group K).
- `economy.ts` += `store` · `rules` (Group E) — same file (ADR-012 cluster).
- NEW `scheduling.ts`: `plannedBlocks` (Group S).
- NEW `templates.ts`: `templates` (Group T).
- `schema/index.ts` += `export * from` the 4 new modules.

**3 · Migrations (hand-written SQL, register in runner)**
- `007_purpose.ts` (values·contributions·purpose_reviews·plan_steps) · `008_knowledge_review.ts` (review_curves·method_bindings·review_events) · `009_economy_store_rules.ts` (store·rules) · `010_scheduling.ts` (planned_blocks) · `011_templates.ts` (templates). Each: full baseColumns SQL mirror + inline CHECK + indexes per PLAN §G. Register 007→011 in `runner.ts ALL_MIGRATIONS`.

**4 · Validators + parity**
- NEW `validators/purpose.ts` (+ `validators/index.ts` export) · append review enums to `validators/knowledge.ts` · store/rules enums to `validators/economy.ts` · planned-block status to `validators/session.ts`.
- `validators/enum-parity.test.ts`: import migrations 007–011 + append the `(table, column, tuple)` rows for every new CHECK.

**5 · Registry**
- `_registry.ts ENTITY_TYPES` += the new substrate types (`value·contribution·purpose_review·plan_step·review_curve·method_binding·review_event·store·rule·planned_block·template`). Scoped enums (node_kind, ref_type, goal_type, contributor_type, owner_type, target_type, curve_kind, status, condition_binding_type) stay as literal tuples in `@vida/types`, NOT `ENTITY_TYPES`.

**6 · Verify (P4 exit)**
`pnpm --filter @vida/core typecheck` + `pnpm --filter @vida/types typecheck` · `pnpm --filter @vida/core test` (parity + runner green) · root typecheck. Then P5 (post-impl critique + §XXIX currency promote + foundation-readiness).
