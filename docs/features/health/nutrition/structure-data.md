<!-- Structure & Data — features/health/nutrition · Phase 2.
     ⚠ NO v2 schema — all NEW → ADR-002 additions. P=plaintext · E=[E] encrypted · money=cents INTEGER. -->

# Structure & Data — Health: Nutrition

All new (recovered domain) → **ADR-002 additions**. Platform baselines apply (UUIDv7 · Unix-ms · dates
`YYYY-MM-DD` · **money = cents INTEGER** · `_sync_*` · soft-delete · no inline notes).

## Entities (Nutrition-owned)

- **`nutrition_ingredients`** — atomic foods. `id` · `name` **E** · `category` P · **`whole_food_type` P** (leafy-
  greens/cruciferous/roots/bioactive-fruits/nuts-seeds/legumes/whole-grains/animal-proteins/spices/functional-
  beverages) · **`functional_area` P** (JSON → the 8-system "area of action", editable starter) · `serving_size` **E**
  · macros `calories`·`protein`·`carbs`·`fat`·`fiber` P · `micronutrients` **E** · `allergens` P (JSON) · timestamps.
- **`nutrition_dishes`** — composed dishes. `id` · `name` **E** · `dish_category` P · macros/serving P ·
  `main_ingredients` **E** · `ingredient_refs` P (JSON → ingredients) · **`functional_area` P** (JSON) · `recipe_page_id`
  P (nullable → a `pages` recipe; no inline recipe) · **`cooking_skill_id` P** (nullable → Skills/Knowledge; set only
  when cooking-tracking is opted-in, HN-14) · `source_type` P (homemade/restaurant/meal-prep/…) · `performance_benefits`
  P (JSON) · `prep_time` P · `allergens` P · `rating` P · timestamps.
- **`nutritional_plans`** — strategy. `id` · `name` **E** · `caloric_strategy` P · `dietary_framework` P ·
  `philosophy` P · `daily_calorie_target` P · `supplement_protocol` P (JSON) · `adherence_target` P ·
  `ai_meal_generation` P (0/1 — when the plan is AI-built, the row carries `source=ai`, AI6) · `review_frequency` P ·
  `start_date`·`end_date` P · `status` P · `goal_id` FK (→ Core Health Goal, body-composition) · timestamps · `deleted_at`.
- **`daily_meal_plans`** — per-day. `id` · `plan_id` FK · `plan_date` P · `plan_type` P · `generation_method` P
  (manual/ai/template/goal-optimized/hybrid — an `ai`/`hybrid` plan carries `source=ai`, AI6) · `calorie_target` P ·
  `included_meal_types` P (JSON) · `completion_rate` P · timestamps.
- **`meals`** — logged meal instances. `id` · `daily_plan_id` FK (nullable) · `meal_type` P · `purpose` P (JSON) ·
  `dish_refs` P (JSON) · `scheduled_at` P · `source` P (`manual|ai|import` provenance triad, AI6 — a photo-logged meal =
  `ai`) · `status` P · `target_calories` P · `cost` P (cents, **E**) · `satisfaction` P · `photo_blob` **E** (nullable —
  the photo→macros inference is an ADR-015 model call, X11) · `notes` **E** · timestamps. **Tags ride `entity_tags`**
  (SP1) — **not** an inline `tags` column. `[INTENT: ADR-006 SP1; ADR-014 X11; ADR-015 AI6]`
- **`shopping_items`** — procurement. `id` · `name` **E** · `item_category` P · `item_type` P · `source` P ·
  `quantity`·`unit` P · `estimated_cost` P (cents, **E**) · `purchase_status` P · `storage` P (JSON) ·
  `needed_by` P · `meal_ref` P (nullable) · timestamps.

## Composed / emitted (NOT Nutrition tables)

- Nutrition Goal phases → **Core `health_goals`** (type=body-composition). `[INTENT HN-4]`
- Meal-timing/portion Experiments + food Responses → **Core Adaptation** (`health_experiments`/`health_responses`,
  pillar=nutrition). `[INTENT HN-5]`
- Calories consumed → the **Core energy loop**; weight/body-comp for recompute → **Core `health_metrics`**. `[INTENT HC-6]`
- Cost → **Finance**. Notes → **Notes&Pages**; **tags → `entity_tags`** (SP1, Spaces-owned — the one tag mechanism). `[INTENT: ADR-006 SP1]`

## ADR-002 additions

Tables above + `entity_type` extensions: `nutrition_ingredient` · `nutrition_dish` · `nutritional_plan` ·
`daily_meal_plan` · `meal` · `shopping_item` — these **register** as taggable types in the SP2 **open** `entity_type`
registry (no `CHECK` enum). The tables are subject to **ADR-014** (X1/X2/X3/X5/X11 food-DB + photo ingestion), **ADR-015**
(AI1/AI3/AI5/AI6 generation/photo provenance), and **ADR-006** (SP1 tags via `entity_tags`). Consolidate into the standing
ADR-002 amendment. `[INTENT HL10; ADR-006 SP1/SP2; ADR-014; ADR-015]`

## Completion checklist

- [x] entities + P/E · [x] composed-vs-owned · [x] ADR-002 additions · [x] no `{{…}}`
