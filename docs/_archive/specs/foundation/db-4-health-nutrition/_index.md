# DB-4 · Domain Group #18 — Health: Nutrition · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #18 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `028_health_nutrition` (v28) · **Schema file:** `schema/health-nutrition.ts` · **Types file:** `packages/types/src/nutrition.ts` (net-new) · **Branch:** `db-4-per-domain-schema`
**Rerun:** health/nutrition ✅IMPLEMENTED (2026-07-25, LITE gate SHIP/0-blocking — the LAST Tier-2 unit). The X*/AI*/SP1 token-naming pass is DONE across all 5 aspects; its payload is **cite-not-author**. The DDL is THIS build's job.

> **The fuel pillar** — Ingredient/Dish libraries · Nutritional Plan · Daily Meal Plans · Meals · Shopping. **6 owned
> tables.** Net-new (recovered domain, no v2 schema — no As-is floor); the `structure-data.md` roster IS the documented
> per-table floor ([[module-doc-is-db4-roster-not-adr-broad-list]]; the #17 lesson). Boundaries already crisp: it
> **composes** Core's `health_goals`/`health_metrics`/Adaptation (authored in #17), Finance for cost, Spaces for tags.
> **Zero build-decisions.**

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/health/nutrition/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects, read) ·
`docs/intake/health.md` **STATUS: WHOLE — ENHANCED** (Victor 2026-07-14; §CI-3 the functional taxonomy) ·
`part-1.2-reruns/health-nutrition.md` (IMPLEMENTED — the X*/AI*/SP1 naming pass + C1–C8 guards) · `ADR-002` (conventions;
Nutrition = additions, no existing §) · `ADR-014` (X1/X2/X3/X5/X11 ingestion) · `ADR-015` (AI1/AI3/AI5/AI6) · `ADR-006`
(SP1/SP2 tags) · `packages/types/src/common.ts` (`FREQUENCY` reuse) · `schema/_shared.ts` (`baseColumns` no `deleted_at`;
`money()`=INTEGER cents) · `schema/health-core.ts` (#17 — the Core spine Nutrition composes) · `schema/finance.ts`
(the `money()` + `@encrypted` precedent) · `schema/_registry.ts` (`ENTITY_TYPES`).

## §1. Identity — what this unit is
The Nutrition pillar of the Health domain. Owns the **food-specific** entities only; composes Core for goals/metrics/
adaptation. **6 owned tables:**
- **Libraries** — `nutrition_ingredients` (atomic foods + macros) · `nutrition_dishes` (composed dishes).
- **Planning** — `nutritional_plans` (strategy → a Core `health_goal`) · `daily_meal_plans` (per-day).
- **Logging** — `meals` (logged instances; photo-loggable) · `shopping_items` (procurement → Finance).

### Scope boundary — doc-DECIDED (intake WHOLE + rerun IMPLEMENTED → author the DDL, cite the rest)
**AUTHOR (the doc-described shape — build phase):**
- The 6 tables per `structure-data.md` §Entities, with P/E flags, nullable notation, and the enum split below.
- **Drop the inline `meals.tags`** → tags ride `entity_tags` (SP1); the reframe is a forward `[INTENT]` correction (no live
  floor → no R6). Register the 6 `entity_type`s in `_registry.ts` (OPEN SP2 registry).
- **Provenance columns:** `meals.source` (FIXED `MEAL_SOURCE` = `manual|ai|import`, AI6) · `daily_meal_plans.generation_method`
  (FIXED `MEAL_GENERATION_METHOD`) · `nutritional_plans.ai_meal_generation` (boolean 0/1). These are the only DDL trace of X*/AI*.
- **`packages/types/src/nutrition.ts`** (net-new — grep-confirmed none exists): 2 FIXED tuples + Zod.

**OUT (cite-not-author / owned elsewhere — the rerun C1–C8 guards + §5):**
- **C1 — no `measurement_kind`/`binding_mode`.** Nutrition composes Core `health_goals` (type=body-composition, HN-4); 011
  is not a driver. `goal_id` is a plain no-FK ref to a Core goal. `[rerun C1; HN-4]`
- **C2 — no economy/E2 columns.** Adherence/goal → Gamification is a PROVIDES seam, not an owned ledger. `[rerun C2]`
- **C3 — no session/S* layering.** A meal is a **logged entity, not a Session** (HN-2) — scheduled via `dueIn()`, `scheduled_at`
  + `status`, no runtime/timer, no `workout`-style sub-type. `[rerun C3; HN-2]`
- **C4 — no AI4 agentic envelope.** AI meal-gen / photo analysis = scoped `askModel(slice)` "fail→manual" calls (AI1/AI3),
  not a tool-wielding actor. `[rerun C4]`
- **C5 — do NOT hard-code the functional/whole-food taxonomy.** `functional_area` (8-system) + `whole_food_type` ship as
  **editable starters, pending research (R2)** → OPEN plain TEXT / JSON, **no CHECK**, values never asserted as truth. `[rerun C5; HN-12/HN-13]`
- **C6 — `cooking_skill_id` opt-in.** Nullable no-FK → Skills/Knowledge, set only when cooking-tracking is opted-in. `[rerun C6; HN-14]`
- **C7/C8 — composed-not-owned + no import_staging.** `health_goals`/`health_metrics`/Adaptation = Core; cost → Finance;
  `entity_tags`/Spaces; `ai_connections` + `external_in_ok`/`external_out_ok` = AI-layer/ADR-010 (existing grant fields, no
  new column); food-DB is a whole-set public dataset (X3), NOT a merge-import (Finance owns `import_staging`, X8 NA). `[rerun C7/C8; §5]`
- **X*/AI* wiring** — food-DB/barcode/photo/prescription ingestion + cloud AI are forward-dep stubs; no integration table.

### Boundary — what this unit is NOT (doc-cited)
NOT the goal/metric owner (composes Core, HN-4) · NOT a session (a meal is logged, HN-2) · NOT an external food/AI service
(extension-model, forward-dep) · NOT an economy feeder-owner (provider seam) · NOT the tag-table owner (SP1 consumer).

## §2. Business Rules (inherited invariants the DDL honors)
- **NT [E] set** (ZK-1): `[E]` per structure-data — ingredient `name`/`serving_size`/`micronutrients`, dish `name`/
  `main_ingredients`, plan `name`, meal `cost`/`photo_blob`/`notes`, shopping `name`/`estimated_cost`. (M1.0 = empty `[E]`
  set, pass-through — BR-DB6-3; `@encrypted` JSDoc. Encrypted **money** = `money()` INTEGER cents + `@encrypted`, the
  finance.ts:58-63 precedent.)
- **HN-1** — compositional macros: ingredient (atomic) → dish (Σ) → meal (Σ); calories = P×4+C×4+F×9 (compute upward; a
  dish's stored macros are a cache, never source truth).
- **HN-3** — the intake target is DERIVED + dynamic (from Core Goals + daily burn); the stored `calorie_target` is a cache.
- **HN-6** — authoring triad with `source` provenance (`manual|ai|import`); AI = ADR-015 model call, `source=ai` (AI6).
- **HN-9** — photo logging = an ADR-015 model call (X11 split), `source=ai`, fail→manual; `photo_blob` [E].
- **HN-12/HN-13** — `functional_area` (8-system) + `whole_food_type` = editable STARTERS, `entity_tags`-taggable, **never
  hard-coded as truth** (C5).
- **HN-2** — a meal is scheduled/logged (`scheduled_at` + `status` + `dueIn()`), never a Session.

### Enum CHECK sets

**REUSE — existing `@vida/types` tuple (no new tuple; parity row added):**

| Column | Reused tuple (home) | Members |
|---|---|---|
| `nutritional_plans.review_frequency` | `FREQUENCY` (`common.ts:44`) | daily·weekly·biweekly·monthly·quarterly·yearly (nullable) |

**NET-NEW FIXED — closed sets (author tuple + Zod + SQL CHECK) in `nutrition.ts`:**

| Tuple | Members | Source |
|---|---|---|
| `MEAL_SOURCE` | manual·ai·import | structure-data L27 (the AI6 provenance triad; `ai` per rerun N3 — standardize on `ai`, not `llm`) |
| `MEAL_GENERATION_METHOD` | manual·ai·template·goal-optimized·hybrid | structure-data L24 |

**OPEN vocab — modality / editable-starter / not-inline-enumerated → plain TEXT (or JSON), NO CHECK, NO tuple**
([[open-vocab-columns-take-no-sql-check]]; conventions L17 "Modality = enum/tag"; C5 editable starters):

| Column(s) | Why OPEN | Source |
|---|---|---|
| `nutrition_ingredients.whole_food_type` | **editable starter, pending research (C5/HN-13) — never hard-code as truth** | L10-11 |
| `{ingredients,dishes}.functional_area` | editable-starter 8-system, **JSON** (C5/HN-12) | L12,15 |
| `nutritional_plans.{caloric_strategy,dietary_framework,philosophy}` | modality (conventions L17), not inline-enumerated in the floor entity-def | L19 |
| `{ingredients.category, dishes.dish_category, dishes.source_type}` | not enumerated / "…" | L10,14,17 |
| `meals.meal_type`, `daily_meal_plans.plan_type` | not enumerated | L23,26 |
| `{plans,dailyplans,meals,shopping}.status` / `shopping.purchase_status` | bare "status P" in the floor entity-def (terminal-states prose is UI-state, ambiguous "skipped/substituted") → OPEN, no invented closed set | L22-33; business-rules L62-64 |
| `shopping_items.{item_category,item_type,source}` | procurement source (Grocery/…), NOT the provenance triad; not enumerated | L31 |
| `nutritional_plans.adherence_target`, `shopping.unit` | free band/unit text | L20,32 |

## §3. Intended shape — 6 tables (all net-new ADR-002 additions; all `[INTENT]`, no As-is floor)

**Conventions applied to all 6:** UUIDv7 TEXT PK · Unix-ms timestamps · `YYYY-MM-DD` dates · JSON-as-TEXT · money =
INTEGER cents · `_sync_*` on every table · **no cross-table FK** (plain TEXT ids — ADR-016 §3.4; the floor "FK" notation is
superseded) · enums = SQL CHECK (FIXED) or plain TEXT (OPEN) · `[E]` via `@encrypted` JSDoc (M1.0 pass-through) · **no inline
`tags`** (SP1 → `entity_tags`).

**`deleted_at` split — the documented floor → `nutritional_plans` ONLY:** `baseColumns` excludes `deleted_at`; the floor
marks it on **`nutritional_plans`** alone (structure-data L22 "timestamps · `deleted_at`") — the soft-deletable strategy
entity. The other 5 omit it: libraries (ingredients/dishes) are reference data; daily_plans/meals/shopping are
instances/logs (append + status lifecycle). Header L7 lists soft-delete as the deletion *mechanism*, not a per-table
mandate. Follow the floor per-table; no blanket application (the #17 ruling). `[FACT: structure-data L22]`

**Table shapes** (P=plaintext · E=`[E]` · all ids no-FK plain TEXT · REAL=numeric):
- **§3a `nutrition_ingredients`** `[INTENT L10-13]` — `baseColumns`; `name`E · `category`(OPEN) · `whole_food_type`(OPEN,
  C5) · `functional_area`(JSON, C5) · `serving_size`E · `calories`·`protein`·`carbs`·`fat`·`fiber`(REAL) · `micronutrients`E ·
  `allergens`(JSON). No `deleted_at`.
- **§3b `nutrition_dishes`** `[INTENT L14-18]` — `baseColumns`; `name`E · `dish_category`(OPEN) · `calories`·`protein`·
  `carbs`·`fat`(REAL, per-serving) · `main_ingredients`E · `ingredient_refs`(JSON) · `functional_area`(JSON, C5) ·
  `recipe_page_id`(P, null) · `cooking_skill_id`(P, null — opt-in C6) · `source_type`(OPEN) · `performance_benefits`(JSON) ·
  `prep_time`(INTEGER, min) · `allergens`(JSON) · `rating`(INTEGER 1–5, null — per F1). No `deleted_at`.
- **§3c `nutritional_plans`** `[INTENT L19-22]` — `baseColumns` **+ `deleted_at`**; `name`E · `caloric_strategy`(OPEN) ·
  `dietary_framework`(OPEN) · `philosophy`(OPEN) · `daily_calorie_target`(INTEGER, null) · `supplement_protocol`(JSON) ·
  `adherence_target`(OPEN, null) · `ai_meal_generation`(boolInt, dflt 0) · `review_frequency`(FIXED `FREQUENCY`, null) ·
  `start_date`·`end_date`(calendarDate, null) · `status`(OPEN) · `goal_id`(P, null → Core `health_goal`).
- **§3d `daily_meal_plans`** `[INTENT L23-25]` — `baseColumns`; `plan_id`(P, notNull → parent plan) · `plan_date`(calendarDate) ·
  `plan_type`(OPEN) · `generation_method`(FIXED `MEAL_GENERATION_METHOD`) · `calorie_target`(INTEGER, null) ·
  `included_meal_types`(JSON) · `completion_rate`(REAL, null). idx on `plan_id`. No `deleted_at`.
- **§3e `meals`** `[INTENT L26-30]` — `baseColumns`; `daily_plan_id`(P, null) · `meal_type`(OPEN) · `purpose`(JSON) ·
  `dish_refs`(JSON) · `scheduled_at`(timestampMs, null) · `source`(FIXED `MEAL_SOURCE`, dflt 'manual') · `status`(OPEN) ·
  `target_calories`(INTEGER, null) · `cost`(money E, null) · `satisfaction`(INTEGER, null) · `photo_blob`(blob buffer E, null) ·
  `notes`E. **No inline `tags`** (→ `entity_tags`). idx on `daily_plan_id`, `scheduled_at`. No `deleted_at`.
- **§3f `shopping_items`** `[INTENT L31-33]` — `baseColumns`; `name`E · `item_category`(OPEN) · `item_type`(OPEN) ·
  `source`(OPEN — procurement, NOT provenance) · `quantity`(REAL, null) · `unit`(OPEN, null) · `estimated_cost`(money E, null) ·
  `purchase_status`(OPEN) · `storage`(JSON) · `needed_by`(calendarDate, null) · `meal_ref`(P, null). No `deleted_at`.

### §3g. `ENTITY_TYPES` registry — append 6 (SP1/SP2 open registry)
`nutrition_ingredient` · `nutrition_dish` · `nutritional_plan` · `daily_meal_plan` · `meal` · `shopping_item`
(structure-data §ADR-002 additions L43-45). Health is a tag CONSUMER (no `entity_tags` ownership).

### §3h. `packages/types/src/nutrition.ts` — NET-NEW
- 2 FIXED tuples (`MEAL_SOURCE`, `MEAL_GENERATION_METHOD`) `as const` + unions + 2 `z.enum` (in `validators/nutrition.ts`).
- REUSE (import, don't redefine): `FREQUENCY` (common.ts).
- Barrel: export from `packages/types/src/index.ts` + `validators/index.ts`. (Nutrition domain enum home.)

## §4. Physical home & authoring model
- **Schema:** `packages/core/src/db/schema/health-nutrition.ts` (register in `schema/index.ts` barrel).
- **Migration:** `packages/core/src/db/migrations/028_health_nutrition.ts` (`version: 28`, `name: 'health_nutrition'`,
  hand-written SQL, mirrors the schema). Register in `runner.ts` `ALL_MIGRATIONS` → `LATEST_VERSION` 27→28.
- **Types:** `packages/types/src/nutrition.ts` (net-new) + barrel + `ENTITY_TYPES` append in `_registry.ts`.
- **Validators:** the 2 `z.enum` in `validators/nutrition.ts` (mirroring `validators/health.ts`).
- **Tests:** `health-nutrition-introspection.test.ts` (DDL introspection ×4 dims + the `deleted_at`-floor guard) + enum-parity
  rows for the 3 FIXED columns (2 net-new + 1 reused). Author model mirrors group #17.

## §5. Phase-1 completion checklist + shape resolutions
- [x] All 5 aspect docs + rerun + intake WHOLE read · [x] no `nutrition_*` on disk (net-new) · [x] boundaries = Core #17
  (authored) · [x] FIXED/OPEN split cited to floor lines · [x] `deleted_at` = `nutritional_plans` only (floor L22) ·
  [x] C1–C8 guards named · [x] money[E] typing (finance precedent).

### Shape resolutions — doc-determined (candidate ZERO decisions; the gate confirms)
1. **`deleted_at` on `nutritional_plans` ONLY** `[FACT: structure-data L22, the floor]` — the #17 ruling (the roster is the
   authoritative per-table floor; no blanket override).
2. **Inline `meals.tags` NOT authored** → `entity_tags` (SP1 forward-reframe; no R6, no live floor) `[FACT: rerun G-SP1; F1]`.
3. **3 FIXED CHECK columns** (`meals.source`, `daily_meal_plans.generation_method` net-new + `nutritional_plans.review_frequency`
   reuse FREQUENCY); **everything else OPEN** `[FACT: floor inline-enumeration + conventions L17 modality + C5 editable-starter]`.
   ⚠ The OPEN-heavy split is the notable call — grounded in (a) the floor entity-defs' bare "status P"/modality notation,
   (b) conventions L17 "Modality = enum/tag", (c) C5 "never hard-code the taxonomy". The gate stress-tests whether any status
   column should be FIXED from the terminal-states prose (I argue no — UI-state ≠ stored-enum contract, and "skipped/substituted"
   is ambiguous). Not a Victor-decision — a floor-notation reading the gate verifies.
4. **No-FK / `[E]` M1.0 pass-through / money=INTEGER cents+@encrypted / `_sync_*` on all / no measurement-economy-session-AI4**
   `[FACT: platform conventions + rerun C1–C4]`.

### DB-11 carry-forward (cited, not fixed here)
+= 6 Nutrition row interfaces + 2 net-new enums; the macro-rollup service + intake-target deriver + X*/AI* wiring are
service-phase (M1.1+), not DB-4.

## §6. Preflight — folds resolved (SQL types + NOT-NULL/DEFAULT + indexes; convention-grounded)
- **F1 · numeric `REAL`** (`real()`): ingredient macros (`calories`/`protein`/`carbs`/`fat`/`fiber`) · dish macros
  (`calories`/`protein`/`carbs`/`fat`) · `daily_meal_plans.completion_rate` · `shopping_items.quantity` (precedent
  `habit_completions.value` REAL). **`INTEGER`** (`integer()`): `{daily_calorie_target,calorie_target,target_calories}`
  (kcal) · `prep_time` (min) · `dishes.rating` (1–5) · `meals.satisfaction` (1–10) · all baseColumns + `nutritional_plans.deleted_at`.
- **F2 · money `[E]`** → `money()` INTEGER cents + `/** @encrypted [E] — in cents */` (finance.ts:58-63): `meals.cost` ·
  `shopping_items.estimated_cost` (both nullable). **boolean** → `boolInt()`: `nutritional_plans.ai_meal_generation` (dflt 0).
- **F3 · dates vs timestamps:** `*_date`/`needed_by` (`plan_date`/`start_date`/`end_date`/`needed_by`) → `calendarDate`
  (TEXT `YYYY-MM-DD`); `meals.scheduled_at` → `timestampMs` (INTEGER Unix ms — a meal has a wall-clock time).
- **F4 · `[E]` text → `text()` + `@encrypted`** (M1.0 pass-through): ingredient `name`/`serving_size`/`micronutrients` ·
  dish `name`/`main_ingredients` · plan `name` · meal `notes` · shopping `name`. **`meals.photo_blob` = `blob('photo_blob',
  {mode:'buffer'})` [E]** (add `blob` to the drizzle-core import — the health-core.ts:90 / note_attachments precedent, NIT-2).
- **F5 · JSON → `json<T>()`** (TEXT): `functional_area` (×2) · `allergens` (×2) · `micronutrients` [E-text] ·
  `ingredient_refs` · `performance_benefits` · `supplement_protocol` · `included_meal_types` · `meals.purpose` ·
  `dish_refs` · `shopping.storage`.
- **F6 · indexes** (query-driven): `idx_daily_meal_plans_plan`(plan_id) · `idx_meals_daily_plan`(daily_plan_id) ·
  `idx_meals_scheduled`(scheduled_at) · `idx_nutritional_plans_status ON nutritional_plans(status) WHERE deleted_at IS NULL`
  (partial — the `status`/soft-delete precedent, `idx_health_goals_status`). All SQL-migration-only.
- **F7 · CHECK ↔ tuple parity:** SQL CHECK on the **3 FIXED** columns (`meals.source`, `daily_meal_plans.generation_method`,
  `nutritional_plans.review_frequency`); OPEN columns take NO CHECK. Parity test asserts CHECK-set ≡ tuple for all 3.
- **F8 · NOT NULL / DEFAULT posture:**
  - **notNull:** the primary `name` [E] (ingredients/dishes/plans/shopping) · `daily_meal_plans.plan_id` (within-module
    required parent — the `health_factors.domain_id` precedent) · FIXED-with-natural-default (below).
  - **notNull + default:** `meals.source` DEFAULT 'manual' · `daily_meal_plans.generation_method` DEFAULT 'manual' ·
    `nutritional_plans.ai_meal_generation` DEFAULT 0.
  - **NULLABLE, no default:** `nutritional_plans.goal_id` (cross-module Core ref — a plan may be generic/predate its goal;
    the #17 `purpose_id`/`role_id` cross-module-nullable precedent) · `meals.daily_plan_id` (floor L26 explicit nullable) ·
    all **OPEN status/modality columns** (`status`/`caloric_strategy`/etc. — no enum-backed default to manufacture; app
    sets the initial state) · all optional numerics/dates/refs · `review_frequency` (FIXED, nullable).
- **F9 · no cross-table FK** — every `*_id`/`*_ref`/`*_refs` (`goal_id`/`plan_id`/`daily_plan_id`/`recipe_page_id`/
  `cooking_skill_id`/`meal_ref`/`ingredient_refs`/`dish_refs`) is plain `text()`/`json()`, no `references()` (ADR-016 §3.4).
