// ============================================================================
// Domain tables: Health — Nutrition  (DB-4 · group #18 · ADR-002 additions)
//
// The fuel pillar (recovered domain, NO v2 schema → all net-new). 6 owned tables:
// nutrition_ingredients · nutrition_dishes · nutritional_plans · daily_meal_plans ·
// meals · shopping_items. Composes the Core spine (#17): Nutrition Goals → Core
// health_goals; Experiments/Responses → Core Adaptation; cost → Finance; tags → Spaces.
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in migrations/028_health_nutrition.ts.
// These Drizzle objects are the query mirror.
//
// Shape (spec docs/specs/foundation/db-4-health-nutrition/_index.md):
// - Enums: REUSE FREQUENCY (common.ts, nutritional_plans.review_frequency) + 2 net-new
//   FIXED tuples (MEAL_SOURCE, MEAL_GENERATION_METHOD → nutrition.ts). Everything else OPEN
//   (modality per conventions L17 · editable-starter functional_area/whole_food_type per C5 ·
//   bare "status P" in the floor) = plain TEXT/JSON, NO CHECK ([[open-vocab-columns-take-no-sql-check]]).
// - deleted_at on `nutritional_plans` ONLY (the documented floor, structure-data.md:22).
// - NO inline `tags` — tags ride entity_tags (SP1); the 6 entity_types register in _registry.ts.
// - money [E] = money() INTEGER cents + @encrypted (finance precedent); photo_blob = blob(buffer) [E].
// - NO cross-table FK (plain TEXT ids, ADR-016 §3.4). source incl. `ai` (AI6).
//
// C-guards (rerun): no measurement_kind/binding_mode — composes Core health_goals (C1); no economy
// (C2); a meal is a logged entity, NOT a session (C3, scheduled_at + status + dueIn()); no AI4 agent
// envelope (C4); functional/whole-food taxonomy = editable starter, never hard-coded (C5);
// cooking_skill_id opt-in nullable (C6). X*/AI* wiring = cite-not-author (only provenance columns).
//
// M1.0 encryption (BR-DB6-3): [E] fields are the M3 target — EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, real, blob, index } from 'drizzle-orm/sqlite-core'
import { FREQUENCY, MEAL_SOURCE, MEAL_GENERATION_METHOD } from '@vida/types'
import { baseColumns, enumText, json, calendarDate, timestampMs, money, boolInt } from './_shared'

// --- nutrition_ingredients: atomic foods ------------------------------------
export const nutritionIngredients = sqliteTable('nutrition_ingredients', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  category: text('category'), // OPEN no-CHECK
  whole_food_type: text('whole_food_type'), // OPEN no-CHECK — editable starter (C5), never hard-coded
  functional_area: json<string[]>('functional_area'), // JSON — editable-starter 8-system (C5)
  /** @encrypted [E] */
  serving_size: text('serving_size'),
  calories: real('calories'),
  protein: real('protein'),
  carbs: real('carbs'),
  fat: real('fat'),
  fiber: real('fiber'),
  /** @encrypted [E] — JSON micronutrients */
  micronutrients: text('micronutrients'),
  allergens: json<string[]>('allergens'),
  // NO deleted_at (floor L13)
})

// --- nutrition_dishes: composed dishes --------------------------------------
export const nutritionDishes = sqliteTable('nutrition_dishes', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  dish_category: text('dish_category'), // OPEN no-CHECK
  calories: real('calories'), // per-serving
  protein: real('protein'),
  carbs: real('carbs'),
  fat: real('fat'),
  /** @encrypted [E] */
  main_ingredients: text('main_ingredients'),
  ingredient_refs: json<string[]>('ingredient_refs'), // no-FK JSON → ingredients
  functional_area: json<string[]>('functional_area'), // JSON (C5)
  recipe_page_id: text('recipe_page_id'), // no-FK; nullable → a pages recipe
  cooking_skill_id: text('cooking_skill_id'), // no-FK; nullable → Skills (opt-in, C6)
  source_type: text('source_type'), // OPEN no-CHECK
  performance_benefits: json<string[]>('performance_benefits'), // JSON
  prep_time: integer('prep_time'), // minutes
  allergens: json<string[]>('allergens'),
  rating: integer('rating'), // 1-5
  // NO deleted_at (floor L18)
})

// --- nutritional_plans: strategy — the ONLY soft-deleted table (floor L22) --
export const nutritionalPlans = sqliteTable(
  'nutritional_plans',
  {
    ...baseColumns,
    /** @encrypted [E] */
    name: text('name').notNull(),
    caloric_strategy: text('caloric_strategy'), // OPEN no-CHECK (modality)
    dietary_framework: text('dietary_framework'), // OPEN no-CHECK (modality)
    philosophy: text('philosophy'), // OPEN no-CHECK (modality)
    daily_calorie_target: integer('daily_calorie_target'), // kcal; nullable
    supplement_protocol: json<unknown>('supplement_protocol'), // JSON
    adherence_target: text('adherence_target'), // OPEN band text; nullable
    ai_meal_generation: boolInt('ai_meal_generation').notNull().default(false), // 0/1
    review_frequency: enumText('review_frequency', FREQUENCY), // FIXED → CHECK; nullable
    start_date: calendarDate('start_date'),
    end_date: calendarDate('end_date'),
    status: text('status'), // OPEN no-CHECK (bare "status P" floor)
    goal_id: text('goal_id'), // no-FK; nullable → Core health_goal (cross-module, C1)
    deleted_at: integer('deleted_at'), // the documented floor — nutritional_plans ONLY
  },
  (t) => [index('idx_nutritional_plans_status').on(t.status)], // partial WHERE deleted_at IS NULL in migration
)

// --- daily_meal_plans: per-day ----------------------------------------------
export const dailyMealPlans = sqliteTable(
  'daily_meal_plans',
  {
    ...baseColumns,
    plan_id: text('plan_id').notNull(), // no-FK; within-module required parent
    plan_date: calendarDate('plan_date'),
    plan_type: text('plan_type'), // OPEN no-CHECK
    generation_method: enumText('generation_method', MEAL_GENERATION_METHOD)
      .notNull()
      .default('manual'), // FIXED → CHECK
    calorie_target: integer('calorie_target'), // kcal; nullable
    included_meal_types: json<string[]>('included_meal_types'), // JSON
    completion_rate: real('completion_rate'), // nullable
    // NO deleted_at (floor L25)
  },
  (t) => [index('idx_daily_meal_plans_plan').on(t.plan_id)],
)

// --- meals: logged meal instances (NOT a session, C3) -----------------------
export const meals = sqliteTable(
  'meals',
  {
    ...baseColumns,
    daily_plan_id: text('daily_plan_id'), // no-FK; nullable (floor L26)
    meal_type: text('meal_type'), // OPEN no-CHECK
    purpose: json<string[]>('purpose'), // JSON
    dish_refs: json<string[]>('dish_refs'), // no-FK JSON → dishes
    scheduled_at: timestampMs('scheduled_at'), // Unix ms; nullable
    source: enumText('source', MEAL_SOURCE).notNull().default('manual'), // FIXED → CHECK (AI6 triad)
    status: text('status'), // OPEN no-CHECK
    target_calories: integer('target_calories'), // kcal; nullable
    /** @encrypted [E] — in cents */
    cost: money('cost'), // nullable
    satisfaction: integer('satisfaction'), // 1-10; nullable
    /** @encrypted [E] */
    photo_blob: blob('photo_blob', { mode: 'buffer' }), // nullable inline encrypted binary (photo→macros = ADR-015 X11)
    /** @encrypted [E] */
    notes: text('notes'),
    // NO inline tags (→ entity_tags, SP1). NO deleted_at (floor L29)
  },
  (t) => [
    index('idx_meals_daily_plan').on(t.daily_plan_id),
    index('idx_meals_scheduled').on(t.scheduled_at),
  ],
)

// --- shopping_items: procurement --------------------------------------------
export const shoppingItems = sqliteTable('shopping_items', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  item_category: text('item_category'), // OPEN no-CHECK
  item_type: text('item_type'), // OPEN no-CHECK
  source: text('source'), // OPEN no-CHECK — procurement source (Grocery/…), NOT the provenance triad
  quantity: real('quantity'), // nullable
  unit: text('unit'), // OPEN; nullable
  /** @encrypted [E] — in cents */
  estimated_cost: money('estimated_cost'), // nullable
  purchase_status: text('purchase_status'), // OPEN no-CHECK
  storage: json<unknown>('storage'), // JSON
  needed_by: calendarDate('needed_by'),
  meal_ref: text('meal_ref'), // no-FK; nullable
  // NO deleted_at (floor L33)
})
